import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { makeNotifiableErrorHandler } from "../../libs/utils";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

type Env = { Bindings: Bindings };

const app = new Hono<Env>();

app.onError(makeNotifiableErrorHandler());

// FIXME: モデル作ったときにそっちに移動
const schema = z.array(
  z.object({
    date: z.string(),
    itemId: z.string(),
    clicks: z.number(),
    impressions: z.number(),
    cost: z.number(),
    ctr: z.number(),
    cpc: z.number(),
  }),
);

// FIXME: 実装
const adsImportRoute = app.post("/ads/import", zValidator("json", schema), async (c) => {
  const data = c.req.valid("json");
  console.log(data);

  await new Promise((resolve) => setTimeout(resolve, 3000));

  return c.json({ ok: true });
});

export type AdsImportRoute = typeof adsImportRoute;

export default app;
