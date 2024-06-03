import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { LogilessClient } from "../../libs/models/logiless/LogilessClient";
import { makeNotifiableErrorHandler } from "../../libs/utils";

type Env = {
  Bindings: Bindings;
};

const app = new Hono<Env>();

app.onError(makeNotifiableErrorHandler());

app.get("/login", async (c) => {
  const logiless = new LogilessClient(c.env);
  return new Response("", {
    status: 302,
    headers: {
      Location: logiless.loginUrl,
    },
  });
});

app.get("/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.text("Missing code", 400);

  const logiless = new LogilessClient(c.env);
  await logiless.loginCallback(code);

  return c.text("Logged in");
});

export default app;
