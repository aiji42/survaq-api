import { Hono } from "hono";
import { Layout } from "./Layout";

const app = new Hono<{ Bindings: { DEV?: string } }>();

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

export default app;
