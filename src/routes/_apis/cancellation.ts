import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Bindings } from "../../../bindings";
import { Logiless } from "../../libs/logiless";
import { Shopify } from "../../libs/shopify";
import { DB } from "../../libs/db";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ShopifyOrderMailSender } from "../../libs/sendgrid";

type Env = {
  Bindings: Bindings;
};

const app = new Hono<Env>();

app.get("/cancelable", async (c) => {
  const id = c.req.query("id");
  if (!id) return c.text("Missing id", 400);

  const shopify = new Shopify(c.env);
  try {
    const cancelable = await shopify.getCancelable(id);
    if (!cancelable.isCancelable) return c.json(cancelable);
  } catch (e) {
    return c.text("Not found", 404);
  }

  const logiless = new Logiless(c.env);
  try {
    const cancelable = await logiless.getCancelable((await shopify.getOrder(id)).name);
    return c.json(cancelable);
  } catch (e) {
    return c.text("Not found", 404);
  }
});

app.post(
  "/cancel",
  // TODO: reasonの最小文字数を協議
  zValidator("json", z.object({ id: z.string(), reason: z.string().trim().min(1) })),
  async (c) => {
    const { id, reason } = c.req.valid("json");

    const shopify = new Shopify(c.env);
    try {
      const cancelable = await shopify.getCancelable(id);
      if (!cancelable.isCancelable) return c.text(`Not cancelable (${cancelable.reason})`, 400);
    } catch (e) {
      return c.text("Not found", 404);
    }

    const logiless = new Logiless(c.env);
    try {
      const cancelable = await logiless.getCancelable((await shopify.getOrder(id)).name);
      if (!cancelable.isCancelable) return c.text(`Not cancelable (${cancelable.reason})`, 400);
    } catch (e) {
      return c.text("Not found", 404);
    }

    const db = new DB(c.env);
    const res = await db.useTransaction(async (tdb) => {
      const existingRequest = await tdb.getCancelRequestByOrderKey(id);
      if (existingRequest) throw new HTTPException(400, { message: "Already requested" });

      return tdb.createCancelRequest({
        orderKey: id,
        status: "Pending",
        store: "Shopify",
        reason,
      });
    });

    // MEMO: 失敗しても自動リトライはさせない
    // MEMO: キャンセルリクエスト受付メールの送信完了を考慮するため実行遅延(30s)させる
    await c.env.KIRIBI.enqueue("Cancel", { requestId: res.id }, { maxRetries: 1, firstDelay: 30 });

    // MEMO: キャンセルリクエスト受付メールを送信(日本語・English)
    await new ShopifyOrderMailSender(
      c.env,
      await shopify.getOrder(id),
    ).notifyCancelRequestReceived();

    return c.json(res);
  },
);

app.delete("/cancel/:id", async (c) => {
  // localhostでのみ有効にする
  if (!c.req.url.startsWith("http://localhost")) return c.text("Not found", 404);

  const db = new DB(c.env);
  const id = c.req.param("id");

  await db.deleteCancelRequest(Number(id));

  return c.json({ message: "Cancel request deleted" });
});

export default app;
