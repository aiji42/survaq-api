import { Hono } from "hono";
import { Client, getClient } from "../../libs/db";
import { Bindings } from "../../../bindings";
import { getShopifyClient } from "../../libs/shopify";

type Variables = {
  client: Client;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  const client = getClient(
    // Hyperdriveはデプロイしないと使えなくなったので、開発中はc.env.DATABASE_URLを利用する
    // c.env.HYPERDRIVE?.connectionString ??
    c.env.DATABASE_URL,
  );
  c.set("client", client);

  await next();

  // Hyperdrive を利用していなければ(dev環境) コネクションを切る
  // !c.env.HYPERDRIVE?.connectionString &&
  // c.executionCtx.waitUntil(client.cleanUp());
});

type ShopifyProduct = {
  id: number;
  body_html?: string;
  handle?: string;
  title: string;
  status: "active" | "draft" | "archived";
  variants?: Array<{
    id: number;
    title: string;
  }>;
};

app.post("/product", async (c) => {
  const {
    getProduct,
    insertProduct,
    getVariants,
    insertVariantMany,
    deleteVariantMany,
    deleteVariantManyByProductId,
    updateVariant,
  } = c.get("client");

  const data = await c.req.json<ShopifyProduct>();
  console.log("Webhook:", data.id, data.handle, data.title, data.status);

  c.executionCtx.waitUntil(
    (async () => {
      try {
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
            const deletedVariants = await deleteVariantMany(
              shouldDeleteVariantIds,
            );
            console.log(
              "deleted variant",
              deletedVariants.rowCount,
              "record(s)",
            );
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
      } catch (e) {
        console.error(e);
      }
    })(),
  );

  return c.json({ message: "synced" });
});

type ShopifyOrder = {
  id: number;
  note_attributes: Array<{ name: string; value: string }>;
  line_items: {
    id: number;
    variant_id: number;
    name: string;
    properties: Array<{ name: string; value: string }>;
  }[];
};

app.post("/order", async (c) => {
  const { getVariant } = c.get("client");
  const { updateOrderNoteAttributes } = getShopifyClient(
    c.env.SHOPIFY_ACCESS_TOKEN,
  );

  const data = await c.req.json<ShopifyOrder>();
  console.log("Webhook created order:", data.id);

  c.executionCtx.waitUntil(
    (async () => {
      try {
        const customAttributes = await Promise.all(
          data.line_items.map(async (li) => {
            const _skus =
              li.properties.find(({ name }) => name === "_skus")?.value ??
              (await getVariant(li.variant_id))?.skusJson ??
              "[]";
            return {
              lineItemId: li.id,
              name: li.name,
              _skus: JSON.parse(_skus),
            };
          }),
        );

        await updateOrderNoteAttributes(data.id, [
          ...data.note_attributes,
          {
            name: "__line_items_and_skus",
            value: JSON.stringify(customAttributes),
          },
        ]);

        console.log("updated note attributes");
      } catch (e) {
        console.error(e);
      }
    })(),
  );

  return c.json({ message: "synced" });
});

export default app;
