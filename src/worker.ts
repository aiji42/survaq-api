import { Hono } from "hono";
import { cors } from "hono/cors";
import { Bindings } from "../bindings";
import { makeSchedule } from "../libs/makeSchedule";

type KVMetadata = { expireAt: number };
type ProductData = ProductOnMicroCMS & {
  rule: ProductOnMicroCMS["rule"] & {
    schedule: ReturnType<typeof makeSchedule>;
  };
};

const KV_TTL = 60 * 60 * 1000;

const getProductData = async (req: Request): Promise<ProductData> => {
  const res = await fetch(req);

  if (res.status >= 200 && res.status < 300) {
    const product = await res.json<ProductOnMicroCMS>();
    return {
      ...product,
      rule: {
        ...product.rule,
        schedule: makeSchedule(product.rule),
      },
    };
  }

  throw res;
};

const swrPut = async (key: string, data: unknown, kv: KVNamespace) => {
  return kv.put(key, JSON.stringify(data), {
    metadata: { expireAt: new Date().getTime() + KV_TTL },
  });
};

const swrGet = async <T>(
  key: string,
  kv: KVNamespace
): Promise<[T | null, boolean]> => {
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
  const kvKey = originReq.url;

  const [value, expired] = await swrGet<ProductData>(kvKey, c.env.PRODUCT);

  if (value && expired) {
    c.executionCtx.waitUntil(
      getProductData(originReq).then((res) => swrPut(kvKey, res, c.env.PRODUCT))
    );
  }
  if (value) return c.json(value);

  let data: ProductData;
  try {
    data = await getProductData(originReq);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  c.executionCtx.waitUntil(swrPut(kvKey, data, c.env.PRODUCT));
  return c.json(data);
});

export default app;
