import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { ShopifyOrderDeliverySchedule } from "../../libs/models/shopify/ShopifyOrderDeliverySchedule";
import { SlackNotifier } from "../../libs/slack";
import { HTTPException } from "hono/http-exception";
import { makeNotifiableErrorHandler } from "../../libs/utils";

type Env = { Bindings: Bindings; Variables: { notifier: SlackNotifier; label: string } };

const app = new Hono<Env>();

app.onError(makeNotifiableErrorHandler());

const route = app.get("/:id", async (c) => {
  const id = c.req.param("id");
  c.set("label", `Schedule API for Shopify orderId: ${id}`);

  // TODO: このAPIはレスポンスが遅いので、キャッシュしてもよいかもしれない

  const order = new ShopifyOrderDeliverySchedule(c.env);
  await order.setOrderById(id, false);
  if (!order.isOrderSet) throw new HTTPException(404);

  try {
    const res = await order.getSchedule();
    if (res) return c.json(res);
  } catch (e) {
    c.get("notifier").appendErrorMessage(e);
  }

  throw new HTTPException(404);
});

export type ScheduleRoute = typeof route;

export default app;
