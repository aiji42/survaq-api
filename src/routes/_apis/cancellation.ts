import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Bindings } from "../../../bindings";
import { LogilessSalesOrder } from "../../libs/models/logiless/LogilessSalesOrder";
import { ShopifyOrderForCancel } from "../../libs/models/shopify/ShopifyOrderForCancel";
import { DB } from "../../libs/db";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ShopifyOrderMailSender } from "../../libs/models/sendgrid/MailSender";
import { makeNotifiableErrorHandler } from "../../libs/utils";
import { timeout } from "hono/timeout";

type Env = {
  Bindings: Bindings;
};

const app = new Hono<Env>();

app.use("*", timeout(10000));

app.onError(makeNotifiableErrorHandler());

const cancellationRoute = app
  .get("/cancelable/:id", async (c) => {
    const id = c.req.param("id");

    const shopifyOrder = await new ShopifyOrderForCancel(c.env).setOrderById(id);
    if (!shopifyOrder.cancelable.isCancelable) return c.json(shopifyOrder.cancelable);

    const logiless = await new LogilessSalesOrder(c.env).setSalesOrderByShopifyOrder(shopifyOrder);
    if (!logiless.cancelable.isCancelable) return c.json(logiless.cancelable);

    const db = new DB(c.env);
    const existingRequest = await db.getCancelRequestByOrderKey(id);
    if (existingRequest) return c.json({ isCancelable: false, reason: "AlreadyRequested" });

    return c.json({ isCancelable: true } satisfies { isCancelable: true; reason?: never });
  })
  // FIXME: 本人しかキャンセルできないようにする
  .post(
    "/cancel",
    zValidator("json", z.object({ id: z.string(), reason: z.string().trim().min(10).max(500) })),
    async (c) => {
      const { id, reason } = c.req.valid("json");

      const shopifyOrder = await new ShopifyOrderForCancel(c.env).setOrderById(id);

      if (!shopifyOrder.cancelable.isCancelable)
        throw new HTTPException(400, {
          message: `Not cancelable (${shopifyOrder.cancelable.reason})`,
        });

      const logiless = await new LogilessSalesOrder(c.env).setSalesOrderByShopifyOrder(
        shopifyOrder,
      );

      if (!logiless.cancelable.isCancelable)
        throw new HTTPException(400, {
          message: `Not cancelable (${logiless.cancelable.reason})`,
        });

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
      await c.env.KIRIBI.enqueue(
        "Cancel",
        { requestId: res.id },
        { maxRetries: 1, firstDelay: 30 },
      );

      // MEMO: キャンセルリクエスト受付メールを送信(日本語・English)
      await new ShopifyOrderMailSender(c.env, shopifyOrder).notifyCancelRequestReceived();

      return c.json(res);
    },
  );

export type CancellationRoute = typeof cancellationRoute;

export default app;
