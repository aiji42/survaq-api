import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { ShopifyOrderDeliverySchedule } from "../../libs/models/shopify/ShopifyOrderDeliverySchedule";
import { HTTPException } from "hono/http-exception";
import { makeNotifiableErrorHandler } from "../../libs/utils";
import { timeout } from "hono/timeout";

type Env = { Bindings: Bindings };

const app = new Hono<Env>();

app.use("*", timeout(15000));

app.onError(makeNotifiableErrorHandler());

const route = app.get("/:id", async (c) => {
  const id = c.req.param("id");

  const order = new ShopifyOrderDeliverySchedule(c.env);
  await order.setOrderById(id);

  const res = await order.getSchedule();
  if (!res) throw new HTTPException(404);

  return c.json(res);
});

export type ScheduleRoute = typeof route;

export default app;
