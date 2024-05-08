import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";
import { ShopifyOrder } from "../libs/shopify";
import { LogilessSalesOrder } from "../libs/logiless";

export class Cancel extends KiribiPerformer<{ requestId: number }, void, Bindings> {
  db: DB;
  shopifyOrder: ShopifyOrder;
  logilessOrder: LogilessSalesOrder;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.db = new DB(env);
    this.shopifyOrder = new ShopifyOrder(env);
    this.logilessOrder = new LogilessSalesOrder(env);
  }

  async perform({ requestId }: { requestId: number }) {
    const request = await this.db.getCancelRequest(requestId);
    if (request.status !== "Pending") throw new Error("Request is not pending");
    if (request.store !== "Shopify") throw new Error("Unsupported store: " + request.store);

    const log = new Log();

    log.push("Began!");

    let success = false;
    try {
      await this.shopifyOrder.setOrderById(request.orderKey);
      await this.logilessOrder.setSalesOrderByShopifyOrder(this.shopifyOrder);

      await this.logilessOrder.cancel();
      log.push(`Cancelled Logiless: ${this.logilessOrder.id} (${this.logilessOrder.code})`);

      // MEMO: ↓が完了すると自動的にShopifyからキャンセル完了メールが送られる
      // TODO: 未払だとShopify上はクローズ扱いになって通知メールが送られない(はずな)ので別途キャンセルメール送る(本当に送られないかは要確認)
      await this.shopifyOrder.cancel(request.reason ?? "");
      log.push(`Cancelled Shopify: ${this.shopifyOrder.numericId} (${this.shopifyOrder.code})`);

      // TODO: 支払済みでコンビニ払いor銀行振込なら、返金用口座を聞くためのメールを送信(BCCでCSにも送信)
      // 将来的にはorderのwebhookによる処理に分けて、キャンセルリクエストによらない共通処理にしても良いかもしれない
      success = true;
    } catch (e) {
      if (e instanceof Error) {
        log.push(e.message, "error");
        e.stack && log.push(e.stack, "error");
      }
      // TODO: 失敗した旨をCSにメールで通知(Slackにも送る)
      success = false;
    }

    log.push("Finished!");

    await this.db.updateCancelRequestByOrderKey(request.orderKey, {
      status: success ? "Completed" : "Failed",
      log: request.log ? `${log.toString()}\n${request.log}` : log.toString(),
    });

    if (!success) throw new Error(`Failed to cancel. See: CancelRequest#${requestId}`);
  }
}

class Log {
  logs: string[] = [];

  push(log: string, level: "info" | "warn" | "error" = "info") {
    if (!log) return;
    this.logs.push(`[${new Date().toISOString().slice(0, 19)}][${level}] ${log}`);
  }

  toString() {
    return this.logs.join("\n");
  }
}
