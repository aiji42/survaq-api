import { Hono } from "hono";
import { earliest, Locale, makeSchedule, Schedule } from "../../libs/makeSchedule";
import { makeVariants } from "../../libs/makeVariants";
import { makeSKUsForDelivery, SKUsForDelivery } from "../../libs/makeSKUsForDelivery";
import { getClient } from "../../libs/db";
import { Bindings } from "../../../bindings";

type Variables = {
  locale: Locale;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  const locale = c.req.header("accept-language")?.startsWith("en") ? "en" : "ja";
  c.set("locale", locale);

  await next();
});

app.get("*", async (c, next) => {
  const url = new URL(c.req.url);
  if (url.pathname.endsWith("/supabase")) {
    url.pathname = url.pathname.replace(/\/supabase$/, "");
    return c.redirect(url.toString(), 301);
  }

  await next();
});

app.get("/", async (c) => {
  const { getAllProducts } = getClient(c.env);
  const data = await getAllProducts();

  return c.json(data);
});

export type DeliveryRouteResponse = {
  current: Schedule<boolean>;
  skus: SKUsForDelivery;
};

app.get("/:id/delivery", async (c) => {
  const { getProductWithSKUs } = getClient(c.env);

  const { product: data, skus: skusData } = await getProductWithSKUs(c.req.param("id"));

  const current = makeSchedule(null);

  if (!data) return c.json({ current, skus: [] } satisfies DeliveryRouteResponse, 404);

  const variants = await makeVariants(data, skusData, c.get("locale"));

  const filterDelaying = c.req.query("filter") !== "false";
  const skus = makeSKUsForDelivery(variants, filterDelaying);

  return c.json({ current, skus } satisfies DeliveryRouteResponse);
});

app.get("/:id", async (c) => {
  const { getProductWithSKUs } = getClient(c.env);
  const { product: data, skus: skusData } = await getProductWithSKUs(c.req.param("id"));
  if (!data) return c.notFound();

  const variants = await makeVariants(data, skusData, c.get("locale"));

  const schedule = earliest(variants.map(({ defaultSchedule }) => defaultSchedule));

  return c.json({
    variants,
    schedule: schedule ?? makeSchedule(schedule, c.get("locale")),
  });
});

app.get("/page-data/:code", async (c) => {
  const { getPageWithSKUs } = getClient(c.env);
  const { page: data, skus } = await getPageWithSKUs(c.req.param("code"));
  if (!data) return c.notFound();

  const { product, faviconFile: favicon, logoFile: logo, ...page } = data;

  const variants = await makeVariants(product, skus, c.get("locale"));

  const schedule = earliest(variants.map(({ defaultSchedule }) => defaultSchedule));

  return c.json({
    ...page,
    favicon,
    logo,
    variants,
    schedule: schedule ?? makeSchedule(schedule, c.get("locale")),
    productId: product.productId,
  });
});

app.get("/page-data/by-domain/:domain", async (c) => {
  const { getPage } = getClient(c.env);
  const data = await getPage(c.req.param("domain"));
  if (!data) return c.notFound();

  return c.json({ pathname: data.pathname });
});

export default app;
