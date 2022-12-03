import { Hono } from "hono";
import { cors } from "hono/cors";
import { Bindings } from "../bindings";
import { makeSchedule } from "../libs/makeSchedule";
import { createClient } from "microcms-js-sdk";
import { makeVariants } from "../libs/makeVariants";

type KVMetadata = { expireAt: number };
type ProductData = Omit<ProductOnMicroCMS, "variants"> & {
  variants: ReturnType<typeof makeVariants> | null;
  rule: ProductOnMicroCMS["rule"] & {
    schedule: ReturnType<typeof makeSchedule>;
  };
};

const KV_TTL = 60 * 60 * 1000;

const getProductData = async (req: Request): Promise<ProductData> => {
  const locale = req.headers.get("accept-language")?.startsWith("en")
    ? "en"
    : "ja";
  const res = await fetch(req);

  if (!res.ok) throw res;

  const product = await res.json<ProductOnMicroCMS>();
  return {
    ...product,
    variants: product.variants ? makeVariants(product.variants, locale) : null,
    rule: {
      ...product.rule,
      schedule: makeSchedule(product.rule, locale),
    },
  };
};

const swrPut = async (req: Request, data: unknown, kv: KVNamespace) => {
  const key = req.url + req.headers.get("accept-language");
  return kv.put(key, JSON.stringify(data), {
    metadata: { expireAt: new Date().getTime() + KV_TTL },
  });
};

const swrGet = async <T>(
  req: Request,
  kv: KVNamespace
): Promise<[T | null, boolean]> => {
  const key = req.url + req.headers.get("accept-language");
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

app.get("/products/:id", async (c) => {
  const url = new URL(c.req.url);
  url.host = c.env.ORIGIN;
  const originReq = new Request(url.toString(), c.req);

  const [value, expired] = await swrGet<ProductData>(originReq, c.env.PRODUCT);

  if (value && expired) {
    c.executionCtx.waitUntil(
      getProductData(originReq).then((res) =>
        swrPut(originReq, res, c.env.PRODUCT)
      )
    );
  }
  if (value) return c.json(value);

  let data: ProductData;
  try {
    data = await getProductData(originReq);
  } catch (e) {
    if (e instanceof Response) return e.clone();
    throw e;
  }

  c.executionCtx.waitUntil(swrPut(originReq, data, c.env.PRODUCT));
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

export default app;
