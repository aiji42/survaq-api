import { Hono } from "hono";
import { cors } from "hono/cors";
import { Bindings } from "../bindings";
import { makeSchedule, makeScheduleSupabase } from "../libs/makeSchedule";
import { createClient } from "microcms-js-sdk";
import {
  makeVariants,
  makeVariantsSupabase,
  VariantsSupabase,
} from "../libs/makeVariants";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.type";
import dayjs from "dayjs";

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
  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

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

app.get("/products/:id/supabase", async (c) => {
  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

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

  const variants = makeVariantsSupabase(
    data,
    (data.ShopifyVariants ?? []) as VariantsSupabase,
    locale
  );

  return c.json({
    variants,
    schedule: makeScheduleSupabase(
      data.ShopifyProductGroups.deliverySchedule,
      locale
    ),
  });
});

app.get("/products/:id", async (c) => {
  const cmsClient = createClient({
    serviceDomain: "survaq-shopify",
    apiKey: c.env.MICROCMS_API_TOKEN,
  });

  const {
    contents: [baseProductData],
  } = await cmsClient.getList<ProductOnMicroCMS>({
    endpoint: "products",
    queries: {
      filters: "productIds[contains]" + c.req.param("id"),
      fields: [
        "id",
        "productIds",
        "productCode",
        "productName",
        "rule",
        "variants",
        "skuLabel",
        "foundation",
      ],
    },
  });

  if (!baseProductData) return c.notFound();

  const locale = c.req.headers.get("accept-language")?.startsWith("en")
    ? "en"
    : "ja";

  const variants = makeVariants(
    baseProductData.variants?.filter(
      (v) => v.productId === c.req.param("id")
    ) ?? [],
    locale
  );

  return c.json({
    ...baseProductData,
    variants,
    rule: {
      ...baseProductData.rule,
      schedule: makeSchedule(baseProductData.rule, locale),
    },
  });
});

app.get("/products/page-data/:code/supabase", async (c) => {
  const locale = c.req.headers.get("accept-language")?.startsWith("en")
    ? "en"
    : "ja";

  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

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

  return c.json({
    ...page,
    variants: makeVariantsSupabase(
      ShopifyProducts,
      (ShopifyProducts.ShopifyVariants ?? []) as VariantsSupabase,
      locale
    ),
    schedule: makeScheduleSupabase(
      ShopifyProducts.ShopifyProductGroups.deliverySchedule,
      locale
    ),
    productId: ShopifyProducts.productId,
  });
});

