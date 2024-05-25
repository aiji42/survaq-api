import { Hono } from "hono";
import { Layout } from "../../components/Layout";
import { ShopifyOrderSyncBQ } from "../../libs/models/shopify/ShopifyOrderSyncBQ";
import { Bindings } from "../../../bindings";

const app = new Hono<{ Bindings: Bindings & { DEV?: string } }>();

app.get("/delivery-schedules", (c) => {
  return c.html(
    <Layout isDev={!!c.env.DEV}>
      <survaq-delivery-schedule productId="8719571812557" />
      <survaq-delivery-schedule productId="8719571812557" delayedOnly />
      <survaq-delivery-schedule productId="7266231288013" />
      <survaq-delivery-schedule productId="7266231288013" delayedOnly />
      <survaq-delivery-schedule productId="8719571812557a" />
    </Layout>,
  );
});

app.get("/delivery-schedules/:id", (c) => {
  const id = c.req.param("id");
  return c.html(
    <Layout isDev={!!c.env.DEV}>
      <survaq-delivery-schedule productId={id} />
      <survaq-delivery-schedule productId={id} delayedOnly />
    </Layout>,
  );
});

app.get("/orders/cancel", (c) => {
  return c.html(
    <Layout isDev={!!c.env.DEV}>
      <div className="border rounded-md w-full p-4 my-3">
        <survaq-order-cancel orderId={5946083901645} />
      </div>
    </Layout>,
  );
});

app.get("/orders/schedule", (c) => {
  const id = c.req.param("id");
  return c.html(
    <Layout isDev={!!c.env.DEV}>
      <div className="border rounded-md w-full p-4 my-3">
        <survaq-delivery-schedule-order orderId="5946083901645" />
      </div>
    </Layout>,
  );
});

app.get("/orders/:id", (c) => {
  const id = c.req.param("id");
  return c.html(
    <Layout isDev={!!c.env.DEV}>
      <div className="border rounded-md w-full p-4 my-3">
        <survaq-delivery-schedule-order orderId={id} />
      </div>
      <div className="border rounded-md w-full p-4 my-3">
        <survaq-order-cancel orderId={id} />
      </div>
    </Layout>,
  );
});

app.get("/orders/:id/schedule", (c) => {
  const id = c.req.param("id");
  return c.html(
    <Layout isDev={!!c.env.DEV}>
      <div className="border rounded-md w-full p-4 my-3">
        <survaq-delivery-schedule-order orderId={id} />
      </div>
    </Layout>,
  );
});

app.get("/orders/:id/cancel", (c) => {
  const id = c.req.param("id");
  return c.html(
    <Layout isDev={!!c.env.DEV}>
      <div className="border rounded-md w-full p-4 my-3">
        <survaq-order-cancel orderId={id} />
      </div>
    </Layout>,
  );
});

// TODO: 過去のデータをサンプリングし、実際のBQの保存値と比較してテストする
app.get("/shopify/:id", async (c) => {
  const id = c.req.param("id");
  const order = new ShopifyOrderSyncBQ(c.env);
  await order.prepare(id);

  return c.json({
    order: order.createBQOrdersTableData(),
    lineItems: order.createBQLineItemsTableData(),
    orderSKUs: order.createBQOrderSKUsTableData(),
  });
});

export default app;
