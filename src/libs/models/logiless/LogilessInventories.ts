import { Env, LogilessClient } from "./LogilessClient";
import { makeScheduleFromDeliverySchedule } from "../../makeSchedule";

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
      logilessId: String(this.inventoryData.id),
    };
  }
}

class LogilessInboundDelivery {
  constructor(private inboundDeliveryData: InboundDelivery) {}

  get orderedDate() {
    if (!this.inboundDeliveryData.ordered_at) return null;
    return new Date(this.inboundDeliveryData.ordered_at);
  }

  get receivingDate() {
    if (!this.inboundDeliveryData.scheduled_delivery_date) return null;
    return new Date(this.inboundDeliveryData.scheduled_delivery_date);
  }

  get deliveryDate() {
    const validDate = this.validDeliverySchedule;
    const schedule = makeScheduleFromDeliverySchedule(validDate, "ja");
    return !schedule
      ? null
      : new Date(
          schedule.year,
          schedule.month - 1,
          schedule.term === "early" ? 1 : schedule.term === "middle" ? 11 : 21,
        );
  }

  get cmsStatus() {
    return this.inboundDeliveryData.status === "Cancel"
      ? "cancelled"
      : this.inboundDeliveryData.status === "Received"
        ? "received"
        : this.isValidDeliverySchedule
          ? "waitingReceiving"
          : "checking";
  }

  get cmsData() {
    return {
      name: this.inboundDeliveryData.code,
      orderedDate: this.orderedDate,
      receivingDate: this.receivingDate,
      logilessId: String(this.inboundDeliveryData.id),
      status: this.cmsStatus,
      deliveryDate: this.deliveryDate,
      deliverySchedule: this.validDeliverySchedule,
      lastSyncedAt: new Date(this.inboundDeliveryData.updated_at),
      // TODO: その他メモ的なデータを含める
      inventoryOrderSKUs: this.inboundDeliveryData.lines.map((line) => ({
        skuCode: line.article_code,
        quantity: line.quantity,
      })),
    };
  }

  private get isValidDeliverySchedule() {
    const data = this.inboundDeliveryData.attr1;
    if (!data) return false;
    // YYYY-MM(1-12)-(early|middle|late)の形式であるかどうかをチェック
    return /^20\d{2}-(0[1-9]|1[0-2])-(early|middle|late)$/.test(data);
  }

  get validDeliverySchedule() {
    return this.isValidDeliverySchedule ? this.inboundDeliveryData.attr1! : null;
  }
}

export class LogilessInventories extends LogilessClient {
  private _inventories: LogilessInventory[] = [];
  private _inboundDeliveries: LogilessInboundDelivery[] = [];

  static async build(
    env: Env,
    inventoryQuery: InventoryListQueryParams,
    inboundDeliveryQuery: InboundDeliveryListQueryParams,
  ) {
    const logilessInventories = new LogilessInventories(env);
    await Promise.all([
      logilessInventories.setInventories(inventoryQuery),
      logilessInventories.setInboundDeliveries(inboundDeliveryQuery),
    ]);

    return logilessInventories;
  }

  get inventories() {
    return this._inventories;
  }

  get inboundDeliveries() {
    return this._inboundDeliveries;
  }

  get cmsData() {
    const cmsInventories = this.inventories.map((inventory) => inventory.cmsData);
    const cmsInboundDeliveries = this.inboundDeliveries.map(
      (inboundDelivery) => inboundDelivery.cmsData,
    );
    return {
      skus: cmsInventories,
      inventoryOrders: cmsInboundDeliveries,
    };
  }

  private async setInventories(params: InventoryListQueryParams) {
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

  private async setInboundDeliveries(params: InboundDeliveryListQueryParams) {
    const { data, total_count, current_page, limit } =
      await this.apiGet<InboundDeliveryListResponse>("/inbound_deliveries", {
        limit: 100,
        ...params,
      });

    data.forEach((inboundDelivery) => {
      if (inboundDelivery.inbound_delivery_category === "PurchaseOrder")
        this._inboundDeliveries.push(new LogilessInboundDelivery(inboundDelivery));
    });

    const lastPage = Math.ceil(total_count / limit);
    if (current_page < lastPage) {
      const nextPage = current_page + 1;
      await this.setInboundDeliveries({ ...params, page: nextPage });
    }
  }
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

type InboundDeliveryCategory =
  | "InterWarehouseTransfer" // 倉庫間転送
  | "PurchaseOrder" // 入荷予定伝票
  | "SalesReturn" // 売上返品
  | "FailedDeliveryAttempt"; // 持ち戻り

type InboundDeliveryStatus =
  | "WaitingForReceipt" // 入荷待ち
  | "Received" // 入荷済み
  | "Cancel"; // キャンセル

type InboundDeliveryLine = {
  id: number;
  code: string;
  article_code: string;
  article_name: string;
  quantity: number;
  received_quantity: number;
  created_at: string;
  updated_at: string;
};

type InboundDelivery = {
  id: number;
  code: string;
  inbound_delivery_category: InboundDeliveryCategory;
  status: InboundDeliveryStatus;
  scheduled_delivery_date?: string; // 納入予定日
  attr1?: string;
  attr2?: string;
  attr3?: string;
  ordered_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
  total: number;
  lines: InboundDeliveryLine[];
};

type InboundDeliveryListQueryParams = {
  page?: number; // デフォルトは1
  updated_at_from: string; // 更新日時（From） - Y-m-d H:i:s形式 (例 : 2018-01-01 23:59:59)
  updated_at_to: string; // 更新日時（To） - Y-m-d H:i:s形式 (例 : 2018-01-01 23:59:59)
};

type InboundDeliveryListResponse = {
  data: InboundDelivery[];
  current_page: number;
  limit: number;
  total_count: number;
};
