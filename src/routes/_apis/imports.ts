import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { makeNotifiableErrorHandler } from "../../libs/utils";
import { zValidator } from "@hono/zod-validator";
import {
  importableDataSchema as rakutenImportableDataSchema,
  RakutenAdPerformanceSync,
} from "../../libs/models/rakuten/RakutenAdPerformanceSync";
import {
  importableDataSchema as smartShoppingImportableDataSchema,
  SmartShoppingPerformanceSync,
} from "../../libs/models/smart-shopping/SmartShoppingPerformanceSync";

type Env = { Bindings: Bindings };

const app = new Hono<Env>();

app.onError(makeNotifiableErrorHandler());

const adsImportRoute = app
  .post("/ads/rakuten", zValidator("json", rakutenImportableDataSchema), async (c) => {
    const data = c.req.valid("json");
    const rakutenAdPerformanceSync = new RakutenAdPerformanceSync(c.env);

    await rakutenAdPerformanceSync.syncToBigQuery(data);

    return c.json({ ok: true });
  })
  .post("/ads/smart-shopping", zValidator("json", smartShoppingImportableDataSchema), async (c) => {
    const data = c.req.valid("json");
    const smartShoppingPerformanceSync = new SmartShoppingPerformanceSync(c.env);

    await smartShoppingPerformanceSync.syncToBigQuery(data);

    return c.json({ ok: true });
  });

export type AdsImportRoute = typeof adsImportRoute;

export default app;
