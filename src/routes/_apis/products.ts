import { Handler, Hono, Input } from "hono";
import { earliest, Locale, makeSchedule, Schedule } from "../../libs/makeSchedule";
import { makeSKUCodes, makeVariants } from "../../libs/makeVariants";
import { makeSKUsForDelivery, SKUsForDelivery } from "../../libs/makeSKUsForDelivery";
import { Client, getClient } from "../../libs/db";
import { Bindings } from "../../../bindings";
import { createFactory } from "hono/factory";
import { HandlerResponse } from "hono/dist/types/types";

type Variables = {
  locale: Locale;
  client: Client;
};

const factory = createFactory<{ Bindings: Bindings; Variables: Variables }>();

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  const client = getClient(
    // Hyperdriveはデプロイしないと使えなくなったので、開発中はc.env.DATABASE_URLを利用する
    // c.env.HYPERDRIVE?.connectionString ??
    c.env.DATABASE_URL,
  );
  c.set("client", client);

  const locale = c.req.headers.get("accept-language")?.startsWith("en") ? "en" : "ja";
  c.set("locale", locale);

  await next();

  // Hyperdrive を利用していなければ(dev環境) コネクションを切る
  // !c.env.HYPERDRIVE?.connectionString &&
  // c.executionCtx.waitUntil(client.cleanUp());
});

const makeSWRHandler = <
  P extends string,
  I extends Input = Input,
  R extends HandlerResponse<any> = any,
>(
  handler: Handler<{ Bindings: Bindings; Variables: Variables }, P, I, R>,
  ttl = 10000,
) => {
  return factory.createHandlers(async (c, next) => {
    const cacheKey = c.req.url + c.get("locale");

    const updateCache = async (_res: Response | Promise<Response>) => {
      const res = await _res;
      if (!(res.status >= 200 && res.status < 300)) return;
      if (!res.headers.get("content-type")?.includes("application/json")) return;
      if (res.headers.has("set-cookie")) return;

      console.log("update cache", "key: ", cacheKey);

      // @ts-ignore
      const headers = Object.fromEntries(res.headers);

      await c.env.CACHE.put(cacheKey, await res.arrayBuffer(), {
        metadata: { staleAt: Date.now() + ttl, headers },
      });
    };

    const { value, metadata } = await c.env.CACHE.getWithMetadata<{
      staleAt: number;
      headers: Record<string, string>;
    }>(cacheKey, "arrayBuffer");

    if (value) {
      if ((metadata?.staleAt ?? 0) < Date.now())
        c.executionCtx.waitUntil(updateCache(handler(c, next) as Promise<Response>));

      return c.newResponse(value, metadata ? { headers: metadata.headers } : undefined);
    }

    const res = (await handler(c, next)) as Response;

    if (res.status === 200) c.executionCtx.waitUntil(updateCache(res.clone()));

    return res;
  });
};

app.get(
  "/",
  ...makeSWRHandler<"/">(async (c) => {
    const { getAllProducts } = c.get("client");
    const data = await getAllProducts();

    return c.json(data);
  }),
);

export type DeliveryRouteResponse = {
  current: Schedule<boolean>;
  skus: SKUsForDelivery;
};

app.get(
  "/:id/delivery",
  ...makeSWRHandler<"/:id/delivery">(async (c) => {
    const { getProduct, getSKUs } = c.get("client");

    const data = await getProduct(c.req.param("id"));

    const current = makeSchedule(null);

    if (!data) return c.json({ current, skus: [] } satisfies DeliveryRouteResponse, 404);

    const codes = makeSKUCodes(data);
    const skusData = await getSKUs(codes);

    const variants = await makeVariants(data, skusData, c.get("locale"));

    const filterDelaying = c.req.query("filter") !== "false";
    const skus = makeSKUsForDelivery(variants, filterDelaying);

    return c.json({ current, skus } satisfies DeliveryRouteResponse);
  }, 600000),
);

app.get(
  "/:id/supabase",
  ...makeSWRHandler<"/:id/supabase">(async (c) => {
    const { getProduct, getSKUs } = c.get("client");
    const data = await getProduct(c.req.param("id"));
    if (!data) return c.notFound();

    const codes = makeSKUCodes(data);
    const skusData = await getSKUs(codes);

    const variants = await makeVariants(data, skusData, c.get("locale"));

    const schedule = earliest(variants.map(({ defaultSchedule }) => defaultSchedule));

    return c.json({
      variants,
      schedule: schedule ?? makeSchedule(schedule, c.get("locale")),
    });
  }),
);

app.get(
  "/page-data/:code/supabase",
  ...makeSWRHandler<"/page-data/:code/supabase">(async (c) => {
    const { getPage, getSKUs } = c.get("client");
    const data = await getPage(c.req.param("code"));
    if (!data) return c.notFound();

    const { product, faviconFile: favicon, logoFile: logo, ...page } = data;

    const codes = makeSKUCodes(product);
    const skusData = await getSKUs(codes);

    const variants = await makeVariants(product, skusData, c.get("locale"));

    const schedule = earliest(variants.map(({ defaultSchedule }) => defaultSchedule));

    return c.json({
      ...page,
      favicon,
      logo,
      variants,
      schedule: schedule ?? makeSchedule(schedule, c.get("locale")),
      productId: product.productId,
    });
  }),
);

app.get(
  "/page-data/by-domain/:domain/supabase",
  ...makeSWRHandler<"/page-data/by-domain/:domain/supabase">(async (c) => {
    const { getPage } = c.get("client");
    const data = await getPage(c.req.param("domain"));
    if (!data) return c.notFound();

    return c.json({ pathname: data.pathname });
  }),
);

export default app;
