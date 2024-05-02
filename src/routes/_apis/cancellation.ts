import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { Logiless } from "../../libs/logiless";
import { Shopify } from "../../libs/shopify";

type Env = {
  Bindings: Bindings;
};

const app = new Hono<Env>();

app.get("/cancelable", async (c) => {
  const id = c.req.query("id");
  if (!id) return c.text("Missing id", 400);

  const shopify = new Shopify(c.env);
  try {
    const cancelable = await shopify.getCancelable(id);
    if (!cancelable.isCancelable) return c.json(cancelable);
  } catch (e) {
    return c.text("Not found", 404);
  }

  const logiless = new Logiless(c.env);
  const code = (await shopify.getOrder(id)).name.replace(/^#/, "");

  try {
    const cancelable = await logiless.getCancelable(code);
    return c.json(cancelable);
  } catch (e) {
    return c.text("Not found", 404);
  }
});

export default app;
