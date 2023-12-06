import { Hono } from "hono";
import { cors } from "hono/cors";
import { Bindings } from "../bindings";
import { earliest, makeSchedule, Schedule } from "../libs/makeSchedule";
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

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "/products/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "OPTIONS"],
    maxAge: 600,
  })
);

app.all("*", (c, next) => {
  setClient(c.env.PRISMA_DATA_PROXY_URL);
  return next();
});

app.get("products/:id/funding", async (c) => {
  const data = await getProduct(c.req.param("id"));
  if (!data) return c.notFound();

  return c.json({
    totalPrice:
      (data.ShopifyProductGroups?.totalPrice ?? 0) +
      (data.ShopifyProductGroups?.realTotalPrice ?? 0),
    supporters:
      (data.ShopifyProductGroups?.supporters ?? 0) +
      (data.ShopifyProductGroups?.realSupporters ?? 0),
    closeOn:
      data.ShopifyProductGroups?.closeOn.toISOString().slice(0, 10) ?? null,
  });
});

app.get("products/:id/delivery", async (c) => {
  const data = await getProduct(c.req.param("id"));
  if (!data) return c.notFound();

  const locale = c.req.headers.get("accept-language")?.startsWith("en")
    ? "en"
    : "ja";

  const variants = await makeVariants(data, locale);

  const earliestSchedule = makeSchedule(null);

  const skus = variants
    .flatMap(({ baseSKUs, selectableSKUs }) => [...baseSKUs, ...selectableSKUs])
    .reduce<
      Array<{
        id: number;
        code: string;
        name: string;
        schedule: Schedule<false>;
        sortNumber: number;
      }>
    >((acc, sku) => {
      if (
        acc.find(({ code }) => code === sku.code) ||
        !sku.schedule ||
        sku.schedule.numeric === earliestSchedule.numeric
      )
        return acc;
      return [
        ...acc,
        {
          id: sku.id,
          code: sku.code,
          name: sku.displayName || sku.name,
          schedule: sku.schedule,
          sortNumber: sku.sortNumber,
        },
      ];
    }, [])
    .sort((a, b) => a.sortNumber - b.sortNumber || a.id - b.id);

  return c.json({
    current: earliestSchedule,
    skus,
  });
});

app.get("/products/supabase", async (c) => {
  return c.json(await getAllProducts());
});

app.get("/products/:id/supabase", async (c) => {
  const data = await getProduct(c.req.param("id"));
  if (!data) return c.notFound();

  const locale = c.req.headers.get("accept-language")?.startsWith("en")
    ? "en"
    : "ja";

  const variants = await makeVariants(data, locale);

  const schedule = earliest(
    variants.map(({ defaultSchedule }) => defaultSchedule)
  );

  return c.json({
    variants,
    schedule: schedule ?? makeSchedule(schedule, locale),
  });
});

app.get("/products/page-data/:code/supabase", async (c) => {
  const locale = c.req.headers.get("accept-language")?.startsWith("en")
    ? "en"
    : "ja";

  const data = await getPage(c.req.param("code"));
  if (!data) return c.notFound();

  const {
    ShopifyProducts: product,
    faviconFile: favicon,
    logoFile: logo,
    ...page
  } = data;

  const variants = await makeVariants(product, locale);

  const schedule = earliest(
    variants.map(({ defaultSchedule }) => defaultSchedule)
  );

  return c.json({
    ...page,
    favicon,
    logo,
    variants,
    schedule: schedule ?? makeSchedule(schedule, locale),
    productId: product.productId,
  });
});

app.get("/products/page-data/by-domain/:domain/supabase", async (c) => {
  const data = await getPage(c.req.param("domain"));
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
      const newProduct = await insertProduct({
        productId: String(data.id),
        productName: data.title,
      });
      console.log("inserted new product record id:", newProduct.id);
      productRecordId = newProduct.id;
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
        console.log("deleted variant", deletedVariants.count, "record(s)");
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
      console.log("deleted variant", deletedVariants.count, "record(s)");
    }

    return c.json({ message: "synced" });
  } catch (e) {
    console.error(e);
    if (e instanceof Error) return c.json({ message: e.message });
    return c.json({ message: JSON.stringify(e) });
  }
});

export default app;
