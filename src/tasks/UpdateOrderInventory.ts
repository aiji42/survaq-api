import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";
import { Inventory } from "../libs/models/cms/Inventory";

export class UpdateOrderInventory extends KiribiPerformer<{ skuCode: string }, void, Bindings> {
  async perform(data: { skuCode: string }) {
    const db = new DB(this.env);
    await db.useTransaction(async (transactedDB) => {
      const inventory = new Inventory(transactedDB, data.skuCode, this.env);
      await inventory.prepare();

      await inventory.update();
    });
  }
}
