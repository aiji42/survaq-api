import { FailureHandlerMeta, Kiribi } from "kiribi";
import { client } from "kiribi/client";
import { rest } from "kiribi/rest";
import { inlineCode, SlackNotifier } from "../libs/models/slack/SlackNotifier";
import { Bindings } from "../../bindings";
import { Cancel } from "./Cancel";
export { Cancel } from "./Cancel";
import { ProductSync } from "./ProductSync";
export { ProductSync } from "./ProductSync";
import { CompleteOrder } from "./CompleteOrder";
export { CompleteOrder } from "./CompleteOrder";
import { TransactionMailSend } from "./TransactionMailSend";
export { TransactionMailSend } from "./TransactionMailSend";
import { PurchaseMeasurementProtocol } from "./PurchaseMeasurementProtocol";
export { PurchaseMeasurementProtocol } from "./PurchaseMeasurementProtocol";
import { CMSChecker } from "./CMSChecker";
export { CMSChecker } from "./CMSChecker";
import { SyncShopifyOrderToBigQuery } from "./SyncShopifyOrderToBigQuery";
export { SyncShopifyOrderToBigQuery } from "./SyncShopifyOrderToBigQuery";
import { UpdateOrderInventory } from "./UpdateOrderInventory";
export { UpdateOrderInventory } from "./UpdateOrderInventory";
import { UpdateSkuOnFulfillment } from "./UpdateSkuOnFulfillment";
export { UpdateSkuOnFulfillment } from "./UpdateSkuOnFulfillment";
import { NotifyToSlack } from "./NotifyToSlack";
export { NotifyToSlack } from "./NotifyToSlack";
import { TokensHealthCheck } from "./TokensHealthCheck";
export { TokensHealthCheck } from "./TokensHealthCheck";
import { SyncRakutenOrderToBigQuery } from "./SyncRakutenOrderToBigQuery";
export { SyncRakutenOrderToBigQuery } from "./SyncRakutenOrderToBigQuery";

type Performers = {
  Cancel: Cancel;
  ProductSync: ProductSync;
  CompleteOrder: CompleteOrder;
  TransactionMailSend: TransactionMailSend;
  PurchaseMeasurementProtocol: PurchaseMeasurementProtocol;
  CMSChecker: CMSChecker;
  SyncShopifyOrderToBigQuery: SyncShopifyOrderToBigQuery;
  UpdateOrderInventory: UpdateOrderInventory;
  UpdateSkuOnFulfillment: UpdateSkuOnFulfillment;
  NotifyToSlack: NotifyToSlack;
  TokensHealthCheck: TokensHealthCheck;
  SyncRakutenOrderToBigQuery: SyncRakutenOrderToBigQuery;
};
type BindingKeys = keyof Performers;

export default class extends Kiribi<Performers, Bindings> {
  client = client;
  rest = rest;

  async scheduled({ cron }: ScheduledEvent) {
    // every day at 00:00(UTC) => 09:00(JST)
    if (cron === "0 0 * * *") {
      // Sweep jobs older than 3 days with statuses COMPLETED, CANCELLED
      await this.sweep({ olderThan: 1000 * 60 * 60 * 24 * 3 });

      // 各種トークンの有効期限をチェック
      await this.enqueue("TokensHealthCheck", {});
    }

    // every hour at 5 minutes (毎時00分のCloud Run側のJOBが終わる頃を狙って実行する)
    if (cron === "5 * * * *") {
      // Check CMS
      await this.enqueue("CMSChecker", {});
    }

    // every hour at 55 minutes
    if (cron === "55 * * * *") {
      // UpdateSkuOnFulfillment
      // TODO: 適切な時間に実行されるように変更(UpdateOrderInventory)との競合も注意する
      // あと時差にも注意
      await this.enqueue("UpdateSkuOnFulfillment", {}, { maxRetries: 1 });
    }

    // every 10 minutes
    if (cron === "*/10 * * * *") {
      // re-enqueue zombie jobs
      await this.recover();

      const retryStrategy = { maxRetries: 2, retryDelay: 120 };
      const min = new Date().getMinutes();
      // 00-09分、30-39分ならRakutenの新規の注文情報をBigQueryに同期する
      if ((min >= 0 && min < 10) || (min >= 30 && min < 40))
        await this.enqueue("SyncRakutenOrderToBigQuery", { type: "orderedAt" }, retryStrategy);
      // 10-19分、40-49分ならRakutenの発送済みの注文情報をBigQueryに同期する
      if ((min >= 10 && min < 20) || (min >= 40 && min < 50))
        await this.enqueue("SyncRakutenOrderToBigQuery", { type: "fulfilledAt" }, retryStrategy);
      // 20-29分、50-59分ならRakutenのキャンセル済みの注文情報をBigQueryに同期する
      if ((min >= 20 && min < 30) || (min >= 50 && min < 60))
        await this.enqueue("SyncRakutenOrderToBigQuery", { type: "cancelledAt" }, retryStrategy);
    }
  }

  async onSuccess(binding: BindingKeys, payload: any, result: any) {
    if (
      [
        "CMSChecker",
        "CompleteOrder",
        "NotifyToSlack",
        "ProductSync",
        "PurchaseMeasurementProtocol",
        "SyncRakutenOrderToBigQuery",
        "SyncShopifyOrderToBigQuery",
        "TokensHealthCheck",
        "UpdateOrderInventory",
      ].includes(binding) ||
      (binding === "UpdateSkuOnFulfillment" && !(Array.isArray(result) && result.length > 0))
    )
      return;
    const slack = new SlackNotifier(this.env);
    slack.append({
      color: "good",
      title: "Job",
      text: binding,
      fields: [
        {
          title: "payload",
          value: inlineCode(JSON.stringify(payload)),
        },
        ...(result
          ? [
              {
                title: "result",
                // FIXME: なぜかcodeBlockだとうまく表示されない(attachmentだと起きるようなのでblockに変更)
                value: inlineCode(JSON.stringify(result)),
              },
            ]
          : []),
      ],
    });
    await slack.notify(`Successfully`);
  }

  async onFailure(binding: BindingKeys, payload: any, error: Error, meta: FailureHandlerMeta) {
    // SyncShopifyOrderToBigQueryはToo many DML statements outstanding against tableが発生することがよくあるので、最終リトライ時のみ通知する
    if (binding === "SyncShopifyOrderToBigQuery" && !meta.isFinal) return;

    const slack = new SlackNotifier(this.env);
    slack.appendErrorMessage(error);
    slack.append({
      color: "danger",
      title: "Job",
      text: binding,
      fields: [
        {
          title: "payload",
          value: inlineCode(JSON.stringify(payload)),
        },
        {
          title: "attempt",
          value: `${meta.attempts.toString()}${meta.isFinal ? " (final)" : ""}`,
        },
      ],
    });

    await slack.notify(`Failed`);
  }
}
