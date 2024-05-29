import { Kiribi } from "kiribi";
import { client } from "kiribi/client";
import { rest } from "kiribi/rest";
import { inlineCode, SlackNotifier } from "../libs/slack";
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

type Performers = {
  Cancel: Cancel;
  ProductSync: ProductSync;
  CompleteOrder: CompleteOrder;
  TransactionMailSend: TransactionMailSend;
  PurchaseMeasurementProtocol: PurchaseMeasurementProtocol;
  CMSChecker: CMSChecker;
  SyncShopifyOrderToBigQuery: SyncShopifyOrderToBigQuery;
  UpdateOrderInventory: UpdateOrderInventory;
};
type BindingKeys = keyof Performers;

export default class extends Kiribi<Performers, Bindings> {
  client = client;
  rest = rest;

  async scheduled({ cron }: ScheduledEvent) {
    // every day at 00:00
    if (cron === "0 0 * * *") {
      // Sweep jobs older than 3 days with statuses COMPLETED, CANCELLED
      await this.sweep({ olderThan: 1000 * 60 * 60 * 24 * 3 });
    }

    // every hour at 5 minutes (毎時00分のCloud Run側のJOBが終わる頃を狙って実行する)
    if (cron === "5 * * * *") {
      // Check CMS
      await this.enqueue("CMSChecker", {}, { maxRetries: 1 });
    }

    // every 10 minutes
    if (cron === "*/10 * * * *") {
      // re-enqueue zombie jobs
      await this.recover();
    }
  }

  async onSuccess(binding: BindingKeys, payload: any) {
    if (
      [
        "ProductSync",
        "CompleteOrder",
        "CMSChecker",
        "PurchaseMeasurementProtocol",
        "SyncShopifyOrderToBigQuery",
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
      ],
    });
    await slack.notify(`Successfully`);
  }

  async onFailure(binding: BindingKeys, payload: any, error: Error) {
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
      ],
    });

    await slack.notify(`Failed`);
  }
}
