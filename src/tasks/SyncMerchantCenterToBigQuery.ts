import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";
import { BigQueryClient } from "../libs/models/bigquery/BigQueryClient";

/**
 * Merchant CenterのマッピングデータをBigQueryに同期するタスク
 */
export class SyncMerchantCenterToBigQuery extends KiribiPerformer<{}, void, Bindings> {
  private db: DB;
  private bq: BigQueryClient;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.db = new DB(env);
    this.bq = new BigQueryClient(env);
  }

  async perform() {
    const merchantCenterData = await this.db.prisma.googleMerchantCenter.findMany({
      select: {
        merchantCenterId: true,
        shopifyProductGroup: true,
      },
    });

    const truncateQuery = this.bq.makeTruncateQuery("merchant_center", "mappings");
    const insertQuery = this.bq.makeInsertQuery(
      "merchant_center",
      "mappings",
      merchantCenterData.map(({ merchantCenterId, shopifyProductGroup }) => ({
        feedId: merchantCenterId,
        productGroupId: String(shopifyProductGroup),
      })),
    );

    await this.bq.query(`${truncateQuery};\n${insertQuery}`);
  }
}
