import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";
import { InventoryOperator } from "../libs/models/cms/Inventory";

export class UpdateOrderInventory extends KiribiPerformer<{ skuCode: string }, void, Bindings> {
  async perform(data: { skuCode: string }) {
    const db = new DB(this.env);
    await db.useTransaction(async (transactedDB) => {
      const inventory = new InventoryOperator(transactedDB, data.skuCode, this.env);
      await inventory.prepare();

      await inventory.update();
      // FIXME: トランザクションのタイムアウトを長めに取っているが、BQのクエリが長いだけなので、BQへの通信はトランザクションの外で行うようにしたい。
    }, 40000);
  }
}
