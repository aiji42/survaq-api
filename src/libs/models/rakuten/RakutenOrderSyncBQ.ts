import {
  CHANGE_REASON,
  ItemModel,
  ORDER_STATUS,
  OrderModel,
  OrderStatus,
  RakutenOrder,
  SEARCH_DATE_TYPE,
  SkuModel,
} from "./RakutenOrder";
import { Bindings } from "../../../../bindings";
import { BigQueryClient } from "../bigquery/BigQueryClient";

type BQOrdersTableData = {
  id: string;
  status: string;
  total_price: number;
  total_tax: number;
  without_tax_total_price: number;
  ordered_at: Date;
  fulfilled_at: Date | null;
  cancelled_at: Date | null;
};

type BQOrderItemsTableData = {
  id: number;
  name: string;
  order_id: string;
  item_manage_id: string;
  sku_id: string;
  quantity: number;
  price: number;
  total_price: number;
  total_tax: number;
  without_tax_total_price: number;
  ordered_at: Date;
  fulfilled_at: Date | null;
  cancelled_at: Date | null;
};

export class RakutenOrderSyncBQ extends RakutenOrder {
  private bq: BigQueryClient;

  constructor(env: Bindings) {
    super(env);
    this.bq = new BigQueryClient(env);
  }

  async syncNewOrders(after: string) {
    const { data, pagination } = await this.search({
      dateType: SEARCH_DATE_TYPE.ORDER_DATE,
      beginDate: after,
      endDate: new Date().toISOString().split("T")[0]!,
    });

    let next = pagination.next;
    while (next) {
      // TODO: waitしてレートリミットを回避する
      const { data: nextData, pagination: nextPagination } = await next();
      data.push(...nextData);
      next = nextPagination.next;
    }

    console.log(`Found ${data.length} new orders`);

    await Promise.all([
      this.bq.deleteAndInsert("rakuten", "orders", "id", data.map(parseForBQTable)),
      this.bq.deleteAndInsert(
        "rakuten",
        "order_items",
        "id",
        data.flatMap(parseForBQOrderItemsTable),
      ),
    ]);
  }

  async syncNewFulfilledOrders(after: string) {
    const { data, pagination } = await this.search({
      dateType: SEARCH_DATE_TYPE.SHIPMENT_REPORT_DATE,
      beginDate: after,
      endDate: new Date().toISOString().split("T")[0]!,
    });

    let next = pagination.next;
    while (next) {
      // TODO: waitしてレートリミットを回避する
      const { data: nextData, pagination: nextPagination } = await next();
      data.push(...nextData);
      next = nextPagination.next;
    }

    console.log(`Found ${data.length} fulfilled orders`);

    await Promise.all([
      this.bq.deleteAndInsert("rakuten", "orders", "id", data.map(parseForBQTable)),
      this.bq.deleteAndInsert(
        "rakuten",
        "order_items",
        "id",
        data.flatMap(parseForBQOrderItemsTable),
      ),
    ]);
  }

  // MEMO: dateTypeが注文日基準でしか計算できないので、afterを一番最後の日付にしてしまうと本来取りたいデータが取れない。
  // そのため、全てのキャンセル済みの注文を取得して、その中からafter以降のものを取得する。
  async syncNewCancelledOrders(after: string) {
    const { data, pagination } = await this.search({
      dateType: SEARCH_DATE_TYPE.ORDER_DATE,
      statuses: [ORDER_STATUS.CANCEL_CONFIRMED],
      // 60日前から取得する
      beginDate: new Date(new Date().getTime() - 60 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]!,
      endDate: new Date().toISOString().split("T")[0]!,
    });

    let next = pagination.next;
    while (next) {
      // TODO: waitしてレートリミットを回避する
      const { data: nextData, pagination: nextPagination } = await next();
      data.push(...nextData);
      next = nextPagination.next;
    }

    // MEMO: キャンセル済みの注文は全て取得できているので、after以降のものだけを取得する
    const afterDate = new Date(after);
    const filteredData = data.filter((order) => {
      const cancelledAt = findCancelledAt(order);
      if (!cancelledAt) return false;
      return new Date(cancelledAt) >= afterDate;
    });

    console.log(`Found ${filteredData.length} cancelled orders`);

    await Promise.all([
      this.bq.deleteAndInsert("rakuten", "orders", "id", filteredData.map(parseForBQTable)),
      this.bq.deleteAndInsert(
        "rakuten",
        "order_items",
        "id",
        filteredData.flatMap(parseForBQOrderItemsTable),
      ),
    ]);
  }
}

