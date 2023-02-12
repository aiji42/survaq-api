import { Hono, Context } from "hono";
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

type KVMetadata = { expireAt: number };

const KV_TTL = 3600;

const getProductDataFromOrigin = async (
  c: Context<any, { Bindings: Bindings }>
): Promise<ProductOnMicroCMS> => {
  const url = new URL(c.req.url);
  url.host = c.env.ORIGIN;
  const originReq = new Request(url.toString(), c.req);

  let [data, expired] = await swrGet<ProductOnMicroCMS>(
    originReq,
    c.env.PRODUCT
  );

  if (data && expired) {
    c.executionCtx.waitUntil(
      fetch(originReq)
        .then((res) => res.json())
        .then((data) => swrPut(originReq, data, c.env.PRODUCT))
    );
  }

  if (!data) {
    data = (await fetch(originReq).then((res) =>
      res.json()
    )) as ProductOnMicroCMS;
    c.executionCtx.waitUntil(swrPut(originReq, data, c.env.PRODUCT));
  }

  return data;
};

const swrPut = async (req: Request, data: unknown, kv: KVNamespace) => {
  const key = req.url + req.headers.get("accept-language") + "v2";
  return kv.put(key, JSON.stringify(data), {
    metadata: { expireAt: new Date().getTime() + KV_TTL * 1000 },
  });
};

const swrGet = async <T>(
  req: Request,
  kv: KVNamespace
): Promise<[T | null, boolean]> => {
  const key = req.url + req.headers.get("accept-language") + "v2";
  const { value, metadata } = await kv.getWithMetadata<T, KVMetadata>(key, {
    type: "json",
    cacheTtl: 600,
  });

  return [value, !!(metadata && metadata.expireAt < new Date().getTime())];
};

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
      data.ShopifyProductGroups.deliverySchedule as DeliverySchedule | null,
      locale
    ),
  });
});

app.get("/products/:id", async (c) => {
  const cmsClient = createClient({
    serviceDomain: "survaq-shopify",
    apiKey: c.env.MICROCMS_API_TOKEN,
  });

  const [
    {
      contents: [baseProductData],
    },
    lazyProductData,
  ] = await Promise.all([
    cmsClient.getList<ProductOnMicroCMS>({
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
    }),
    getProductDataFromOrigin(c),
  ]);

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
    foundation: lazyProductData.foundation,
  });
});

// WIP
app.get("/products/page-data/:code/supabase", async (c) => {
  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

  const { data, error } = await client
    .from("ShopifyPages")
    .select(
      "*,ShopifyProducts(*,ShopifyProductGroups(*),ShopifyVariants(*,ShopifyVariants_ShopifyCustomSKUs(ShopifyCustomSKUs(*))))"
    )
    .match({ pathname: c.req.param("code") })
    .single();

  if (error) return c.json(error, 500);
  if (!data) return c.notFound();

  return c.json(data);
});

app.get("/products/page-data/:code", async (c) => {
  const cmsClient = createClient({
    serviceDomain: "survaq-shopify",
    apiKey: c.env.MICROCMS_API_TOKEN,
  });

  const [
    {
      contents: [product1],
    },
    {
      contents: [product2],
    },
  ] = await Promise.all([
    cmsClient.getList<ProductOnMicroCMS>({
      endpoint: "products",
      queries: {
        filters: `pageData.pathname[equals]${c.req.param("code")}`,
        fields: ["productCode", "productName", "pageData"],
      },
    }),
    cmsClient.getList<ProductOnMicroCMS>({
      endpoint: "products",
      queries: {
        filters: `pageDataSub.pathname[equals]${c.req.param("code")}`,
        fields: ["productCode", "productName", "pageDataSub"],
      },
    }),
  ]);

  const product = product1 || product2;

  if (!product) return c.notFound();

  if ("pageDataSub" in product && !product.pageData) {
    product.pageData = product.pageDataSub;
    product.pageDataSub = undefined;
  }

  return c.json(product);
});

app.get("/products/page-data/by-domain/:domain", async (c) => {
  const cmsClient = createClient({
    serviceDomain: "survaq-shopify",
    apiKey: c.env.MICROCMS_API_TOKEN,
  });

  const [
    {
      contents: [product1],
    },
    {
      contents: [product2],
    },
  ] = await Promise.all([
    cmsClient.getList<ProductOnMicroCMS>({
      endpoint: "products",
      queries: {
        filters: "pageData.domain[equals]" + c.req.param("domain"),
        fields: ["productCode", "productName", "pageData"],
      },
    }),
    cmsClient.getList<ProductOnMicroCMS>({
      endpoint: "products",
      queries: {
        filters: "pageDataSub.domain[equals]" + c.req.param("domain"),
        fields: ["productCode", "productName", "pageDataSub"],
      },
    }),
  ]);

  const product = product1 ?? product2;

  if (!product) return c.notFound();

  if ("pageDataSub" in product && !product.pageData) {
    product.pageData = product.pageDataSub;
    product.pageDataSub = undefined;
  }

  return c.json(product);
});

