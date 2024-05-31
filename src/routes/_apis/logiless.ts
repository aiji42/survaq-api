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
  return new Response("", {
    status: 302,
    headers: {
      Location: `https://app2.logiless.com/oauth/v2/auth?client_id=${c.env.LOGILESS_CLIENT_ID}&response_type=code&redirect_uri=${c.env.LOGILESS_REDIRECT_URI}`,
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

app.get("/token/show", async (c) => {
  const url = new URL(c.req.url);
  if (url.hostname !== "localhost") return c.text("Not allowed", 403);

  const logiless = new LogilessClient(c.env);
  const tokens = await logiless.getTokens();

  return c.json(tokens);
});

export default app;
