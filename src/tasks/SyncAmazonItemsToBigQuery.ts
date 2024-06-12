import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { AmazonItemsSyncToBQ } from "../libs/models/amazon/AmazonItemsSyncToBQ";

type Payload =
  | {
      type: "CREATE_REPORT";
    }
  | {
      type: "SYNC_REPORT";
      reportId: string;
    };

/**
 * Amazonの商品情報をBigQueryに同期するタスク
 */
export class SyncAmazonItemsToBigQuery extends KiribiPerformer<Payload, void, Bindings> {
  amazon: AmazonItemsSyncToBQ;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.amazon = new AmazonItemsSyncToBQ(env);
  }

  async perform(data: Payload) {
    switch (data.type) {
      case "CREATE_REPORT":
        await this.createReport();
        break;

      case "SYNC_REPORT":
        await this.amazon.syncReport(data.reportId);
        break;

      default:
        throw new Error("Invalid payload type");
    }
  }

  // レポートを作成し、SYNC_REPORTをKIRIBI経由で実行することで、同期処理を1分後に実行する
  private async createReport() {
    const report = await this.amazon.createItemsReport();
    this.env.KIRIBI.enqueue(
      "SyncAmazonItemsToBigQuery",
      { type: "SYNC_REPORT", reportId: report.reportId },
      { firstDelay: 60, maxRetries: 2, retryDelay: 60 },
    );
  }
}