app.get("/products/page-data/by-shopify-handle/:handle", async (c) => {
  const cmsClient = createClient({
    serviceDomain: "survaq-shopify",
    apiKey: c.env.MICROCMS_API_TOKEN,
  });

  const [
    {
      contents: [product1],
    },
    {
      contents: [product2],
    },
  ] = await Promise.all([
    cmsClient.getList<ProductOnMicroCMS>({
      endpoint: "products",
      queries: {
        filters: "pageData.productHandle[equals]" + c.req.param("handle"),
        fields: ["productCode", "productName", "pageData"],
      },
    }),
    cmsClient.getList<ProductOnMicroCMS>({
      endpoint: "products",
      queries: {
        filters: "pageDataSub.productHandle[equals]" + c.req.param("handle"),
        fields: ["productCode", "productName", "pageDataSub"],
      },
    }),
  ]);

  const product = product1 ?? product2;

  if (!product) return c.notFound();

  if ("pageDataSub" in product && !product.pageData) {
    product.pageData = product.pageDataSub;
    product.pageDataSub = undefined;
  }

  return c.json(product);
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
        deliverySchedule: data.rule.customSchedules[0]?.deliverySchedule,
      },
      { onConflict: "title", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (!groupData || groupError) return c.json(groupError, 500);

  console.log("upsert ShopifyProducts", data.productName, data.productIds);
  const { data: productData, error: productError } = await client
    .from("ShopifyProducts")
    .upsert(
      data.productIds.split(",").map((id) => ({
        productName: data.productName,
        productId: id,
        productGroupId: groupData.id,
      })),
      { onConflict: "productId", ignoreDuplicates: false }
    )
    .select("id,productId");

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
          },
          {
            onConflict: "variantId",
            ignoreDuplicates: false,
          }
        )
        .select("id")
        .single();

      console.log("upsert ShopifyCustomSKUs");
      const { data: skuData } = await client
        .from("ShopifyCustomSKUs")
        .upsert(
          variant.skus.map((sku) => ({
            code: sku.code,
            name: sku.name,
            subName: sku.subName,
            deliverySchedule: sku.deliverySchedule ?? null,
          })),
          {
            onConflict: "code",
            ignoreDuplicates: false,
          }
        )
        .select("id");
      if (variantData && skuData) {
        await client
          .from("ShopifyVariants_ShopifyCustomSKUs")
          .delete()
          .eq("ShopifyVariants_id", variantData.id);
        await client.from("ShopifyVariants_ShopifyCustomSKUs").insert(
          skuData.map((sku) => ({
            ShopifyCustomSKUs_id: sku.id,
            ShopifyVariants_id: variantData.id,
          }))
        );
      }
    })
  );

  if (Object.values(productIdMap).length) {
    const { error } = await client
      .from("ShopifyPages")
      .delete()
      .in("product", Object.values(productIdMap));

    if (error) return c.json(error, 500);
  }
  if (
    data.pageData &&
    data.pageData.domain &&
    data.pageData.pathname &&
    data.pageData.productHandle &&
    data.pageData.productId
  ) {
    const product = productIdMap[data.pageData.productId];
    if (!product)
      throw new Error(
        `not found product record (productId: ${data.pageData.productId})`
      );

    await client.from("ShopifyPages").insert({
      buyButton: data.pageData.buyButton,
      customBody: data.pageData.customBody,
      customHead: data.pageData.customHead,
      description: data.pageData.description,
      domain: data.pageData.domain,
      productHandle: data.pageData.productHandle,
      favicon: data.pageData.favicon?.url,
      logo: data.pageData.logo?.url,
      ogpImageUrl: data.pageData.ogpImageUrl,
      ogpShortTitle: data.pageData.ogpShortTitle,
      pathname: data.pageData.pathname,
      title: data.pageData.title,
      product,
    });
  }

  if (
    data.pageDataSub &&
    data.pageDataSub.domain &&
    data.pageDataSub.pathname &&
    data.pageDataSub.productHandle &&
    data.pageDataSub.productId
  ) {
    const product = productIdMap[data.pageDataSub.productId];
    if (!product)
      throw new Error(
        `not found product record (productId: ${data.pageDataSub.productId})`
      );

    await client.from("ShopifyPages").insert({
      buyButton: data.pageDataSub.buyButton,
      customBody: data.pageDataSub.customBody,
      customHead: data.pageDataSub.customHead,
      description: data.pageDataSub.description,
      domain: data.pageDataSub.domain,
      productHandle: data.pageDataSub.productHandle,
      favicon: data.pageDataSub.favicon?.url,
      logo: data.pageDataSub.logo?.url,
      ogpImageUrl: data.pageDataSub.ogpImageUrl,
      ogpShortTitle: data.pageDataSub.ogpShortTitle,
      pathname: data.pageDataSub.pathname,
      title: data.pageDataSub.title,
      product,
    });
  }

  return c.json({ message: "synced" });
});

export default app;
