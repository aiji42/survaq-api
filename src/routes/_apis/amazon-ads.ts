import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { makeNotifiableErrorHandler } from "../../libs/utils";
import { AmazonAdsClient } from "../../libs/models/amazon/AmazonAdsClient";

type Env = {
  Bindings: Bindings;
};

const app = new Hono<Env>();

app.onError(makeNotifiableErrorHandler());

app.get("/login", async (c) => {
  const client = new AmazonAdsClient(c.env);
  return new Response("", {
    status: 302,
    headers: {
      Location: client.loginUrl,
    },
  });
});

app.get("/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.text("Missing code", 400);

  const client = new AmazonAdsClient(c.env);
  await client.loginCallback(code);

  return c.text("Logged in");
});

export default app;
