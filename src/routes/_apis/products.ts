import { Hono } from "hono";
import { earliest, Locale, makeSchedule } from "../../libs/makeSchedule";
import { makeSKUCodes, makeVariants } from "../../libs/makeVariants";
import { makeSKUsForDelivery } from "../../libs/makeSKUsForDelivery";
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

export const deliveryRoute = app.get(
  "/:id/delivery",
  validator("query", (value, c) => {
    const filter = value["filter"] === "false";
    return {
      filter: String(!filter),
    };
  }),
  async (c) => {
    const { getProduct, getSKUs } = c.get("client");
    const data = await getProduct(c.req.param("id"));

    const current = makeSchedule(null);

    // RPCを使用したいので、c.notFound() は使用しない
    if (!data) return c.json({ current, skus: [] }, 404);

    const codes = makeSKUCodes(data);
    const skusData = codes.length ? await getSKUs(codes) : [];

    const variants = await makeVariants(data, skusData, c.get("locale"));

    const filterDelaying = c.req.valid("query").filter === "true";
    const skus = makeSKUsForDelivery(variants, filterDelaying);

    return c.json({ current, skus });
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
