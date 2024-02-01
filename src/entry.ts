import { Hono } from "hono";
import { serveStatic } from "hono/cloudflare-workers";
import { cors } from "hono/cors";
import { cms, products, shopify } from "./routes/_apis";
import { wcPreview } from "./routes/sandobox";

const app = new Hono();

app.use("*", cors({ origin: "*", maxAge: 600 }));

app.get("/static/*", serveStatic({ root: "./" }));

app.route("/products", products);
app.route("/shopify", shopify);
app.route("/cms", cms);

app.route("/sandbox", wcPreview);

export default app;
