// FIXME: /shopifyでは名前が広すぎるので、webhookとわかる名前に変更
import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { ShopifyOrderForNoteAttrs } from "../../libs/models/shopify/ShopifyOrderForNoteAttrs";
import { SlackNotifier } from "../../libs/slack";
import { ShopifyProduct } from "../../types/shopify";
import { blockReRun } from "../../libs/utils";

type Variables = { label: string; topic: string; notifier: SlackNotifier };

type Env = { Bindings: Bindings; Variables: Variables };

const app = new Hono<Env>();

app.use("*", async (c, next) => {
  c.set("topic", c.req.header("x-shopify-topic") ?? "unknown");
  const notifier = new SlackNotifier(c.env);
  c.set("notifier", notifier);

  await next();

  c.executionCtx.waitUntil(notifier.notify(c.get("label") ?? c.get("topic")));
});

app.onError(async (err, c) => {
  c.get("notifier").appendErrorMessage(err);

  return c.text("webhook received");
});

app.post("/product", async (c) => {
  const data = await c.req.json<ShopifyProduct>();
  c.set("label", `${c.get("topic")}: ${data.id}, ${data.handle}, ${data.status}`);
  console.log(c.get("label"));

  // キューにいれるにはbody_htmlが大きすぎるので削除
  delete data.body_html;

  await c.env.KIRIBI.enqueue("ProductSync", data, { maxRetries: 1 });

  return c.json({ message: "enqueue ProductSync" });
});

app.post("/order", async (c) => {
  const data = await c.req.json<ShopifyOrderForNoteAttrs["order"]>();
  c.set("label", `${c.get("topic")}: ${data.id}`);
  console.log(c.get("label"));

  // MEMO: shopify上で、orderが生成された時点で複数のwebhookが同時に起動するためいくつかの対策を行っている
  // - firstDelayでタイミングを遅らせる(20秒+キューのデフォルトの待ち秒数(最大10秒))ことで、他のwebhook終わってから処理を開始する
  // - blockReRunで60秒間重複実行を防ぐことで、この処理で発生したupdateによるwebhookを無視する
  // - payloadにidだけを渡して、タスク側で最新の情報を取得してから処理するようにする
  await blockReRun(`CompleteOrder-${data.id}`, c.env.CACHE, async () => {
    await c.env.KIRIBI.enqueue(
      "CompleteOrder",
      { orderId: data.id },
      { maxRetries: 1, firstDelay: 20 },
    );
  });

  return c.json({ message: "enqueue CompleteOrder" });
});

export default app;
