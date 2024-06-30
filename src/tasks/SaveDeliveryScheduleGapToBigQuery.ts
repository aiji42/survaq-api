import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";
import { BigQueryClient } from "../libs/models/bigquery/BigQueryClient";

/**
 * 各SKUの配送時期表示が本日と何日乖離しているかをBigQueryに保存する
 */
export class SaveDeliveryScheduleGapToBigQuery extends KiribiPerformer<{}, void, Bindings> {
  async perform() {
    const bq = new BigQueryClient(this.env);
    const gaps = await this.getGapData();
    if (gaps.length < 1) throw new Error("No gap data found");

    const deleteQuery = bq.makeDeleteQuery("shopify", "sku_delivery_gaps", "date", [gaps[0]!.date]);
    const insertQuery = bq.makeInsertQuery("shopify", "sku_delivery_gaps", gaps);
    await bq.query(`${deleteQuery};\n${insertQuery}`);
  }

  private async getGapData(): Promise<
    {
      code: string;
      schedule: string;
      date: string;
      days: number;
    }[]
  > {
    const db = new DB(this.env);
    return db.prisma.$queryRaw`
WITH CurrentDate AS (
  SELECT (CURRENT_DATE AT TIME ZONE 'Asia/Tokyo')::date AS today
)
SELECT
  sku.code,
  io."deliverySchedule" as schedule,
  TO_CHAR(cd.today, 'YYYY-MM-DD') AS date,
  GREATEST(
    CASE
      WHEN io."deliverySchedule" LIKE '%-early' THEN (to_date(io."deliverySchedule", 'YYYY-MM') + INTERVAL '9 days')::date - cd.today
      WHEN io."deliverySchedule" LIKE '%-middle' THEN (to_date(io."deliverySchedule", 'YYYY-MM') + INTERVAL '19 days')::date - cd.today
      WHEN io."deliverySchedule" LIKE '%-late' THEN ((DATE_TRUNC('MONTH', to_date(io."deliverySchedule", 'YYYY-MM') + INTERVAL '1 MONTH') - INTERVAL '1 day')::date) - cd.today
      ELSE 0
    END, 0) AS days
FROM "ShopifyCustomSKUs" sku
LEFT JOIN "ShopifyInventoryOrderSKUs" ios
  ON ios."id" = sku."currentInventoryOrderSKUId"
LEFT JOIN "ShopifyInventoryOrders" io
  ON ios."inventoryOrderId" = io."id"
CROSS JOIN CurrentDate cd
WHERE sku."skipDeliveryCalc" = false
`;
  }
}
