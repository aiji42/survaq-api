import { Hono } from "hono";
import { serveStatic } from "hono/cloudflare-workers";
import { cors } from "hono/cors";
import {
  logiless,
  products,
  webhook,
  cancellation,
  schedule,
  amazonAds,
  oauth,
  rakuten,
} from "../routes/_apis";
import sandbox from "../routes/sandbox";
import portal from "../routes/portal";
import manifest from "__STATIC_CONTENT_MANIFEST";

const app = new Hono();

app.use("*", cors({ origin: "*", maxAge: 600 }));

// MEMO: URLの移管に伴い恒久的リダイレクト
// FIXME: ある程度時間がたったら削除する
app.use("/status/data", async (c) => {
  return c.redirect("/portal/status", 301);
});

app.get("/static/*", serveStatic({ root: "./", manifest }));

app.route("/products", products);
app.route("/webhook", webhook);
app.route("/logiless", logiless);
app.route("/cancellation", cancellation);
app.route("/schedule", schedule);
app.route("/amazon-ads", amazonAds);
app.route("/rakuten", rakuten);
app.route("/oauth", oauth);

app.route("/portal", portal);

app.route("/sandbox", sandbox);

export default app;
