import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { ShopifyOrderDeliverySchedule } from "../../libs/models/shopify/ShopifyOrderDeliverySchedule";
import { SlackNotifier } from "../../libs/slack";

type Env = { Bindings: Bindings; Variables: { notifier: SlackNotifier; label: string } };

const app = new Hono<Env>();

app.use("*", async (c, next) => {
  const notifier = new SlackNotifier(c.env);
  c.set("label", c.req.url);
  c.set("notifier", notifier);

  await next();

  c.executionCtx.waitUntil(notifier.notify(c.get("label")));
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  c.set("label", `Schedule API for Shopify orderId: ${id}`);

  // TODO: このAPIはレスポンスが遅いので、キャッシュしてもよいかもしれない

  const order = new ShopifyOrderDeliverySchedule(c.env);
  await order.setOrderById(id, false);
  if (!order.isOrderSet) return c.notFound();

  try {
    const res = await order.getSchedule();
    return res ? c.json(res) : c.notFound();
  } catch (e) {
    c.get("notifier").appendErrorMessage(e);
  }

  return c.notFound();
});

export default app;
