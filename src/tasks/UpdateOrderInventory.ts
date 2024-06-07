import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";
import { InventoryOperator } from "../libs/models/cms/Inventory";
import { BigQueryClient } from "../libs/models/bigquery/BigQueryClient";

export class UpdateOrderInventory extends KiribiPerformer<{ skuCode: string }, void, Bindings> {
  db: DB;
  bq: BigQueryClient;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.db = new DB(env);
    this.bq = new BigQueryClient(env);
  }

  // FIXME: ほぼほぼリアルタイムにスケジュールシフトできるようになったのはいいが、ということはつまり、スプレッドシートの手動データ更新との衝突確率が上がるということである
  // なので、DBをアップデートせずにKVで完結するような方法を取ったほうが良さそうかもしれない。
  async perform(data: { skuCode: string }) {
    const db = new DB(this.env);
    const waitingShipmentQuantity = await InventoryOperator.fetchWaitingShipmentQuantity(
      this.bq,
      data.skuCode,
    );
    await db.useTransaction(async (transactedDB) => {
      const sku = await InventoryOperator.fetchSku(transactedDB, data.skuCode);
      const inventory = new InventoryOperator(sku, waitingShipmentQuantity, this.env);

      await inventory.update(transactedDB);
    });
  }
}
