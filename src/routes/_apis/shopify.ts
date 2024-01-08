import { Handler, Hono, Input } from "hono";
import { getClient } from "../../libs/db";
import { Bindings } from "../../../bindings";
import { getShopifyClient } from "../../libs/shopify";
import { Notifier } from "../../libs/slack";
import { ShopifyOrder, ShopifyProduct } from "../../types/shopify";
import { createFactory } from "hono/factory";

type Variables = { label: string; notifier: Notifier };

type Env = { Bindings: Bindings; Variables: Variables };

const app = new Hono<Env>();

const factory = createFactory<Env>();

const errorBoundary = (handler: Handler<Env, string, Input, any>) => {
  return factory.createHandlers(async (c, next) => {
    c.set("label", `${c.req.method}: ${c.req.url}`);
    const notifier = new Notifier(c.env);
    c.set("notifier", notifier);

    let res: null | Response = null;
    try {
      res = await handler(c, next);
    } catch (e) {
      notifier.appendErrorMessage(e);
    }

    c.executionCtx.waitUntil(notifier.notify(c.get("label")));

    return res ?? c.text("webhook received");
  });
};

app.post(
  "/product",
  ...errorBoundary(async (c) => {
    const {
      getProduct,
      insertProduct,
      getVariants,
      insertVariantMany,
      deleteVariantMany,
      deleteVariantManyByProductId,
      updateVariant,
    } = getClient(c.env);

    const data = await c.req.json<ShopifyProduct>();
    c.set("label", `Webhook: ${data.id}, ${data.handle}, ${data.status}`);
    console.log(c.get("label"));

    const product = await getProduct(String(data.id));
    let productRecordId: number | undefined = product?.id;

    // activeかつ、CMS上にまだ商品がないなら商品を追加
    if (!product && data.status === "active") {
      console.log("insert new product", data.id, data.title);
      const [newProduct] = await insertProduct({
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
      const variants = await getVariants(productRecordId);
      const cmsVariantMap = new Map(
        variants.map((v) => [v.variantId, v] as const),
      );

      // FIXME: Object.groupByが来たらリファクタ
      const shouldInsertVariantIds = shopifyVariantIds.filter(
        (id) => !cmsVariantMap.has(id),
      );
      const shouldDeleteVariantIds = [...cmsVariantMap.keys()].filter(
        (id) => !shopifyVariantIds.includes(id),
      );
      // ものによっては大量にvariantがあるので、タイトルが異なるものだけアップデートの対象とする
      const shouldUpdateVariantIds = shopifyVariantIds.filter(
        (id) =>
          cmsVariantMap.has(id) &&
          cmsVariantMap.get(id)?.variantName !== shopifyVariants[id],
      );

      if (shouldInsertVariantIds.length) {
        const insertData = shouldInsertVariantIds.map((variantId) => ({
          variantId,
          variantName: shopifyVariants[variantId]!,
        }));
        console.log("insert new variants", insertData);
        const insertedVariants = await insertVariantMany(
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
        const deletedVariants = await deleteVariantMany(shouldDeleteVariantIds);
        console.log("deleted variant", deletedVariants.rowCount, "record(s)");
      } else console.log("No deletable variants");

      if (shouldUpdateVariantIds.length) {
        const updateData = shouldUpdateVariantIds.map((variantId) => ({
          variantId,
          variantName: shopifyVariants[variantId]!,
        }));
        console.log("update variants", updateData);
        const updatedVariants = await Promise.all(
          updateData.map(async ({ variantId, variantName }) =>
            updateVariant(variantId, { variantName }),
          ),
        );
        console.log(`updated variant ${updatedVariants.length} record(s)`);
      } else console.log("No updatable variants");
    }

    // draft/archived ならCMS上から該当商品を探し、その商品が持つバリエーションをすべて削除する
    // バリエーション削除時に、SKU紐付け用の中間テーブルが残らないようにする
    if (data.status !== "active" && productRecordId) {
      console.log("delete variants by product record id", productRecordId);
      const deletedVariants =
        await deleteVariantManyByProductId(productRecordId);
      console.log("deleted variant", deletedVariants.rowCount, "record(s)");
    }

    return c.json({ message: "product synced" });
  }),
);

type LineItemCustomAttr = {
  id: number;
  name: string;
  _skus: string[];
};

app.post(
  "/order",
  ...errorBoundary(async (c) => {
    const { getVariant } = getClient(c.env);
    const { updateOrderNoteAttributes } = getShopifyClient(c.env);
    const notifier = c.get("notifier");

    const data = await c.req.json<ShopifyOrder>();
    c.set("label", `Webhook created order: ${data.id}`);
    console.log(c.get("label"));

    const liCustomAttributes = await Promise.all<LineItemCustomAttr>(
      data.line_items.map(async ({ id, name, properties, variant_id }) => {
        let _skus = properties.find((p) => p.name === "_skus")?.value;
        if (!_skus)
          try {
            const skusJson = (await getVariant(variant_id))?.skusJson;
            if (!skusJson) notifier.appendNotConnectedSkuOrder(data);
            else _skus = skusJson;
          } catch (e) {
            notifier.appendErrorMessage(e);
          }

        return { id, name, _skus: JSON.parse(_skus ?? "[]") };
      }),
    );

    // TODO: まだProductionにはdeployしていない
    // デプロイしたらShopify側のWebhookも直さないといけない
    // ある程度データ溜まったら、jobs側でこのデータを利用するようにする
    // => noteへのデータ書き込みは止めていいが、しばらくはnoteも同時に見るようにする
    const res = await updateOrderNoteAttributes(data, [
      {
        name: "__line_items",
        value: JSON.stringify(liCustomAttributes),
      },
    ]);
    await notifier.appendErrorResponse(res);

    return c.json({ message: "update order" });
  }),
);

export default app;