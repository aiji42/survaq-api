import { Hono } from "hono";
import { Locale, makeSchedule } from "../../libs/makeSchedule";
import { makeSKUsForDelivery } from "../../libs/makeSKUsForDelivery";
import { Bindings } from "../../../bindings";
import { DB } from "../../libs/db";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Product } from "../../libs/models/cms/Product";
import { asyncCache, makeNotifiableErrorHandler } from "../../libs/utils";
import { inlineCode } from "../../libs/slack";
import { timeout } from "hono/timeout";

type Variables = {
  locale: Locale;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  const locale = c.req.header("accept-language")?.startsWith("en") ? "en" : "ja";
  c.set("locale", locale);

  await next();
});

app.use("*", timeout(10000));

app.onError(makeNotifiableErrorHandler());

app.get("*", async (c, next) => {
  const url = new URL(c.req.url);
  // FIXME: 一定期間計測したあとに、実績がなければ削除する
  if (url.pathname.endsWith("/supabase")) {
    await c.env.KIRIBI.enqueue("NotifyToSlack", {
      text: `プレフィックス /subabase 付きURLがアクセスされました ${inlineCode(c.req.url)}`,
      attachments: [
        {
          fields: [
            { title: "Referer", value: c.req.header("referer") ?? "-" },
            { title: "UA", value: c.req.header("user-agent") ?? "-" },
          ],
        },
      ],
    });
    url.pathname = url.pathname.replace(/\/supabase$/, "");
    return c.redirect(url.toString(), 301);
  }

  await next();
});

app.get("/", async (c) => {
  const db = new DB(c.env);
  const data = await db.getAllProducts();

  return c.json(data);
});

app.get("/pages", async (c) => {
  const db = new DB(c.env);
  const data = await db.getAllPages();

  return c.json(data);
});

const productDeliveryRoute = app.get(
  "/:id/delivery",
  zValidator(
    "query",
    z.object({
      filter: z.string().optional(),
    }),
  ),
  async (c) => {
    const filterDelaying = c.req.valid("query")?.filter !== "false";

    const db = new DB(c.env);
    const product = await asyncCache(
      `${c.req.url}-${c.get("locale")}`,
      c,
      c.env.CACHE,
      60 * 60,
      () =>
        db.useTransaction(async (transactedDb) => {
          const product = await new Product(transactedDb, c.get("locale")).getProductByShopifyId(
            c.req.param("id"),
          );
          if (!product) throw new HTTPException(404);
          return product;
        }),
    );

    const skus = makeSKUsForDelivery(Object.values(product.skus), filterDelaying);

    const current = makeSchedule(null);
    return c.json({ current, skus });
  },
);

export type ProductDeliveryRoute = typeof productDeliveryRoute;

app.get("/:id", async (c) => {
  const db = new DB(c.env);

  const product = await asyncCache(`${c.req.url}-${c.get("locale")}`, c, c.env.CACHE, 60 * 60, () =>
    db.useTransaction(async (transactedDb) => {
      const product = await new Product(transactedDb, c.get("locale")).getProductByShopifyId(
        c.req.param("id"),
      );
      if (!product) throw new HTTPException(404);
      return product;
    }),
  );

  return c.json(product);
});

app.get("/page-data/:code", async (c) => {
  const db = new DB(c.env);
  const data = await db.useTransaction(async (transactedDb) => {
    const data = await db.getPage(c.req.param("code"));
    if (!data) throw new HTTPException(404);
    const { ShopifyProducts, faviconFile: favicon, logoFile: logo, ...page } = data;

    const product = await new Product(transactedDb, c.get("locale")).getProductByShopifyId(
      ShopifyProducts.productId,
    );
    if (!product) throw new HTTPException(404);

    return {
      favicon,
      logo,
      ...page,
      product,
    };
  });

  return c.json(data);
});

app.get("/page-data/by-domain/:domain", async (c) => {
  const db = new DB(c.env);
  const data = await db.getPage(c.req.param("domain"));
  if (!data) throw new HTTPException(404);

  return c.json({ pathname: data.pathname });
});

export default app;
