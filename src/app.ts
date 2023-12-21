import { Locale } from "../libs/makeSchedule";
import { Client } from "./db";
import { Hono } from "hono";
import { Bindings } from "../bindings";
import { serveStatic } from "hono/cloudflare-workers";
import { cors } from "hono/cors";
import { timing } from "hono/timing";

type Variables = {
  locale: Locale;
  client: Client;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", cors({ origin: "*", maxAge: 600 }));
app.use("*", timing());

app.get("/static/*", serveStatic({ root: "./" }));

export default app;
