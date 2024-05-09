import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { ShopifyOrderForNoteAttrs } from "../../libs/models/shopify/ShopifyOrderForNoteAttrs";
import { SlackNotifier } from "../../libs/slack";
import { ShopifyProduct } from "../../types/shopify";
import { ShopifyOrderMailSender } from "../../libs/sendgrid";
import { DB } from "../../libs/db";

type Variables = { label: string; topic: string; notifier: SlackNotifier };

type Env = { Bindings: Bindings; Variables: Variables };

const app = new Hono<Env>();

app.use("*", async (c, next) => {
  c.set("topic", c.req.header("x-shopify-topic") ?? "unknown");
  const notifier = new SlackNotifier(c.env);
  c.set("notifier", notifier);

  await next();

  c.executionCtx.waitUntil(notifier.notify(c.get("label") ?? c.get("topic")));
});

app.onError(async (err, c) => {
  c.get("notifier").appendErrorMessage(err);

  return c.text("webhook received");
});

app.post("/product", async (c) => {
  const db = new DB(c.env);
  const data = await c.req.json<ShopifyProduct>();
  c.set("label", `${c.get("topic")}: ${data.id}, ${data.handle}, ${data.status}`);
  console.log(c.get("label"));

  const product = await db.getProduct(String(data.id));
  let productRecordId: number | undefined = product?.id;

  // activeかつ、CMS上にまだ商品がないなら商品を追加
  if (!product && data.status === "active") {
    console.log("insert new product", data.id, data.title);
    const newProduct = await db.insertProduct({
      productId: String(data.id),
      productName: data.title,
    });
    console.log("inserted new product record id:", newProduct?.id);
    productRecordId = newProduct?.id;
  }

  const shopifyVariants = Object.fromEntries(
    data.variants?.map(({ id, title }) => [String(id), title]) ?? [],
  );
  const shopifyVariantIds = Object.keys(shopifyVariants);

  // activeなら、CMS上から該当商品を探し、その商品が持つバリエーションの配列と交差差分をとって
  // CMS上に存在しないIDがあれば、そのバリエーションを作る
  // CMS上にしか存在しないIDがあるのであれば、そのバリエーションは削除する
  // CMS上・Shopify両方に存在していればバリエーションをアップデートする
  if (data.status === "active" && productRecordId) {
    const variants = await db.getVariants(productRecordId);
    const cmsVariantMap = new Map(variants.map((v) => [v.variantId, v] as const));

    // FIXME: Object.groupByが来たらリファクタ
    const shouldInsertVariantIds = shopifyVariantIds.filter((id) => !cmsVariantMap.has(id));
    const shouldDeleteVariantIds = [...cmsVariantMap.keys()].filter(
      (id) => !shopifyVariantIds.includes(id),
    );
    // ものによっては大量にvariantがあるので、タイトルが異なるものだけアップデートの対象とする
    const shouldUpdateVariantIds = shopifyVariantIds.filter(
      (id) => cmsVariantMap.has(id) && cmsVariantMap.get(id)?.variantName !== shopifyVariants[id],
    );

    if (shouldInsertVariantIds.length) {
      const insertData = shouldInsertVariantIds.map((variantId) => ({
        variantId,
        variantName: shopifyVariants[variantId]!,
      }));
      console.log("insert new variants", insertData);
      const insertedVariants = await db.insertVariantMany(
        insertData.map(({ variantId, variantName }) => ({
          variantId,
          variantName,
          product: productRecordId,
        })),
      );
      console.log("inserted new variant record ids:", insertedVariants);
    } else console.log("No insertable variants");

    if (shouldDeleteVariantIds.length) {
      console.log("delete variants", shouldDeleteVariantIds);
      const deletedVariants = await db.deleteVariantMany(shouldDeleteVariantIds);
      console.log("deleted variant", deletedVariants?.count, "record(s)");
    } else console.log("No deletable variants");

    if (shouldUpdateVariantIds.length) {
      const updateData = shouldUpdateVariantIds.map((variantId) => ({
        variantId,
        variantName: shopifyVariants[variantId]!,
      }));
      console.log("update variants", updateData);
      const updatedVariants = await Promise.all(
        updateData.map(async ({ variantId, variantName }) =>
          db.updateVariant(variantId, { variantName }),
        ),
      );
      console.log(`updated variant ${updatedVariants.length} record(s)`);
    } else console.log("No updatable variants");
  }

  // draft/archived ならCMS上から該当商品を探し、その商品が持つバリエーションをすべて削除する
  // バリエーション削除時に、SKU紐付け用の中間テーブルが残らないようにする
  if (data.status !== "active" && productRecordId) {
    console.log("delete variants by product record id", productRecordId);
    const deletedVariants = await db.deleteVariantManyByProductId(productRecordId);
    console.log("deleted variant", deletedVariants?.count, "record(s)");
  }

  return c.json({ message: "product synced" });
});

app.post("/order", async (c) => {
  const order = new ShopifyOrderForNoteAttrs(c.env);
  const notifier = c.get("notifier");
  const mailer = new ShopifyOrderMailSender(c.env, order);

  order.setOrder(await c.req.json<ShopifyOrderForNoteAttrs["order"]>());

  c.set("label", `${c.get("topic")}: ${order.numericId}`);
  console.log(c.get("label"));

  // line_items/note_attributes及びDBからSKU情報を補完
  await order.completeLineItemCustomAttrs();
  // note_attributes及びSKU情報から配送スケジュール情報を補完
  await order.completeDeliveryScheduleCustomAttrs();

  // 配送スケージュールのメールを送信
  if (order.shouldSendDeliveryScheduleNotification)
    await blockReRun(`notifyDeliverySchedule-${order.numericId}`, c.env.CACHE, () =>
      mailer.notifyDeliverySchedule(order.completedDeliveryScheduleCustomAttrs.estimate),
    );

  if (order.shouldUpdateNoteAttributes) {
    // SKU情報が不足している場合にSlack通知
    if (!order.isCompletedSku) notifier.appendNotConnectedSkuOrder(order, "notify-order");
    const res = await order.updateNoteAttributes().catch(notifier.appendErrorMessage);
    if (res) await notifier.appendErrorResponse(res);
  }

  return c.json({ message: "update order" });
});

/**
 * 60秒間同一キーのコールバックの実行を抑制する(メールが二重に送られないようにするとか)
 * KVの仕様上expirationTtlを60秒未満にできない
 */
const blockReRun = async (key: string, kv: KVNamespace, callback: () => Promise<unknown>) => {
  if (await kv.get(key)) return;
  await kv.put(key, "processing", { expirationTtl: 60 });
  await callback();
};

export default app;
