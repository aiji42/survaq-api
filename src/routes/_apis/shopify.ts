import { Hono } from "hono";
import { getClient } from "../../libs/db";
import { Bindings } from "../../../bindings";

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

const app = new Hono<{ Bindings: Bindings }>();

app.post("/product", async (c) => {
  const client = getClient(
    // Hyperdriveはデプロイしないと使えなくなったので、開発中はc.env.DATABASE_URLを利用する
    // c.env.HYPERDRIVE?.connectionString ??
    c.env.DATABASE_URL,
  );

  const {
    getProduct,
    insertProduct,
    getVariants,
    insertVariantMany,
    deleteVariantMany,
    deleteVariantManyByProductId,
    updateVariant,
  } = client;
  try {
    const data = await c.req.json<ShopifyProduct>();
    console.log(data);

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

      const cmsVariantIds = variants.map(({ variantId }) => variantId);

      // FIXME: Object.groupByが来たらリファクタ
      const shouldInsertVariantIds = shopifyVariantIds.filter(
        (id) => !cmsVariantIds.includes(id),
      );
      const shouldDeleteVariantIds = cmsVariantIds.filter(
        (id) => !shopifyVariantIds.includes(id),
      );
      const shouldUpdateVariantIds = shopifyVariantIds.filter((id) =>
        cmsVariantIds.includes(id),
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
      }

      if (shouldDeleteVariantIds.length) {
        console.log("delete variants", shouldDeleteVariantIds);
        const deletedVariants = await deleteVariantMany(shouldDeleteVariantIds);
        console.log("deleted variant", deletedVariants.rowCount, "record(s)");
      }

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
        console.log("updated variant record ids:", updatedVariants);
      }
    }

    // draft/archived ならCMS上から該当商品を探し、その商品が持つバリエーションをすべて削除する
    // バリエーション削除時に、SKU紐付け用の中間テーブルが残らないようにする
    if (data.status !== "active" && productRecordId) {
      console.log("delete variants by product record id", productRecordId);
      const deletedVariants =
        await deleteVariantManyByProductId(productRecordId);
      console.log("deleted variant", deletedVariants.rowCount, "record(s)");
    }

    return c.json({ message: "synced" });
  } catch (e) {
    console.error(e);
    if (e instanceof Error) return c.json({ message: e.message });
    return c.json({ message: JSON.stringify(e) });
  }
});

export default app;
