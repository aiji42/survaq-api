import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { RakutenOrderSyncBQ } from "../libs/models/rakuten/RakutenOrderSyncBQ";

type Payload =
  | {
      type: "ORDERED_AT" | "FULFILLED_AT";
      params?: { begin?: string; end?: string; limit?: number; page?: number };
    }
  | {
      type: "CANCELLED_AT";
      params?: [string, { begin?: string; limit?: number; page?: number }];
    };

/**
 * Rakutenの注文情報をBigQueryに同期するタスク
 */
export class SyncRakutenOrderToBigQuery extends KiribiPerformer<Payload, void, Bindings> {
  private order: RakutenOrderSyncBQ;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.order = new RakutenOrderSyncBQ(env);
  }

  async perform(data: Payload) {
    // FIXME: tasks/index.tsに定義されているretryStrategyを共有したい
    const retryStrategy = {
      firstDelay: 120,
      maxRetries: 2,
      retryDelay: 120,
    };

    if (data.type === "ORDERED_AT") {
      const nextParams = await this.order.syncNewOrders(data.params);
      if (nextParams)
        await this.env.KIRIBI.enqueue(
          "SyncRakutenOrderToBigQuery",
          { type: "ORDERED_AT", params: nextParams },
          retryStrategy,
        );
      return;
    }

    if (data.type === "FULFILLED_AT") {
      const nextParams = await this.order.syncNewFulfilledOrders(data.params);
      if (nextParams)
        await this.env.KIRIBI.enqueue(
          "SyncRakutenOrderToBigQuery",
          { type: "FULFILLED_AT", params: nextParams },
          retryStrategy,
        );
      return;
    }

    if (data.type === "CANCELLED_AT") {
      const nextParams = await this.order.syncNewCancelledOrders(
        data.params?.[0],
        data.params?.[1],
      );
      if (nextParams)
        await this.env.KIRIBI.enqueue(
          "SyncRakutenOrderToBigQuery",
          { type: "CANCELLED_AT", params: [...nextParams] },
          retryStrategy,
        );
      return;
    }
  }
}
