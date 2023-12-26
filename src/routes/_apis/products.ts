import { Hono } from "hono";
import {
  earliest,
  Locale,
  makeSchedule,
  Schedule,
} from "../../libs/makeSchedule";
import { makeSKUCodes, makeVariants } from "../../libs/makeVariants";
import {
  makeSKUsForDelivery,
  SKUsForDelivery,
} from "../../libs/makeSKUsForDelivery";
import { Client, getClient } from "../../libs/db";
import { Bindings } from "../../../bindings";
import { validator } from "hono/validator";

type Variables = {
  locale: Locale;
  client: Client;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  const client = getClient(
    // Hyperdriveはデプロイしないと使えなくなったので、開発中はc.env.DATABASE_URLを利用する
    // c.env.HYPERDRIVE?.connectionString ??
    c.env.DATABASE_URL,
  );
  c.set("client", client);

  const locale = c.req.headers.get("accept-language")?.startsWith("en")
    ? "en"
    : "ja";
  c.set("locale", locale);

  await next();

  // Hyperdrive を利用していなければ(dev環境) コネクションを切る
  // !c.env.HYPERDRIVE?.connectionString &&
  // c.executionCtx.waitUntil(client.cleanUp());
});

app.get("/", async (c) => {
  const { getAllProducts } = c.get("client");
  const data = await getAllProducts();

  return c.json(data);
});

app.get("/:id/funding", async (c) => {
  const { getProductWithGroup } = c.get("client");
  const data = await getProductWithGroup(c.req.param("id"));
  if (!data) return c.notFound();

  return c.json({
    totalPrice:
      (data.group?.totalPrice ?? 0) + (data.group?.realTotalPrice ?? 0),
    supporters:
      (data.group?.supporters ?? 0) + (data.group?.realSupporters ?? 0),
    closeOn: data.group?.closeOn ?? null,
  });
});

// TODO: リファクタ
export const deliveryRoute = app.get(
  "/:id/delivery",
  validator("query", (value, c) => {
    const filter = value["filter"] === "false";
    return {
      filter: String(!filter),
    };
  }),
  async (c) => {
    const makeData = async () => {
      const { getProduct, getSKUs } = c.get("client");

      const data = await getProduct(c.req.param("id"));

      const current = makeSchedule(null);

      if (!data) return { current, skus: [] };

      const codes = makeSKUCodes(data);
      const skusData = codes.length ? await getSKUs(codes) : [];

      const variants = await makeVariants(data, skusData, c.get("locale"));

      const filterDelaying = c.req.valid("query").filter === "true";
      const skus = makeSKUsForDelivery(variants, filterDelaying);

      return { current, skus };
    };

    const cache = await c.env.CACHE.get<{
      current: Schedule<boolean>;
      skus: SKUsForDelivery;
    }>(c.req.url + c.get("locale"), "json");

    if (cache) {
      c.executionCtx.waitUntil(
        (async () => {
          const data = await makeData();
          console.log("update cache", "key: ", c.req.url + c.get("locale"));
          await c.env.CACHE.put(
            c.req.url + c.get("locale"),
            JSON.stringify(data),
          );
        })(),
      );
      return c.json(cache);
    }

    const data = await makeData();
    c.executionCtx.waitUntil(
      (async () => {
        await c.env.CACHE.put(
          c.req.url + c.get("locale"),
          JSON.stringify(data),
        );
      })(),
    );

    return c.json(data);
  },
);

app.get("/:id/supabase", async (c) => {
  const { getProduct, getSKUs } = c.get("client");
  const data = await getProduct(c.req.param("id"));
  if (!data) return c.notFound();

  const codes = makeSKUCodes(data);
  const skusData = codes.length ? await getSKUs(codes) : [];

  const variants = await makeVariants(data, skusData, c.get("locale"));

  const schedule = earliest(
    variants.map(({ defaultSchedule }) => defaultSchedule),
  );

  return c.json({
    variants,
    schedule: schedule ?? makeSchedule(schedule, c.get("locale")),
  });
});

app.get("/page-data/:code/supabase", async (c) => {
  const { getPage, getSKUs } = c.get("client");
  const data = await getPage(c.req.param("code"));
  if (!data) return c.notFound();

  const { product, faviconFile: favicon, logoFile: logo, ...page } = data;

  const codes = makeSKUCodes(product);
  const skusData = codes.length ? await getSKUs(codes) : [];

  const variants = await makeVariants(product, skusData, c.get("locale"));

  const schedule = earliest(
    variants.map(({ defaultSchedule }) => defaultSchedule),
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

app.get("/page-data/by-domain/:domain/supabase", async (c) => {
  const { getPage } = c.get("client");
  const data = await getPage(c.req.param("domain"));
  if (!data) return c.notFound();

  return c.json({ pathname: data.pathname });
});

export default app;
