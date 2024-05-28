import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { ShopifyOrderSyncBQ } from "../libs/models/shopify/ShopifyOrderSyncBQ";

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
  }
}
