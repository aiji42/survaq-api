import { Hono } from "hono";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { googleAuth } from "@hono/oauth-providers/google";
import { Bindings } from "../../../bindings";

const app = new Hono<{ Bindings: Bindings }>();

app.get(
  "/login",
  googleAuth({
    scope: ["openid"],
    prompt: "select_account",
  }),
  async (c) => {
    const token = c.get("token");
    if (!token) return c.text("Failed to login", 401);

    setCookie(c, "Authorization", token.token, {
      maxAge: token.expires_in,
      path: "/",
      httpOnly: true,
      secure: !c.env.DEV,
      sameSite: "strict",
    });

    const redirect = getCookie(c, "redirect");
    deleteCookie(c, "redirect");

    return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="3;URL=${redirect}">
  <title>ログイン成功</title>
</head>
<body>ログインに成功しました。3秒後にリダイレクトします。</body>`);
  },
);

export default app;
