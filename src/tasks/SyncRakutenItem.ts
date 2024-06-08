import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { RakutenItemSync } from "../libs/models/rakuten/RakutenItemSync";

/**
 * Rakutenの商品(Item)情報をBigQueryとCMSのDBに同期するタスク
 */
export class SyncRakutenItem extends KiribiPerformer<{}, void, Bindings> {
  private item: RakutenItemSync;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.item = new RakutenItemSync(env);
  }

  async perform() {
    await this.item.sync();
  }
}
