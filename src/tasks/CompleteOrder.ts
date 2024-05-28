import { Bindings } from "../../bindings";
import { KiribiPerformer } from "kiribi/performer";
import { DB } from "../libs/db";
import { ShopifyOrderMailSender } from "../libs/sendgrid";
import { ShopifyOrderForNoteAttrs } from "../libs/models/shopify/ShopifyOrderForNoteAttrs";
import { blockReRun } from "../libs/utils";
import { SlackNotifier } from "../libs/slack";

export class CompleteOrder extends KiribiPerformer<{ orderId: number }, void, Bindings> {
  db: DB;
  kv: KVNamespace;
  order: ShopifyOrderForNoteAttrs;
  mailer: ShopifyOrderMailSender;
  slack: SlackNotifier;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.db = new DB(env);
    this.kv = env.CACHE;
    this.order = new ShopifyOrderForNoteAttrs(env);
    this.mailer = new ShopifyOrderMailSender(env, this.order);
    this.slack = new SlackNotifier(env);
  }

  async perform(data: { orderId: number }) {
    await this.order.setOrderById(data.orderId);

    // line_items/note_attributes及びDBからSKU情報を補完
    await this.order.completeLineItem();
    // note_attributes及びSKU情報から配送スケジュール情報を補完
    await this.order.completeDeliverySchedule();

    // 配送スケージュールのメールを送信
    if (this.order.shouldSendDeliveryScheduleNotification)
      // 重複配送を防ぐため、blockReRunを利用(120秒間は再実行させない)
      await blockReRun(
        `notifyDeliverySchedule-${this.order.numericId}`,
        this.kv,
        () => {
          console.log(
            `send delivery schedule mail: ${this.order.completedDeliverySchedule.estimate}`,
          );
          return this.mailer.notifyDeliverySchedule(this.order.completedDeliverySchedule.estimate);
        },
        { boundarySeconds: 120 },
      );

    if (this.order.shouldUpdateNoteAttributes) {
      console.log("update note attributes");
      await this.order.updateNoteAttributes();

      // SKU情報が不足している場合にSlack通知
      if (!this.order.isCompletedSku) await this.sendNotConnectedSkuOrder();
    }

    // BigQueryへ注文データを同期する
    // 最大1回のリトライを許容し、リトライの際には120秒待機
    // await this.env.KIRIBI.enqueue('SyncShopifyOrderToBigQuery', data, { maxRetries: 2, retryDelay: 120 });
  }

  async sendNotConnectedSkuOrder() {
    this.slack.append(
      {
        title: `注文番号 ${this.order.code}`,
        title_link: `https://survaq.myshopify.com/admin/orders/${this.order.numericId}`,
        color: "danger",
        pretext: "SKU情報の無い注文が処理されています。",
        fields: [
          {
            title: "購入日時(UTC)",
            value: this.order.createdAt.toISOString(),
          },
        ],
      },
      "notify-order",
    );

    await this.slack.notify("CompleteOrder task");
  }
}