app.get("/products/page-data/by-domain/:domain/supabase", async (c) => {
  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

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

app.post("/products/sku/sync", async (c) => {
  const json = await c.req.json<{
    message: {};
    type: "new" | "edit" | "delete";
    contents: {
      new?: { publishValue: Exclude<Variant["skus"], undefined>[number] };
    };
  }>();
  const data = json.contents.new?.publishValue;

  if (!data) return c.json({});

  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

  console.log("upsert ShopifyCustomSKUs");
  const { error } = await client
    .from("ShopifyCustomSKUs")
    .upsert(
      {
        code: data.code,
        name: data.name,
        subName: data.subName,
        deliverySchedule: data.deliverySchedule ?? null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      {
        onConflict: "code",
        ignoreDuplicates: false,
      }
    )
    .select("id");

  if (error) console.error(error);
  if (error) return c.json(error, 500);

  return c.json({ message: "synced" });
});

app.post("/products/sync", async (c) => {
  const json = await c.req.json<{
    message: {};
    type: "new" | "edit" | "delete";
    contents: {
      new?: { publishValue: ProductOnMicroCMS };
    };
  }>();
  const data = json.contents.new?.publishValue;

  if (!data) return c.json({});

  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

  console.log("upsert ShopifyProductGroups", data.productName);
  const { data: groupData, error: groupError } = await client
    .from("ShopifyProductGroups")
    .upsert(
      {
        title: data.productName,
        totalPrice: data.foundation.totalPrice,
        supporters: data.foundation.supporter,
        closeOn: dayjs(data.foundation.closeOn)
          .tz("Asia/Tokyo")
          .format("YYYY-MM-DD"),
        deliverySchedule:
          data.rule.customSchedules[0]?.deliverySchedule ?? null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      { onConflict: "title", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (groupError) console.error(groupError);
  if (!groupData || groupError) return c.json(groupError, 500);

  console.log("upsert ShopifyProducts", data.productName, data.productIds);

  const shopifyProductTitleById = Object.fromEntries(
    await Promise.all(
      data.productIds.split(",").map(async (id) => {
        const res = await fetch(
          `https://${c.env.SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2023-01/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/graphql",
              "X-Shopify-Access-Token": c.env.SHOPIFY_ACCESS_TOKEN,
            },
            body: `
              {
                product(id: "gid://shopify/Product/${id}") {
                  title
                }
              }
            `,
          }
        );

        const {
          data: { product },
        } = (await res.json()) as {
          data: { product: null | { title: string } };
        };
        return [id, product?.title ?? null] satisfies [string, string | null];
      })
    )
  );

  console.log(shopifyProductTitleById);
  const { data: productData, error: productError } = await client
    .from("ShopifyProducts")
    .upsert(
      data.productIds.split(",").map((id) => ({
        productName: shopifyProductTitleById[id] ?? data.productName,
        productId: id,
        productGroupId: groupData.id,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })),
      { onConflict: "productId", ignoreDuplicates: false }
    )
    .select("id,productId");

  if (productError) console.error(productError);
  if (!productData || productError) return c.json(productError, 500);

  const productIdMap = Object.fromEntries(
    productData.map(({ id, productId }) => [productId, id])
  );

  await Promise.all(
    (data.variants ?? []).map(async (variant) => {
      const product = productIdMap[variant.productId];
      if (!product)
        throw new Error(
          `not found product record (productId: ${variant.productId})`
        );
      console.log(
        "upsert ShopifyVariants",
        variant.variantId,
        variant.variantName
      );
      const { data: variantData } = await client
        .from("ShopifyVariants")
        .upsert(
          {
            product,
            variantId: variant.variantId,
            variantName: variant.variantName,
            customSelects: variant.skuSelectable,
            skuLabel: data.skuLabel ?? null,
            deliverySchedule: variant.deliverySchedule ?? null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          },
          {
            onConflict: "variantId",
            ignoreDuplicates: false,
          }
        )
        .select("id")
        .single();

      let skuData;
      if (variant.skus) {
        console.log("upsert ShopifyCustomSKUs");
        const { data } = await client
          .from("ShopifyCustomSKUs")
          .upsert(
            variant.skus.map((sku) => ({
              code: sku.code,
              name: sku.name,
              subName: sku.subName,
              deliverySchedule: sku.deliverySchedule ?? null,
              createdAt: sku.createdAt,
              updatedAt: sku.updatedAt,
            })),
            {
              onConflict: "code",
              ignoreDuplicates: false,
            }
          )
          .select("id");
        skuData = data;
      }
      if (variantData) {
        await client
          .from("ShopifyVariants_ShopifyCustomSKUs")
          .delete()
          .eq("ShopifyVariants_id", variantData.id);
      }
      if (variantData && skuData) {
        await client.from("ShopifyVariants_ShopifyCustomSKUs").insert(
          skuData.map((sku, index) => ({
            ShopifyCustomSKUs_id: sku.id,
            ShopifyVariants_id: variantData.id,
            sort: index + 1,
          }))
        );
      }
    })
  );

  if (
    data.pageData &&
    data.pageData.domain &&
    data.pageData.pathname &&
    data.pageData.productHandle &&
    data.pageData.productId
  ) {
    const product = productIdMap[data.pageData.productId];
    if (!product) {
      console.error(
        `not found product record (productId: ${data.pageData.productId})`
      );
      throw new Error(
        `not found product record (productId: ${data.pageData.productId})`
      );
    }

    const { error } = await client.from("ShopifyPages").upsert(
      {
        buyButton: data.pageData.buyButton,
        customBody: data.pageData.customBody,
        customHead: data.pageData.customHead,
        description: data.pageData.description,
        domain: data.pageData.domain,
        productHandle: data.pageData.productHandle,
        ogpImageUrl: data.pageData.ogpImageUrl,
        ogpShortTitle: data.pageData.ogpShortTitle,
        pathname: data.pageData.pathname,
        title: data.pageData.title,
        product,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      {
        onConflict: "pathname",
        ignoreDuplicates: false,
      }
    );
    if (error) console.error(error);
  }

  if (
    data.pageDataSub &&
    data.pageDataSub.domain &&
    data.pageDataSub.pathname &&
    data.pageDataSub.productHandle &&
    data.pageDataSub.productId
  ) {
    const product = productIdMap[data.pageDataSub.productId];
    if (!product) {
      console.error(
        `not found product record (productId: ${data.pageDataSub.productId})`
      );
      throw new Error(
        `not found product record (productId: ${data.pageDataSub.productId})`
      );
    }

    const { error } = await client.from("ShopifyPages").upsert(
      {
        buyButton: data.pageDataSub.buyButton,
        customBody: data.pageDataSub.customBody,
        customHead: data.pageDataSub.customHead,
        description: data.pageDataSub.description,
        domain: data.pageDataSub.domain,
        productHandle: data.pageDataSub.productHandle,
        ogpImageUrl: data.pageDataSub.ogpImageUrl,
        ogpShortTitle: data.pageDataSub.ogpShortTitle,
        pathname: data.pageDataSub.pathname,
        title: data.pageDataSub.title,
        product,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      {
        onConflict: "pathname",
        ignoreDuplicates: false,
      }
    );
    if (error) console.error(error);
  }

  if (Object.values(productIdMap).length) {
    const { error } = await client
      .from("ShopifyPages")
      .delete()
      .in("product", Object.values(productIdMap))
      .not("pathname", "eq", data.pageData?.pathname ?? "")
      .not("pathname", "eq", data.pageDataSub?.pathname ?? "");

    if (error) console.error(error);
    if (error) return c.json(error, 500);
  }

  return c.json({ message: "synced" });
});

app.post("/shopify/product", async (c) => {
  const data = await c.req.json<{ body_html?: string; handle?: string }>();

  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

  if (data.handle && data.body_html) {
    const { error } = await client
      .from("ShopifyPages")
      .update({ body: data.body_html, updatedAt: new Date().toISOString() })
      .eq("productHandle", data.handle);

    if (error) console.error(error);
    return c.json({ message: error });
  }

  return c.json({ message: "synced" });
});

export default app;
