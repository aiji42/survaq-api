import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { AmazonAdsSyncToBQ } from "../libs/models/amazon/AmazonAdsSyncToBQ";

type Payload =
  | {
      type: "CREATE_REPORT";
      startDate?: string;
      endDate?: string;
    }
  | {
      type: "SYNC_REPORT";
      report: {
        reportId: string;
        profileId: number;
        accountId: string;
        accountName: string;
      };
    };

/**
 * Amazonの広告情報をBigQueryに同期するタスク
 */
export class SyncAmazonAdPerformanceToBigQuery extends KiribiPerformer<Payload, void, Bindings> {
  amazon: AmazonAdsSyncToBQ;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.amazon = new AmazonAdsSyncToBQ(env);
  }

  async perform(data: Payload) {
    switch (data.type) {
      case "CREATE_REPORT":
        await this.createReport(data.startDate, data.endDate);
        break;

      case "SYNC_REPORT":
        await this.amazon.syncSponsoredCampaignReport(data.report.reportId, data.report);
        break;

      default:
        throw new Error("Invalid payload type");
    }
  }

  // レポートを作成し、SYNC_REPORTをKIRIBI経由で実行することで、同期処理を1分後に実行する
  private async createReport(startDate?: string, endDate?: string) {
    const reports = await this.amazon.createSponsoredCampaignReports(
      startDate ?? getDate(8),
      endDate ?? getDate(1),
    );
    await Promise.all(
      reports.map((report) =>
        this.env.KIRIBI.enqueue(
          "SyncAmazonAdPerformanceToBigQuery",
          { type: "SYNC_REPORT", report },
          { firstDelay: 60, maxRetries: 2, retryDelay: 60 },
        ),
      ),
    );
  }
}

const getDate = (beforeDays: number) =>
  new Date(Date.now() - 1000 * 60 * 60 * 24 * beforeDays).toISOString().split("T")[0]!;
