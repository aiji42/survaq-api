import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { ShopifyOrderSyncBQ } from "../libs/models/shopify/ShopifyOrderSyncBQ";
import { blockReRun } from "../libs/utils";

/**
 * Shopifyの注文情報をBigQueryに同期するタスク
 */
export class SyncShopifyOrderToBigQuery extends KiribiPerformer<
  { orderId: number },
  void,
  Bindings
> {
  private order: ShopifyOrderSyncBQ;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.order = new ShopifyOrderSyncBQ(env);
  }

  async perform(data: { orderId: number }) {
    await this.order.prepare(data.orderId);

    await this.order.bulkUpsertBQTables();

    // SUK毎に販売枠(発注情報)を更新
    await Promise.all(
      this.order.createBQOrderSKUsTableData().map(async ({ code }) => {
        // ロジレスの発送処理などで一斉に発注情報が更新されるので、重複実行を防ぐ
        // - Queueの実行を60秒後に遅らせる & 60秒間は重複エンキューを禁止
        await blockReRun(`UpdateOrderInventory-${code}`, this.env.CACHE, async () => {
          await this.env.KIRIBI.enqueue(
            "UpdateOrderInventory",
            { skuCode: code },
            { maxRetries: 1, firstDelay: 60 },
          );
        });
      }),
    );
  }
}
