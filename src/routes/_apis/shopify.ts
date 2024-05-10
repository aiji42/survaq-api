import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { ShopifyOrderForNoteAttrs } from "../../libs/models/shopify/ShopifyOrderForNoteAttrs";
import { SlackNotifier } from "../../libs/slack";
import { ShopifyProduct } from "../../types/shopify";
import { ShopifyOrderMailSender } from "../../libs/sendgrid";

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
  const order = new ShopifyOrderForNoteAttrs(c.env);
  const notifier = c.get("notifier");
  const mailer = new ShopifyOrderMailSender(c.env, order);

  order.setOrder(await c.req.json<ShopifyOrderForNoteAttrs["order"]>());

  c.set("label", `${c.get("topic")}: ${order.numericId}`);
  console.log(c.get("label"));

  // line_items/note_attributes及びDBからSKU情報を補完
  await order.completeLineItem();
  // note_attributes及びSKU情報から配送スケジュール情報を補完
  await order.completeDeliverySchedule();

  // 配送スケージュールのメールを送信
  if (order.shouldSendDeliveryScheduleNotification)
    await blockReRun(`notifyDeliverySchedule-${order.numericId}`, c.env.CACHE, () => {
      console.log(`send delivery schedule mail: ${order.completedDeliverySchedule.estimate}`);
      return mailer.notifyDeliverySchedule(order.completedDeliverySchedule.estimate);
    });

  if (order.shouldUpdateNoteAttributes) {
    // SKU情報が不足している場合にSlack通知
    if (!order.isCompletedSku) notifier.appendNotConnectedSkuOrder(order, "notify-order");
    console.log("update note attributes");
    const res = await order.updateNoteAttributes().catch(notifier.appendErrorMessage);
    if (res) await notifier.appendErrorResponse(res);
  }

  return c.json({ message: "update order" });
});

/**
 * 60秒間同一キーのコールバックの実行を抑制する(メールが二重に送られないようにするとか)
 * KVの仕様上expirationTtlを60秒未満にできない
 */
const blockReRun = async (key: string, kv: KVNamespace, callback: () => Promise<unknown>) => {
  if (await kv.get(key)) return;
  await kv.put(key, "processing", { expirationTtl: 60 });
  await callback();
};

export default app;
