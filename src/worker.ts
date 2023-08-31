import { Hono } from "hono";
import { cors } from "hono/cors";
import { Bindings } from "../bindings";
import { earliest, makeSchedule, Schedule } from "../libs/makeSchedule";
import { makeVariants, Variants } from "../libs/makeVariants";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.type";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "/products/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "OPTIONS"],
    maxAge: 600,
  })
);

app.get("products/:id/funding", async (c) => {
  const client = createClient<Database>(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

  const { data, error } = await client
    .from("ShopifyProducts")
    .select("ShopifyProductGroups(*)")
    .match({ productId: c.req.param("id") })
    .maybeSingle();

  if (error) return c.json(error, 500);
  if (!data) return c.notFound();
  if (Array.isArray(data.ShopifyProductGroups)) return c.json(error, 500);

  return c.json({
    totalPrice:
      (data.ShopifyProductGroups?.totalPrice ?? 0) +
      (data.ShopifyProductGroups?.realTotalPrice ?? 0),
    supporters:
      (data.ShopifyProductGroups?.supporters ?? 0) +
      (data.ShopifyProductGroups?.realSupporters ?? 0),
    closeOn: data.ShopifyProductGroups?.closeOn ?? null,
  });
});

app.get("products/:id/delivery", async (c) => {
  const client = createClient<Database>(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

  const { data, error } = await client
    .from("ShopifyProducts")
    .select(
      "*,ShopifyProductGroups(*),ShopifyVariants(*,ShopifyVariants_ShopifyCustomSKUs(ShopifyCustomSKUs(*)))"
    )
    .match({ productId: c.req.param("id") })
    .maybeSingle();

  if (error) return c.json(error, 500);
  if (!data) return c.notFound();
  if (!data.ShopifyProductGroups || Array.isArray(data.ShopifyProductGroups))
    return c.json(error, 500);

  const locale = c.req.headers.get("accept-language")?.startsWith("en")
    ? "en"
    : "ja";

  const variants = await makeVariants(
    data,
    (data.ShopifyVariants ?? []) as Variants,
    locale,
    client
  );

  const earliestSchedule = makeSchedule(null);

  // FIXME: baseSKUsとselectableSKUsを使うようにする
  const skus = variants
    .flatMap(({ skus }) => skus)
    .reduce<Array<{ code: string; name: string; schedule: Schedule<false> }>>(
      // FIXME: defaultScheduleを使うようにする
      (acc, sku) => {
        if (
          acc.find(({ code }) => code === sku.code) ||
          !sku.schedule ||
          sku.schedule.numeric === earliestSchedule.numeric
        )
          return acc;
        return [
          ...acc,
          {
            code: sku.code,
            name: sku.displayName || sku.name,
            schedule: sku.schedule,
          },
        ];
      },
      []
    );

  return c.json({
    current: earliestSchedule,
    skus,
  });
});

app.get("/products/supabase", async (c) => {
  const client = createClient<Database>(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

  const { data } = await client
    .from("ShopifyProducts")
    .select("productId,productName");

  return c.json(data);
});

app.get("/products/:id/supabase", async (c) => {
  const client = createClient<Database>(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

  const { data, error } = await client
    .from("ShopifyProducts")
    .select(
      "*,ShopifyProductGroups(*),ShopifyVariants(*,ShopifyVariants_ShopifyCustomSKUs(ShopifyCustomSKUs(*)))"
    )
    .match({ productId: c.req.param("id") })
    .maybeSingle();

  if (error) return c.json(error, 500);
  if (!data) return c.notFound();
  if (!data.ShopifyProductGroups || Array.isArray(data.ShopifyProductGroups))
    return c.json(error, 500);

  const locale = c.req.headers.get("accept-language")?.startsWith("en")
    ? "en"
    : "ja";

  const variants = await makeVariants(
    data,
    (data.ShopifyVariants ?? []) as Variants,
    locale,
    client
  );

  // FIXME: defaultScheduleを使うようにする
  const schedule = earliest(variants.map(({ schedule }) => schedule));

  return c.json({
    variants,
    schedule: schedule ?? makeSchedule(schedule, locale),
  });
});

app.get("/products/page-data/:code/supabase", async (c) => {
  const locale = c.req.headers.get("accept-language")?.startsWith("en")
    ? "en"
    : "ja";

  const client = createClient<Database>(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

  const { data, error } = await client
    .from("ShopifyPages")
    .select(
      "*,logo:shopifypages_logo_foreign(filename_disk,width,height),favicon:shopifypages_favicon_foreign(filename_disk),ShopifyProducts(*,ShopifyProductGroups(*),ShopifyVariants(*,ShopifyVariants_ShopifyCustomSKUs(ShopifyCustomSKUs(*))))"
    )
    .match({ pathname: c.req.param("code") })
    .maybeSingle();

  if (error) return c.json(error, 500);
  if (!data) return c.notFound();

  const { ShopifyProducts, ...page } = data;

  if (!ShopifyProducts || Array.isArray(ShopifyProducts))
    return c.text("invalid ShopifyProducts", 500);

  if (
    ShopifyProducts.ShopifyVariants &&
    !Array.isArray(ShopifyProducts.ShopifyVariants)
  )
    return c.text("invalid ShopifyVariants", 500);

  if (
    !ShopifyProducts.ShopifyProductGroups ||
    Array.isArray(ShopifyProducts.ShopifyProductGroups)
  )
    return c.text("invalid ShopifyProductGroups", 500);

  const variants = await makeVariants(
    ShopifyProducts,
    (ShopifyProducts.ShopifyVariants ?? []) as Variants,
    locale,
    client
  );

  // FIXME: defaultScheduleを使うようにする
  const schedule = earliest(variants.map(({ schedule }) => schedule));

  return c.json({
    ...page,
    variants,
    schedule: schedule ?? makeSchedule(schedule, locale),
    productId: ShopifyProducts.productId,
  });
});

app.get("/products/page-data/by-domain/:domain/supabase", async (c) => {
  const client = createClient<Database>(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

  const { data, error } = await client
    .from("ShopifyPages")
    .select("pathname")
    .match({ domain: c.req.param("domain") })
    .limit(1)
    .maybeSingle();

  if (error) return c.json(error, 500);
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
  const data = await c.req.json<ShopifyProduct>();
  console.log(data);

  const client = createClient<Database>(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

  const { data: product, error: productError } = await client
    .from("ShopifyProducts")
    .select("id")
    .eq("productId", String(data.id))
    .maybeSingle();
  if (productError) {
    console.error(productError);
    return c.json({ message: productError });
  }
  let productRecordId: number | undefined = product?.id;

  // activeかつ、CMS上にまだ商品がないなら商品を追加
  if (!product && data.status === "active") {
    console.log("insert new product", data.id, data.title);
    const { data: newProduct, error: productCreateError } = await client
      .from("ShopifyProducts")
      .insert({
        productId: String(data.id),
        productName: data.title,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (productCreateError) {
      console.error(productCreateError);
      return c.json({ message: productCreateError });
    }
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
    const { data: variants, error: variantsError } = await client
      .from("ShopifyVariants")
      .select("id,variantId")
      .eq("product", productRecordId);
    if (variantsError) {
      console.error(variantsError);
      return c.json({ message: variantsError });
    }
    const cmsVariantIds = variants.map(({ variantId }) => variantId);

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
      const { data: insertedVariants, error: variantInsertError } = await client
        .from("ShopifyVariants")
        .insert(
          insertData.map((item) => ({
            ...item,
            product: productRecordId,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          }))
        )
        .select("id");
      if (variantInsertError) {
        console.error(variantInsertError);
        return c.json({ message: variantInsertError });
      }
      console.log("inserted new variant record ids:", insertedVariants);
    }

    if (shouldDeleteVariantIds.length) {
      console.log("delete variants", shouldDeleteVariantIds);
      const { data: deletedVariants, error: variantDeleteError } = await client
        .from("ShopifyVariants")
        .delete()
        .in("variantId", shouldDeleteVariantIds)
        .select("id");
      if (variantDeleteError) {
        console.error(variantDeleteError);
        return c.json({ message: variantDeleteError });
      }
      console.log("inserted variant record ids:", deletedVariants);
    }

    if (shouldUpdateVariantIds.length) {
      const updateData = shouldUpdateVariantIds.map((variantId) => ({
        variantId,
        variantName: shopifyVariants[variantId]!,
      }));
      console.log("update variants", updateData);
      try {
        const updatedVariants = await Promise.all(
          updateData.map(async ({ variantId, variantName }) => {
            const { data, error } = await client
              .from("ShopifyVariants")
              .update({ variantName })
              .eq("variantId", variantId)
              .select("id")
              .single();
            if (error) throw error;
            return data;
          })
        );
        console.log("updated variant record ids:", updatedVariants);
      } catch (e) {
        console.error(e);
        return c.json({ message: e });
      }
    }
  }

  // draft/archived ならCMS上から該当商品を探し、その商品が持つバリエーションをすべて削除する
  // バリエーション削除時に、SKU紐付け用の中間テーブルが残らないようにする
  if (data.status !== "active" && productRecordId) {
    console.log("delete variants by product record id", productRecordId);
    const { data: deletedVariants, error: variantDeleteError } = await client
      .from("ShopifyVariants")
      .delete()
      .eq("product", productRecordId)
      .select("id");
    if (variantDeleteError) {
      console.error(variantDeleteError);
      return c.json({ message: variantDeleteError });
    }
    console.log("inserted variant record ids:", deletedVariants);
  }

  return c.json({ message: "synced" });
});

export default app;
