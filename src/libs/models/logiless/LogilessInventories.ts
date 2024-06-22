import { LogilessClient } from "./LogilessClient";

class LogilessInventory {
  constructor(private inventoryData: Inventory) {}

  get inventoryQty() {
    return this.inventoryData.available;
  }

  get waitingShipmentQty() {
    return this.inventoryData.ordered;
  }

  get cmsData() {
    return {
      code: this.inventoryData.article?.code,
      inventory: this.inventoryQty,
      unshippedOrderCount: this.waitingShipmentQty,
      lastSyncedAt: new Date(this.inventoryData.updated_at),
      stockBuffer: 0, // FIXME
      faultyRate: 0, // FIXME
    };
  }
}

export class LogilessInventories extends LogilessClient {
  private _inventories: LogilessInventory[] = [];

  get inventories() {
    return this._inventories;
  }

  get cmsData() {
    return this._inventories.map((inventory) => inventory.cmsData);
  }

  async setInventories(params: InventoryListQueryParams) {
    const { data, total_count, current_page, limit } = await this.apiGet<InventoryListResponse>(
      "/logical_inventory_summaries",
      {
        article_type: "Single",
        layer: "Article",
        limit: 100,
        ...params,
      },
    );

    data.forEach((inventory) => {
      this._inventories.push(new LogilessInventory(inventory));
    });

    const lastPage = Math.ceil(total_count / limit);
    if (current_page < lastPage) {
      const nextPage = current_page + 1;
      await this.setInventories({ ...params, page: nextPage });
    }
  }

  // TODO 入荷予定も取得する
}

type layer =
  | "Article" // 商品
  | "Warehouse" // 倉庫
  | "Location" // ロケーション - 保管状況 APIでのみ利用可能
  | "Deadline" // 出荷期限日 - 保管状況 APIでのみ利用可能
  | "LotNumber"; // ロット番号 - 保管状況 APIでのみ利用可能

type ArticleType =
  | "Single" // 通常商品
  | "Assortment" // セット商品
  | "Crate"; // 集合包装

type Article = {
  id: number;
  code: string;
  object_code: string;
  name: string;
  article_type: ArticleType;
  created_at: string;
  updated_at: string;
};

type Inventory = {
  id: number;
  layer: layer; // 在庫レイヤー
  ordered: number; // 受注済み
  in_transit: number; // 入荷待ち
  received: number; // 入庫済み
  available: number; // 保管中
  blocked: number; // 保留
  allocated: number; // 引当済み
  stock_out: number; // 引当待ち
  free: number; // フリー在庫
  shipped: number; // 出荷済み
  issued: number; // 出庫済み
  in_reorder_level: number; // 発注点割れ
  reached_reorder_level_at?: string; // 発注点を割った日時 - Y-m-d H:i:s形式 (例 : 2018-01-01 23:59:59)
  created_at: string; // 作成日時 - Y-m-d H:i:s形式 (例 : 2018-01-01 23:59:59)
  updated_at: string; // 更新日時 - Y-m-d H:i:s形式 (例 : 2018-01-01 23:59:59)
  article_id?: number; // 商品ID
  article?: Article; // 商品マスタ
  warehouse?: unknown; // 倉庫マスタ - warehouseのプロパティを参照
};

type InventoryListQueryParams = {
  page?: number; // デフォルトは1
  updated_at_from: string; // 更新日時（From） - Y-m-d H:i:s形式 (例 : 2018-01-01 23:59:59)
  updated_at_to: string; // 更新日時（To） - Y-m-d H:i:s形式 (例 : 2018-01-01 23:59:59)
};

type InventoryListResponse = {
  data: Inventory[];
  current_page: number;
  limit: number;
  total_count: number;
};
