import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { RakutenItemSync } from "../libs/models/rakuten/RakutenItemSync";

type Payload = { limit?: number; offset?: number };

/**
 * Rakutenの商品(Item)情報をBigQueryとCMSのDBに同期するタスク
 */
export class SyncRakutenItem extends KiribiPerformer<Payload, void, Bindings> {
  private item: RakutenItemSync;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.item = new RakutenItemSync(env);
  }

  async perform(payload: Payload) {
    const nextParams = await this.item.sync(payload);

    // FIXME: tasks/index.tsに定義されているretryStrategyを共有したい
    if (nextParams) {
      await this.env.KIRIBI.enqueue("SyncRakutenItem", nextParams, {
        firstDelay: 120,
        maxRetries: 2,
        retryDelay: 120,
      });
    }
  }
}
