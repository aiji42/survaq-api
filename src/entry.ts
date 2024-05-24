import { Hono } from "hono";
import { serveStatic } from "hono/cloudflare-workers";
import { cors } from "hono/cors";
import { logiless, products, webhook, cancellation, schedule } from "./routes/_apis";
import sandbox from "./routes/sandbox";
import status from "./routes/status";
import manifest from "__STATIC_CONTENT_MANIFEST";

const app = new Hono();

app.use("*", cors({ origin: "*", maxAge: 600 }));

app.get("/static/*", serveStatic({ root: "./", manifest }));

app.route("/products", products);
app.route("/webhook", webhook);
app.route("/logiless", logiless);
app.route("/cancellation", cancellation);
app.route("/schedule", schedule);

app.route("/status", status);

app.route("/sandbox", sandbox);

export default app;
