import { Hono } from "hono";
import { cors } from "hono/cors";
import { Bindings } from "../bindings";
import { earliest, Locale, makeSchedule } from "../libs/makeSchedule";
import { makeVariants } from "../libs/makeVariants";
import {
  deleteVariantMany,
  deleteVariantManyByProductId,
  getAllProducts,
  getPage,
  getProduct,
  getVariants,
  insertProduct,
  insertVariantMany,
  setClient,
  updateVariant,
} from "./db";
import { makeSKUsForDelivery } from "../libs/makeSKUsForDelivery";
import { endTime, startTime, timing } from "hono/timing";

type Variables = {
  locale: Locale;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", cors({ origin: "*", maxAge: 600 }));
app.use("*", timing());

app.use("/:top{(products|shopify)}/*", async (c, next) => {
  const pool = setClient(
    // Hyperdriveはデプロイしないと使えなくなったので、開発中はc.env.DATABASE_URLを利用する
    c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL
  );

  const locale = c.req.headers.get("accept-language")?.startsWith("en")
    ? "en"
    : "ja";
  c.set("locale", locale);

  startTime(c, "main_process");
  await next();
  endTime(c, "main_process");

  // Hyperdrive を利用していなければ(dev環境) コネクションを切る
  !c.env.HYPERDRIVE?.connectionString && c.executionCtx.waitUntil(pool.end());
});

app.get("products/:id/funding", async (c) => {
  startTime(c, "db");
  const data = await getProduct(c.req.param("id"));
  endTime(c, "db");
  if (!data) return c.notFound();

  return c.json({
    totalPrice:
      (data.group?.totalPrice ?? 0) + (data.group?.realTotalPrice ?? 0),
    supporters:
      (data.group?.supporters ?? 0) + (data.group?.realSupporters ?? 0),
    closeOn: data.group?.closeOn ?? null,
  });
});

app.get("products/:id/delivery", async (c) => {
  startTime(c, "db");
  const data = await getProduct(c.req.param("id"));
  endTime(c, "db");
  if (!data) return c.notFound();

  const variants = await makeVariants(data, c.get("locale"), c);

  const current = makeSchedule(null);

  const skus = makeSKUsForDelivery(variants);

  return c.json({ current, skus });
});

app.get("/products/supabase", async (c) => {
  return c.json(await getAllProducts());
});

app.get("/products/:id/supabase", async (c) => {
  startTime(c, "db");
  const data = await getProduct(c.req.param("id"));
  endTime(c, "db");
  if (!data) return c.notFound();

  const variants = await makeVariants(data, c.get("locale"), c);

  const schedule = earliest(
    variants.map(({ defaultSchedule }) => defaultSchedule)
  );

  return c.json({
    variants,
    schedule: schedule ?? makeSchedule(schedule, c.get("locale")),
  });
});

app.get("/products/page-data/:code/supabase", async (c) => {
  startTime(c, "db");
  const data = await getPage(c.req.param("code"));
  endTime(c, "db");
  if (!data) return c.notFound();

  const { product, faviconFile: favicon, logoFile: logo, ...page } = data;

  const variants = await makeVariants(product, c.get("locale"), c);

  const schedule = earliest(
    variants.map(({ defaultSchedule }) => defaultSchedule)
  );

  return c.json({
    ...page,
    favicon,
    logo,
    variants,
    schedule: schedule ?? makeSchedule(schedule, c.get("locale")),
    productId: product.productId,
  });
});

app.get("/products/page-data/by-domain/:domain/supabase", async (c) => {
  startTime(c, "db");
  const data = await getPage(c.req.param("domain"));
  endTime(c, "db");
  if (!data) return c.notFound();

  return c.json({ pathname: data.pathname });
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

app.post("/shopify/product", async (c) => {
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
      data.variants?.map(({ id, title }) => [String(id), title]) ?? []
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
        (id) => !cmsVariantIds.includes(id)
      );
      const shouldDeleteVariantIds = cmsVariantIds.filter(
        (id) => !shopifyVariantIds.includes(id)
      );
      const shouldUpdateVariantIds = shopifyVariantIds.filter((id) =>
        cmsVariantIds.includes(id)
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
          }))
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
            updateVariant(variantId, { variantName })
          )
        );
        console.log("updated variant record ids:", updatedVariants);
      }
    }

    // draft/archived ならCMS上から該当商品を探し、その商品が持つバリエーションをすべて削除する
    // バリエーション削除時に、SKU紐付け用の中間テーブルが残らないようにする
    if (data.status !== "active" && productRecordId) {
      console.log("delete variants by product record id", productRecordId);
      const deletedVariants = await deleteVariantManyByProductId(
        productRecordId
      );
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
