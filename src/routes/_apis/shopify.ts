import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import {
  getNewDeliveryScheduleCustomAttrs,
  getNewLineItemCustomAttrs,
  getPersistedListItemCustomAttrs,
  hasNoSkuLineItem,
  eqLineItemCustomAttrs,
  hasPersistedDeliveryScheduleCustomAttrs,
  makeUpdatableDeliveryScheduleNoteAttr,
  makeUpdatableLineItemNoteAttr,
  ShopifyOrder,
} from "../../libs/shopify";
import { Notifier } from "../../libs/slack";
import { ShopifyProduct } from "../../types/shopify";
import { ShopifyOrderMailSender } from "../../libs/sendgrid";
import { DB } from "../../libs/db";

type Variables = { label: string; topic: string; notifier: Notifier };

type Env = { Bindings: Bindings; Variables: Variables };

const app = new Hono<Env>();

app.use("*", async (c, next) => {
  c.set("topic", c.req.header("x-shopify-topic") ?? "unknown");
  const notifier = new Notifier(c.env);
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
  const db = new DB(c.env);
  const order = new ShopifyOrder(c.env);
  const notifier = c.get("notifier");
  const updatableNoteAttrs: ShopifyOrder["noteAttributes"] = [];

  order.setOrder(await c.req.json<ShopifyOrder["order"]>());

  c.set("label", `${c.get("topic")}: ${order.numericId}`);
  console.log(c.get("label"));

  const [newLiAttrs, errors] = await getNewLineItemCustomAttrs(order, db);
  errors.forEach((e) => notifier.appendErrorMessage(e));

  // 配送予定のデータをnote_attributesに追加 + メール送信
  if (
    !hasNoSkuLineItem(newLiAttrs) &&
    !hasPersistedDeliveryScheduleCustomAttrs(order) &&
    order.createdAt > LIMIT_DATE
  ) {
    try {
      const scheduleData = await getNewDeliveryScheduleCustomAttrs(newLiAttrs, db);

      if (scheduleData) {
        updatableNoteAttrs.push(makeUpdatableDeliveryScheduleNoteAttr(scheduleData));

        // メールでの通知
        await blockReRun(`notifyDeliverySchedule-${order.numericId}`, c.env.CACHE, () =>
          new ShopifyOrderMailSender(c.env, order).notifyDeliverySchedule(scheduleData.estimate),
        );
      }
    } catch (e) {
      notifier.appendErrorMessage(e);
    }
  }

  // LineItem x SKU のデータをnote_attributesに追加 (既存のnote_attributesの情報と差異があれば)
  if (!eqLineItemCustomAttrs(newLiAttrs, getPersistedListItemCustomAttrs(order))) {
    // SKU情報が無いLineItemがあればSlackに通知(古いデータに関しては通知しない)
    order.createdAt > new Date("2024-01-01T00:00:00") &&
      hasNoSkuLineItem(newLiAttrs) &&
      notifier.appendNotConnectedSkuOrder(order, "notify-order");

    updatableNoteAttrs.push(makeUpdatableLineItemNoteAttr(newLiAttrs));
  }

  if (updatableNoteAttrs.length) {
    try {
      console.log("try to update order's note_attributes");
      const res = await order.updateNoteAttributes(updatableNoteAttrs);
      await notifier.appendErrorResponse(res);
    } catch (e) {
      notifier.appendErrorMessage(e);
    }
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

// この日時以前の申し込みデータに対して配送予定のデータを作ったりメールを送ったり
const LIMIT_DATE = new Date("2024-01-21T07:48:00");

export default app;
