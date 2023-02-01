import { Hono, Context } from "hono";
import { cors } from "hono/cors";
import { Bindings } from "../bindings";
import { makeSchedule } from "../libs/makeSchedule";
import { createClient } from "microcms-js-sdk";
import { makeVariants } from "../libs/makeVariants";
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {Database} from "./database.type";

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

app.get('/test', async (c) => {
  const client = createSupabaseClient<Database>(c.env.SUPABASE_URL, c.env.SUPABASE_KEY)
  const res = await client.from('FacebookAdAlerts').select('id')
  return c.json(res)
})

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

  return c.json({
    ...baseProductData,
    variants: makeVariants(
      baseProductData.variants?.filter(
        (v) => v.productId === c.req.param("id")
      ) ?? [],
      locale
    ),
    rule: {
      ...baseProductData.rule,
      schedule: makeSchedule(baseProductData.rule, locale),
    },
    foundation: lazyProductData.foundation,
  });
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

export default app;
