import { Hono } from "hono";
import { serveStatic } from "hono/cloudflare-workers";
import { cors } from "hono/cors";
import { timing } from "hono/timing";
import { products, shopify } from "./routes/_apis";
import { wcPreview } from "./routes/sandobox";

const app = new Hono();

app.use("*", cors({ origin: "*", maxAge: 600 }));
app.use("*", timing());

app.get("/static/*", serveStatic({ root: "./" }));

app.route("/products", products);
app.route("/shopify", shopify);

app.route("/sandbox", wcPreview);

export default app;
