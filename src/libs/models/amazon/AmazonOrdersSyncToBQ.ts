import { AmazonOrder, Order, OrderItem } from "./AmazonOrder";
import { BigQueryClient } from "../bigquery/BigQueryClient";
import { Bindings } from "../../../../bindings";

export class AmazonOrdersSyncToBQ extends AmazonOrder {
  private bq: BigQueryClient;
  constructor(env: Bindings) {
    super(env);
    this.bq = new BigQueryClient(env);
  }

  async lastUpdatedAt() {
    const [lastUpdatedAt] = await this.bq.query<{ updated_at: string }>(
      `SELECT CAST(MAX(updated_at) AS STRING) AS updated_at FROM ${this.bq.table("amazon", "orders")}`,
    );
    return lastUpdatedAt?.updated_at;
  }

  async syncOrderData(_params: {
    lastUpdatedAfter?: string;
    lastUpdatedBefore?: string;
    createdAfter?: string;
    createdBefore?: string;
    limit?: number;
    nextToken?: string;
  }) {
    const params = { ..._params };
    if (!params.lastUpdatedAfter && !params.createdAfter) {
      const lastUpdatedAt = await this.lastUpdatedAt();
      params.lastUpdatedAfter = lastUpdatedAt ? `${lastUpdatedAt}Z` : undefined;
      if (params.lastUpdatedAfter) console.log(`Last updated at: ${params.lastUpdatedAfter}`);
    }
    if (!params.limit) params.limit = 30;

    const orders = await this.getOrders({
      ...params,
    });
    const items = await this.getOrderItemsBulk(orders.data.map((order) => order.AmazonOrderId));

    console.log(`Found ${orders.data.length} orders`);
    console.log(`Found ${Object.values(items).flat().length} order items`);

    const insertableData = orders.data.map<[BQOrdersTableData, BQOrderItemsTableData[]]>(
      (order) => {
        const itemsData = items[order.AmazonOrderId];
        if (!itemsData || itemsData.length < 1)
          throw new Error(`OrderItems not found (AmazonOrderId: ${order.AmazonOrderId})`);
        return [
          parseForBQOrdersTableData(order, itemsData),
          itemsData.map((item) => parseForBQOrderItemsTableData(order, item)),
        ];
      },
    );

    const ordersData = insertableData.map(([order]) => order);
    const orderItemsData = insertableData.flatMap(([, items]) => items);

    await Promise.all([
      this.bq.deleteAndInsert("amazon", "orders", "id", ordersData),
      this.bq.deleteAndInsert("amazon", "order_items", "id", orderItemsData),
    ]);

    return orders.nextToken ? { ...params, nextToken: orders.nextToken } : undefined;
  }
}

type BQOrdersTableData = {
  id: string;
  status: string;
  total_price: number;
  total_tax: number;
  without_tax_total_price: number;
  ordered_at: Date;
  updated_at: Date;
  is_fulfilled: boolean;
  is_cancelled: boolean;
  is_test: boolean | null;
};

const parseForBQOrdersTableData = (order: Order, items: OrderItem[]): BQOrdersTableData => {
  const totalPrice = items.reduce(
    (acc, item) => acc + parseFloat(item.ItemPrice?.Amount ?? "0"),
    0,
  );
  const totalTax = items.reduce((acc, item) => acc + parseFloat(item.ItemTax?.Amount ?? "0"), 0);
  return {
    id: order.AmazonOrderId,
    status: order.OrderStatus,
    total_price: totalPrice,
    total_tax: totalTax,
    without_tax_total_price: totalPrice - totalTax,
    ordered_at: new Date(order.PurchaseDate),
    updated_at: new Date(order.LastUpdateDate),
    is_fulfilled: order.OrderStatus === "Shipped",
    is_cancelled: order.OrderStatus === "Canceled",
    // MEMO: AmazonはOrderのAPIではメアドはマスクされており氏名は取得できないのでテスト判定できない
    is_test: null,
  };
};

type BQOrderItemsTableData = {
  id: string;
  name: string;
  order_id: string;
  item_id: string;
  total_price: number;
  total_tax: number;
  without_tax_total_price: number;
  ordered_at: Date;
  updated_at: Date;
  is_fulfilled: boolean;
  is_cancelled: boolean;
};

// MEMO: QuantityShippedはキャンセルになると0になるので、quantityは残さない
// MEMO: おそらく販売者都合キャンセルのときは、ItemPriceも0になるっぽい。がこれはもう仕方ないので0で保存する
// MEMO: ItemPriceは商品単価ではなく、商品単価 * 数量の合計
const parseForBQOrderItemsTableData = (order: Order, item: OrderItem): BQOrderItemsTableData => {
  const totalPrice = parseFloat(item.ItemPrice?.Amount ?? "0");
  const totalTax = parseFloat(item.ItemTax?.Amount ?? "0");
  return {
    id: item.OrderItemId,
    name: item.Title ?? "",
    order_id: order.AmazonOrderId,
    item_id: item.SellerSKU ?? "",
    total_price: totalPrice,
    total_tax: totalTax,
    without_tax_total_price: totalPrice - totalTax,
    ordered_at: new Date(order.PurchaseDate),
    updated_at: new Date(order.LastUpdateDate),
    is_fulfilled: item.QuantityShipped > 0 && item.QuantityOrdered === item.QuantityShipped,
    // BuyerRequestedCancelは販売者側のキャンセルが含まれないので不十分。なのでQuantityOrderedを使う
    is_cancelled: item.QuantityOrdered < 1,
  };
};
