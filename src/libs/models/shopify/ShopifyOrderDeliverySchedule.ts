import { ShopifyOrder } from "./ShopifyOrder";
import { BigQuery } from "cfw-bq";
import { DB } from "../../db";
import { latest, makeSchedule } from "../../makeSchedule";

export class ShopifyOrderDeliverySchedule extends ShopifyOrder {
  private bq: BigQuery;
  private db: DB;
  constructor(env: {
    SHOPIFY_ACCESS_TOKEN: string;
    GCP_SERVICE_ACCOUNT: string;
    DATABASE_URL: string;
  }) {
    super(env);
    this.bq = new BigQuery(JSON.parse(env.GCP_SERVICE_ACCOUNT), "shopify-322306");
    this.db = new DB(env);
  }

  get isWaitingForShipment() {
    return !this.fulfillmentStatus && !this.isCancelled && !this.isClosed;
  }

  private async getWaitingQuantitiesBySku() {
    return this.bq.query<{ code: string; quantity: number }>(waitingQuantitiesBySkuQuery(this.gid));
  }

  private async getInventories(codes: string[]) {
    const res = await this.db.getSKUsWithWaitingInventoryOrders(codes);

    return Object.fromEntries(
      res.map(({ code, ...sku }) => {
        // スケジュール計算しなくて良いSKUは在庫数無限の即時出荷可能として扱う
        if (sku.skipDeliveryCalc)
          return [
            code,
            [
              {
                availableQuantity: Number.POSITIVE_INFINITY,
                schedule: null,
              },
            ],
          ] as const;

        return [
          code,
          [
            // 対象SKUの実在庫(不良想定数およびバッファ分確保を加味した数)
            {
              availableQuantity:
                sku.inventory -
                Math.max(sku.stockBuffer ?? 0, Math.ceil(sku.inventory * sku.faultyRate)),
              schedule: null,
            },
            // 入庫待ちの枠(不良想定数を加味した数)
            ...sku.inventoryOrderSKUs.map(({ quantity, ShopifyInventoryOrders }) => ({
              availableQuantity: quantity - Math.ceil(quantity * sku.faultyRate),
              schedule: ShopifyInventoryOrders.deliverySchedule,
            })),
          ] as const,
        ];
      }),
    );
  }

  async getSchedule() {
    // キャンセル・クローズ・出荷済みの場合は表示しない
    if (!this.isWaitingForShipment) return null;

    const waitingQuantityBySku = await this.getWaitingQuantitiesBySku();
    // waitingQuantityBySkuがゼロ件になるのは以下のケースが考えられる
    // - まだorder_skusにデータが取り込まれていない
    // - un_managedのSKUのみで注文が構成されている(手数料徴収用の特別対応注文)
    // - 注文から180日以上経過している
    if (waitingQuantityBySku.length < 1) {
      // 注文から1時間以内ならまだorder_skusにデータが取り込まれていないので、note_attributeのデータを使用してスケジュールを出す
      if (
        Date.now() - this.createdAt.getTime() < 60 * 60 * 1000 &&
        this.hasValidSavedDeliveryScheduleAttrs
      ) {
        return makeSchedule(this.validSavedDeliveryScheduleAttrs.estimate, this.locale);
      }

      // それ以外の場合はスケジュールを出せないのでnullを返す
      return null;
    }

    const codes = waitingQuantityBySku.map(({ code }) => code);
    const inventoriesBySku = await this.getInventories(codes);
    const schedules = waitingQuantityBySku.map(({ code, quantity }) => {
      let cumulativeSum = 0;
      const inventories = inventoriesBySku[code];
      // BigQuery側で獲得できるデータのSKUがCMS用のDBに存在していない場合、データ不整合が疑われる。
      if (!inventories) throw new Error(`SKU not found on CMS (code: ${code})`);

      for (const { availableQuantity, schedule } of inventories) {
        cumulativeSum += availableQuantity;
        if (cumulativeSum >= quantity) return makeSchedule(schedule, this.locale);
      }

      // ここに到達するということは販売可能枠が最終に到達し枯渇している状態。
      // MEMO: 商品ページ用のAPIでは、同様のケースは最終枠のスケジュールを代わりに出すが、このAPIは注文確認ページで使用されより正確性が求められる。
      throw new Error(`SKU ${code} is out of stock`);
    });

    return latest([...schedules, makeSchedule(null, this.locale)]);
  }
}

const waitingQuantitiesBySkuQuery = (id: string) => `
-- 対象order_idのordered_atを取得
WITH TargetOrderedAt AS (
  SELECT MIN(ordered_at) AS ordered_at
  FROM \`shopify.order_skus\`
  WHERE order_id = '${id}'
),

-- 対象order_idのSKUを取得(un_managedなSKUは計算から除外する)
TargetSKUs AS (
  SELECT code
  FROM \`shopify.order_skus\`
  WHERE order_id = '${id}'
    AND code != 'un_managed'
),

-- 対象の注文を含む、それ以前の注文で、まだfulfillされていないSKUの個数を算出
UnshippedOrdersBeforeTarget AS (
  SELECT code, SUM(quantity) as quantity
  FROM \`shopify.order_skus\` os
  WHERE os.ordered_at <= (SELECT ordered_at FROM TargetOrderedAt)
    AND os.code IN (SELECT code FROM TargetSKUs)
    AND DATE_DIFF(CURRENT_TIMESTAMP(), os.ordered_at, DAY) < 180
    AND canceled_at IS NULL
    AND fulfilled_at IS NULL
    AND closed_at IS NUll
  GROUP BY code
)

SELECT code, quantity
FROM UnshippedOrdersBeforeTarget;
`;
