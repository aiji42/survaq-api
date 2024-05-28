import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";
import { ShopifyOrderForCancel } from "../libs/models/shopify/ShopifyOrderForCancel";
import { LogilessSalesOrder } from "../libs/models/logiless/LogilessSalesOrder";
import { MailSender, ShopifyOrderMailSender } from "../libs/sendgrid";
import { Logger } from "../libs/logger";
import { SlackNotifier } from "../libs/slack";

/**
 * キャンセルリクエストを処理し、ShopifyとLogilessの注文をキャンセルする
 */
export class Cancel extends KiribiPerformer<{ requestId: number }, void, Bindings> {
  db: DB;
  shopifyOrder: ShopifyOrderForCancel;
  logilessOrder: LogilessSalesOrder;
  mailSender: MailSender;
  shopifyOrderMailSender: ShopifyOrderMailSender;
  slack: SlackNotifier;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.db = new DB(env);
    this.shopifyOrder = new ShopifyOrderForCancel(env);
    this.logilessOrder = new LogilessSalesOrder(env);
    this.mailSender = new MailSender(env);
    this.shopifyOrderMailSender = new ShopifyOrderMailSender(env, this.shopifyOrder);
    this.slack = new SlackNotifier(env);
  }

  async perform({ requestId }: { requestId: number }) {
    const request = await this.db.getCancelRequest(requestId);
    if (request.status !== "Pending") throw new Error("Request is not pending");
    if (request.store !== "Shopify") throw new Error("Unsupported store: " + request.store);

    const log = new Logger();

    log.push("Began!");

    let success = false;
    try {
      log.push(`Fetching Shopify order: ${request.orderKey}`);
      await this.shopifyOrder.setOrderById(request.orderKey);
      log.push(`Fetching Logiless sales order: ${this.shopifyOrder.code}`);
      await this.logilessOrder.setSalesOrderByShopifyOrder(this.shopifyOrder);

      // ロジレス上でキャンセル
      log.push(`Cancelling Logiless: ${this.logilessOrder.id} (${this.logilessOrder.code})`);
      await this.logilessOrder.cancel();
      log.push("Completed cancelling Logiless");

      // Shopify上でキャンセル
      if (this.shopifyOrder.isAvailableCancelOperation) {
        log.push(`Cancelling Shopify: ${this.shopifyOrder.numericId} (${this.shopifyOrder.code})`);
        await this.shopifyOrder.cancel(request.reason ?? "");
        log.push("Completed cancelling Shopify");
      } else {
        // キャンセルできない場合は代わりにクローズする
        log.push(`Closing Shopify: ${this.shopifyOrder.numericId} (${this.shopifyOrder.code})`);
        await this.shopifyOrder.close(true, request.reason ?? "");
        log.push("Completed closing Shopify");
      }

      log.push("Sending cancel completed mail");
      await this.shopifyOrderMailSender.sendCancelCompletedMail(
        this.shopifyOrder.isRequiringCashRefunds,
      );
      log.push("Completed sending cancel completed mail");

      success = true;
    } catch (e) {
      if (e instanceof Error) {
        log.push(e.message, "error");
        e.stack && log.push(e.stack, "error");
      }
      this.slack.appendErrorMessage(e);

      await this.mailSender
        .sendMail({
          to: { email: "support@survaq.com" },
          from: { email: "support@survaq.com", name: "system" },
          subject: "【サバキューストア】ご注文商品　キャンセル未処理の件",
          contentBody: cancelFailedFollowUpMailBody(this.shopifyOrder, log),
          bypassListManagement: true,
        })
        .catch((e) => {
          log.push(`Failed to send mail: ${e.message}`, "error");
          e.stack && log.push(e.stack, "error");
        });

      await this.slack.notify(`Failed to cancel ${this.shopifyOrder.code}`).catch((e) => {
        log.push(`Failed to send mail: ${e.message}`, "error");
        e.stack && log.push(e.stack, "error");
      });

      success = false;
    }

    log.push("Finished!");

    await this.db.updateCancelRequestByOrderKey(request.orderKey, {
      status: success ? "Completed" : "Failed",
      log: request.log ? `${request.log}\n${log.toString()}` : log.toString(),
    });

    if (!success) throw new Error(`Failed to cancel. See: CancelRequest#${requestId}`);
  }
}

const cancelFailedFollowUpMailBody = (order: ShopifyOrderForCancel, log: Logger) => `担当者の方

下記ご注文番号のキャンセル申請について、
自動処理が失敗したため手動での対応をお願いします。

【注文番号】
${order.code}

【Shopify管理画面URL】
${order.adminUrl}

【エラーログ】
${log.toString()}`;
