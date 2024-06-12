import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { AmazonOrdersSyncToBQ } from "../libs/models/amazon/AmazonOrdersSyncToBQ";

type Payload = {
  lastUpdatedAfter?: string;
  lastUpdatedBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  nextToken?: string;
};

export class SyncAmazonOrderToBigQuery extends KiribiPerformer<Payload, void, Bindings> {
  private amazon: AmazonOrdersSyncToBQ;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.amazon = new AmazonOrdersSyncToBQ(env);
  }

  async perform(payload: Payload) {
    const nextParams = await this.amazon.syncOrderData(payload);

    // FIXME: tasks/index.tsに定義されているretryStrategyを共有したい
    if (nextParams)
      await this.env.KIRIBI.enqueue("SyncAmazonOrderToBigQuery", nextParams, {
        firstDelay: 120,
        maxRetries: 2,
        retryDelay: 120,
      });
  }
}
