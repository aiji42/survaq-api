import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { ShopifyOrderSyncBQ } from "../libs/models/shopify/ShopifyOrderSyncBQ";

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

    await Promise.all([
      await this.order.upsertBQOrderSKUsTableData(),
      await this.order.upsertBQLineItemsTableData(),
      await this.order.upsertBQOrdersTableData(),
    ]);

    // SUK毎に販売枠(発注情報)を更新
    await Promise.all(
      this.order.createBQOrderSKUsTableData().map(async ({ code }) => {
        return this.env.KIRIBI.enqueue(
          "UpdateOrderInventory",
          { skuCode: code },
          {
            maxRetries: 1,
          },
        );
      }),
    );
  }
}