const parseForBQTable = (order: OrderModel): BQOrdersTableData => {
  const totalPrice = order.totalPrice - order.couponAllTotalPrice + order.deliveryPrice;
  const taxRate = order.TaxSummaryModelList?.[0]?.taxRate;
  if (taxRate === undefined) throw new Error(`Tax rate not found: ${order.orderNumber}`);
  const totalTax = Math.ceil(totalPrice * taxRate);

  return {
    id: order.orderNumber,
    status: findStatusKey(order.orderProgress),
    total_price: totalPrice,
    total_tax: totalTax,
    without_tax_total_price: totalPrice - totalTax,
    ordered_at: datetime(order.orderDatetime),
    fulfilled_at: datetime(order.shippingCmplRptDatetime),
    cancelled_at: datetime(findCancelledAt(order)),
  };
};

const parseForBQOrderItemsTable = (order: OrderModel): BQOrderItemsTableData[] => {
  return order.PackageModelList.flatMap((pkg) => {
    return pkg.ItemModelList.map<BQOrderItemsTableData>((item) => {
      const sku = item.SkuModelList[0];
      if (!sku) throw new Error(`SKU not found: ${item.manageNumber}`);
      if (item.SkuModelList.length > 1)
        throw new Error(`Multiple SKUs found: ${item.manageNumber}`);
      if (!sku.merchantDefinedSkuId)
        throw new Error(`SKU merchantDefinedSkuId not found: ${item.manageNumber}`);

      const totalPrice = item.priceTaxIncl * item.units;
      const totalTax = Math.ceil(totalPrice * item.taxRate);

      return {
        id: item.itemDetailId,
        name: item.itemName,
        order_id: order.orderNumber,
        item_manage_id: item.manageNumber,
        sku_id: sku.merchantDefinedSkuId,
        quantity: item.units,
        price: item.priceTaxIncl,
        total_price: totalPrice,
        total_tax: totalTax,
        without_tax_total_price: totalPrice - totalTax,
        ordered_at: datetime(order.orderDatetime),
        fulfilled_at: datetime(order.shippingCmplRptDatetime),
        cancelled_at: datetime(findCancelledAt(order)),
      };
    });
  });
};

const findStatusKey = (status: OrderStatus) => {
  const key = Object.entries(ORDER_STATUS).find(([key, value]) => value === status)?.[0];
  if (!key) throw new Error(`Unknown status: ${status}`);
  return key;
};

const datetime = <T extends string | null | undefined>(at: T): T extends string ? Date : null =>
  (at ? new Date(at) : null) as T extends string ? Date : null;

const findCancelledAt = (order: OrderModel) => {
  return order.ChangeReasonModelList?.find(
    (change) => change.changeType === CHANGE_REASON.CANCEL_COMPLETED,
  )?.changeCmplDatetime;
};

const skuValid = (item: ItemModel) => {
  const sku = item.SkuModelList[0];
  if (!sku) throw new Error(`SKU not found: ${item.manageNumber}`);
  if (item.SkuModelList.length > 1) throw new Error(`Multiple SKUs found: ${item.manageNumber}`);
  if (!sku.merchantDefinedSkuId)
    throw new Error(`SKU merchantDefinedSkuId not found: ${item.manageNumber}`);

  return sku as Pick<SkuModel, "variantId"> & { merchantDefinedSkuId: string };
};
