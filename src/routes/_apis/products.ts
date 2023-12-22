import { Hono } from "hono";
import { endTime, startTime, setMetric } from "hono/timing";
import { earliest, Locale, makeSchedule } from "../../libs/makeSchedule";
import { makeSKUCodes, makeVariants } from "../../libs/makeVariants";
import { makeSKUsForDelivery } from "../../libs/makeSKUsForDelivery";
import { Client, getClient } from "../../libs/db";
import { Bindings } from "../../../bindings";

type Variables = {
  locale: Locale;
  client: Client;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  // @ts-ignore
  setMetric(c, "colo", (c.req.raw.cf?.colo as string | undefined) ?? "");

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

  startTime(c, "main_process");
  await next();
  endTime(c, "main_process");

  // Hyperdrive を利用していなければ(dev環境) コネクションを切る
  // pgBouncerを信じてコネクションを切らずに頑張る
  // !c.env.HYPERDRIVE?.connectionString &&
  //   c.executionCtx.waitUntil(client.cleanUp());
});

app.get("/", async (c) => {
  const { getAllProducts } = c.get("client");
  startTime(c, "db");
  const data = await getAllProducts();
  endTime(c, "db");

  return c.json(data);
});

app.get("/:id/funding", async (c) => {
  const { getProduct } = c.get("client");
  startTime(c, "db");
  const data = await getProduct(c.req.param("id"));
  endTime(c, "db");
  if (!data) return c.notFound();

  return c.json({
    totalPrice:
      (data.group?.totalPrice ?? 0) + (data.group?.realTotalPrice ?? 0),
    supporters:
      (data.group?.supporters ?? 0) + (data.group?.realSupporters ?? 0),
    closeOn: data.group?.closeOn ?? null,
  });
});

app.get("/:id/delivery", async (c) => {
  const { getProduct, getSKUs } = c.get("client");
  startTime(c, "db");
  const data = await getProduct(c.req.param("id"));
  endTime(c, "db");
  if (!data) return c.notFound();

  const codes = makeSKUCodes(data);
  startTime(c, "db_sku");
  const skusData = codes.length ? await getSKUs(codes) : [];
  endTime(c, "db_sku");

  const variants = await makeVariants(data, skusData, c.get("locale"));

  const current = makeSchedule(null);

  const filterDelaying = !(c.req.query("filter") === "false");
  const skus = makeSKUsForDelivery(variants, filterDelaying);

  return c.json({ current, skus });
});

app.get("/:id/supabase", async (c) => {
  const { getProduct, getSKUs } = c.get("client");
  startTime(c, "db");
  const data = await getProduct(c.req.param("id"));
  endTime(c, "db");
  if (!data) return c.notFound();

  const codes = makeSKUCodes(data);
  startTime(c, "db_sku");
  const skusData = codes.length ? await getSKUs(codes) : [];
  endTime(c, "db_sku");

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
  startTime(c, "db");
  const data = await getPage(c.req.param("code"));
  endTime(c, "db");
  if (!data) return c.notFound();

  const { product, faviconFile: favicon, logoFile: logo, ...page } = data;

  const codes = makeSKUCodes(product);
  startTime(c, "db_sku");
  const skusData = codes.length ? await getSKUs(codes) : [];
  endTime(c, "db_sku");

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
  startTime(c, "db");
  const data = await getPage(c.req.param("domain"));
  endTime(c, "db");
  if (!data) return c.notFound();

  return c.json({ pathname: data.pathname });
});

export default app;
