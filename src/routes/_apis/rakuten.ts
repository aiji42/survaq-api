import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { makeNotifiableErrorHandler } from "../../libs/utils";
import { zValidator } from "@hono/zod-validator";
import {
  importableDataSchema,
  RakutenAdPerformanceSync,
} from "../../libs/models/rakuten/RakutenAdPerformanceSync";

type Env = { Bindings: Bindings };

const app = new Hono<Env>();

app.onError(makeNotifiableErrorHandler());

const adsImportRoute = app.post(
  "/ads/import",
  zValidator("json", importableDataSchema),
  async (c) => {
    const data = c.req.valid("json");
    const rakutenAdPerformanceSync = new RakutenAdPerformanceSync(c.env);

    await rakutenAdPerformanceSync.syncToBigQuery(data);

    return c.json({ ok: true });
  },
);

export type AdsImportRoute = typeof adsImportRoute;

export default app;
