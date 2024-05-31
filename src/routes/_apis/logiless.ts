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
  const logiless = new LogilessClient(c.env);
  const tokens = await logiless.getTokens();
  await c.env.KIRIBI.enqueue("NotifyToSlack", {
    text: "Logilessのトークン情報",
    attachments: [
      {
        fields: [
          { title: "accessToken", value: tokens.accessToken },
          { title: "refreshToken", value: tokens.refreshToken },
          { title: "expireAt", value: tokens.expireAt.toISOString() },
          { title: "isExpired", value: tokens.isExpired.toString() },
        ],
      },
    ],
  });

  return c.json({ message: "See slack" });
});

export default app;
