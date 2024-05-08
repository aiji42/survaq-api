import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";
import { Shopify } from "../libs/shopify";
import { Logiless } from "../libs/logiless";

export class Cancel extends KiribiPerformer<{ requestId: number }, void, Bindings> {
  db: DB;
  shopify: Shopify;
  logiless: Logiless;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.db = new DB(env);
    this.shopify = new Shopify(env);
    this.logiless = new Logiless(env);
  }

  async perform({ requestId }: { requestId: number }) {
    const request = await this.db.getCancelRequest(requestId);
    if (request.status !== "Pending") throw new Error("Request is not pending");
    if (request.store !== "Shopify") throw new Error("Unsupported store: " + request.store);

    const log = new Log();

    log.push("Began!");

    let success = false;
    try {
      const order = await this.shopify.getOrder(request.orderKey);

      await this.logiless.cancelSalesOrder(order.name);
      log.push(`Cancelled Logiless: ${(await this.logiless.getSalesOrder(order.name)).id}`);

      // MEMO: ↓が完了すると自動的にShopifyからキャンセル完了メールが送られる
      // TODO: 未払だとShopify上はクローズ扱いになって通知メールが送られない(はずな)ので別途キャンセルメール送る(本当に送られないかは要確認)
      await this.shopify.cancelOrder(order.id, request.reason ?? "");
      log.push(`Cancelled Shopify: ${order.id} (${order.name})`);

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
