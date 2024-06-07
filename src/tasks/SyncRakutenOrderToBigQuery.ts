import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { RakutenOrderSyncBQ } from "../libs/models/rakuten/RakutenOrderSyncBQ";

const SyncType = {
  orderedAt: "orderedAt",
  fulfilledAt: "fulfilledAt",
  cancelledAt: "cancelledAt",
};

type SyncType = (typeof SyncType)[keyof typeof SyncType];

/**
 * Rakutenの注文情報をBigQueryに同期するタスク
 */
export class SyncRakutenOrderToBigQuery extends KiribiPerformer<
  { type?: SyncType; begin?: string; end?: string },
  void,
  Bindings
> {
  private order: RakutenOrderSyncBQ;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.order = new RakutenOrderSyncBQ(env);
  }

  async perform(data: { type?: SyncType; begin?: string; end?: string }) {
    const type = data.type ?? SyncType.orderedAt;
    if (type === SyncType.orderedAt) {
      await this.order.syncNewOrders(data.begin, data.end);
      return;
    }
    if (type === SyncType.fulfilledAt) {
      await this.order.syncNewFulfilledOrders(data.begin, data.end);
      return;
    }
    if (type === SyncType.cancelledAt) {
      await this.order.syncNewCancelledOrders(data.begin);
      return;
    }

    throw new Error(`Invalid type: ${type}`);
  }
}
