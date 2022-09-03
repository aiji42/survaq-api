import { Hono } from "hono";
import { Bindings } from "../bindings";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/products/:id", async (c) => {
  const product = await c.env.PRODUCT.get<ProductOnMicroCMS>(
    c.req.param("id"),
    "json"
  );

  return c.json(product);
});

app.post("/products/:id", async (c) => {
  await c.env.PRODUCT.put(
    c.req.param("id"),
    JSON.stringify(await c.req.json())
  );

  return c.json({ succeed: true });
});

export default app;
