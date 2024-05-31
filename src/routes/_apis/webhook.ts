import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { ShopifyOrderData, ShopifyProductData } from "../../types/shopify";
import { blockReRun, makeNotifiableErrorHandler } from "../../libs/utils";

type Variables = { topic: string };

type Env = { Bindings: Bindings; Variables: Variables };

const app = new Hono<Env>();

app.use("*", async (c, next) => {
  c.set("topic", c.req.header("x-shopify-topic") ?? "unknown");

  await next();
});

app.onError(
  makeNotifiableErrorHandler({
    alwaysReturn: (c) => c.text("webhook received"),
  }),
);

app.post("/product", async (c) => {
  const data = await c.req.json<ShopifyProductData>();

  // MEMO: shopify上で、productが更新されるときは大抵webhookが複数同時に起動するため、いくつかの対策を行っている
  // - Queueの実行を60秒後に遅らせる & 60秒間は重複エンキューを禁止
  await blockReRun(`ProductSync-${data.id}`, c.env.CACHE, async () => {
    await c.env.KIRIBI.enqueue(
      "ProductSync",
      { productId: data.id },
      { maxRetries: 1, firstDelay: 60 },
    );
  });

  return c.json({ message: "enqueue ProductSync" });
});

app.post("/order", async (c) => {
  const data = await c.req.json<ShopifyOrderData>();

  // MEMO: shopify上で、orderが生成された時点で複数のwebhookが同時に起動するためいくつかの対策を行っている
  // - firstDelayでタイミングを遅らせる(30秒+キューのデフォルトの待ち秒数(最大10秒))ことで、他のwebhook終わってから処理を開始する
  // - blockReRunで90秒間重複実行を防ぐことで、この処理で発生したupdateによるwebhookを無視する
  //    (※おおよそ60秒間程度(90s-30s)は、本来必要なエンキューも弾かれてしまうので注意)
  // - payloadにidだけを渡して、タスク側で最新の情報を取得してから処理するようにする
  await blockReRun(
    `CompleteOrder-${data.id}`,
    c.env.CACHE,
    async () => {
      await c.env.KIRIBI.enqueue(
        "CompleteOrder",
        { orderId: data.id },
        { maxRetries: 1, firstDelay: 30 },
      );
    },
    { boundarySeconds: 90 },
  );

  // MEMO: 注文が作成された時点で、Google AnalyticsのPurchase Measurement Protocolを送信する(サテライトサイト連携用)
  if (c.get("topic") === "orders/create") {
    await c.env.KIRIBI.enqueue(
      "PurchaseMeasurementProtocol",
      { orderId: data.id },
      { maxRetries: 1 },
    );
  }

  return c.json({ message: "enqueue CompleteOrder" });
});

type TransactionMailPayload =
  | {
      event: "items.create";
      collection: "TransactionMails";
      key: number;
    }
  | {
      event: "items.update";
      collection: "TransactionMails";
      keys: string[];
    };

app.post("transaction-mail", async (c) => {
  const body = await c.req.json<TransactionMailPayload>();

  const key = "key" in body ? body.key : Number(body.keys[0]);
  await c.env.KIRIBI.enqueue("TransactionMailSend", { id: key }, { maxRetries: 1 });

  return c.text("webhook received");
});

export default app;
