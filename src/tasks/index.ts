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
import { SyncRakutenItem } from "./SyncRakutenItem";
export { SyncRakutenItem } from "./SyncRakutenItem";
import { SyncAmazonAdPerformanceToBigQuery } from "./SyncAmazonAdPerformanceToBigQuery";
export { SyncAmazonAdPerformanceToBigQuery } from "./SyncAmazonAdPerformanceToBigQuery";
import { SyncAmazonItemsToBigQuery } from "./SyncAmazonItemsToBigQuery";
export { SyncAmazonItemsToBigQuery } from "./SyncAmazonItemsToBigQuery";
import { SyncAmazonOrderToBigQuery } from "./SyncAmazonOrderToBigQuery";
export { SyncAmazonOrderToBigQuery } from "./SyncAmazonOrderToBigQuery";
import { SyncMerchantCenterToBigQuery } from "./SyncMerchantCenterToBigQuery";
export { SyncMerchantCenterToBigQuery } from "./SyncMerchantCenterToBigQuery";
import { SyncShopifyProductToBigQuery } from "./SyncShopifyProductToBigQuery";
export { SyncShopifyProductToBigQuery } from "./SyncShopifyProductToBigQuery";
import { SyncLatestShopifyProductGroupBigQuery } from "./SyncLatestShopifyProductGroupBigQuery";
export { SyncLatestShopifyProductGroupBigQuery } from "./SyncLatestShopifyProductGroupBigQuery";

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
  SyncRakutenItem: SyncRakutenItem;
  SyncAmazonAdPerformanceToBigQuery: SyncAmazonAdPerformanceToBigQuery;
  SyncAmazonItemsToBigQuery: SyncAmazonItemsToBigQuery;
  SyncAmazonOrderToBigQuery: SyncAmazonOrderToBigQuery;
  SyncMerchantCenterToBigQuery: SyncMerchantCenterToBigQuery;
  SyncShopifyProductToBigQuery: SyncShopifyProductToBigQuery;
  SyncLatestShopifyProductGroupBigQuery: SyncLatestShopifyProductGroupBigQuery;
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

    // every hour at 0 minutes
    if (cron === "0 * * * *") {
      // Rakutenの商品情報をBigQueryとCMSのDBに同期する
      await this.enqueue("SyncRakutenItem", {}, { maxRetries: 2, retryDelay: 120 });

      // Amazonの商品情報をBigQueryに同期する
      await this.enqueue("SyncAmazonItemsToBigQuery", { type: "CREATE_REPORT" }, { maxRetries: 1 });

      // MerchantCenter用のマッピングデータをBigQueryに同期する
      await this.enqueue("SyncMerchantCenterToBigQuery", {}, { maxRetries: 2 });

      // ProductGroupの最新情報をBigQueryのshopify.productsに同期する
      await this.enqueue("SyncLatestShopifyProductGroupBigQuery", {}, { maxRetries: 2 });
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
        await this.enqueue("SyncRakutenOrderToBigQuery", { type: "ORDERED_AT" }, retryStrategy);
      // 10-19分、40-49分ならRakutenの発送済みの注文情報をBigQueryに同期する
      if ((min >= 10 && min < 20) || (min >= 40 && min < 50))
        await this.enqueue("SyncRakutenOrderToBigQuery", { type: "FULFILLED_AT" }, retryStrategy);
      // 50-59分ならRakutenのキャンセル済みの注文情報をBigQueryに同期する
      if (min >= 50 && min < 60)
        await this.enqueue("SyncRakutenOrderToBigQuery", { type: "CANCELLED_AT" }, retryStrategy);
    }

    // every 30 minutes
    if (cron === "*/30 * * * *") {
      // Amazonの注文取り込み(前回取り込み以降で追加・変更があったものを取り込む)
      await this.enqueue("SyncAmazonOrderToBigQuery", {}, { maxRetries: 2, retryDelay: 120 });

      // Amazonの広告費取り込み
      // MEMO: こんな高頻度で実行しても意味はないが、トークンが1時間で切れてしまうので、高頻度で実行させて自動的にトークンをリフレッシュさせる
      await this.env.KIRIBI.enqueue("SyncAmazonAdPerformanceToBigQuery", { type: "CREATE_REPORT" });
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
        "SyncAmazonAdPerformanceToBigQuery",
        "SyncAmazonItemsToBigQuery",
        "SyncAmazonOrderToBigQuery",
        "SyncMerchantCenterToBigQuery",
        "SyncRakutenItem",
        "SyncRakutenOrderToBigQuery",
        "SyncShopifyOrderToBigQuery",
        "TokensHealthCheck",
        "UpdateOrderInventory",
        "UpdateSkuOnFulfillment",
      ].includes(binding)
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
