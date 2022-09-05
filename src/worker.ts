import { Hono } from "hono";
import { cors } from "hono/cors";
import { Bindings } from "../bindings";
import { makeSchedule } from "../libs/makeSchedule";

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
  const req = await fetch(new Request(url.toString(), c.req), {
    cf: {
      cacheTtlByStatus: { "200-299": 3600, 404: 1, "500-599": 0 },
      cacheEverything: true,
      cacheKey: c.req.url,
    },
  });

  if (req.status >= 200 && req.status < 300) {
    const product = await req.json<ProductOnMicroCMS>();
    return c.json({
      ...product,
      rule: {
        ...product.rule,
        schedule: makeSchedule(product.rule),
      },
    });
  }

  return req;
});

export default app;
