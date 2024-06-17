import {
  CHANCE_REASON_DETAIL,
  CHANGE_REASON,
  CHANGE_TYPE_DETAIL,
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

  async lastOrderedAt() {
    const [lastOrderedAt] = await this.bq.query<{ ordered_at: string }>(
      `SELECT CAST(MAX(ordered_at) AS STRING) AS ordered_at FROM ${this.bq.table("rakuten", "orders")}`,
    );
    return lastOrderedAt?.ordered_at;
  }

  async lastFulfilledAt() {
    const [lastFulfilledAt] = await this.bq.query<{ fulfilled_at: string }>(
      `SELECT CAST(MAX(fulfilled_at) AS STRING) AS fulfilled_at FROM ${this.bq.table("rakuten", "orders")}`,
    );
    return lastFulfilledAt?.fulfilled_at;
  }

  async lastCancelledAt() {
    const [lastCancelledAt] = await this.bq.query<{ cancelled_at: string }>(
      `SELECT CAST(MAX(cancelled_at) AS STRING) AS cancelled_at FROM ${this.bq.table("rakuten", "orders")}`,
    );
    return lastCancelledAt?.cancelled_at;
  }

  async syncNewOrders(_params?: { begin?: string; end?: string; limit?: number; page?: number }) {
    const params = { ..._params };

    if (!params.begin) {
      const lastOrderedAt = await this.lastOrderedAt();
      if (!lastOrderedAt) throw new Error("No last ordered date found");
      params.begin = getRakutenDatetimeFormat(lastOrderedAt);
      console.log(`Last ordered date: ${params.begin}(JST)`);
    }
    if (!params.end) params.end = getRakutenDatetimeFormat(new Date());

    const { data, pagination } = await this.search({
      dateType: SEARCH_DATE_TYPE.ORDER_DATE,
      begin: params.begin!,
      end: params.end!,
      limit: params.limit,
      page: params.page,
    });

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

    return pagination.nextParams;
  }

  async syncNewFulfilledOrders(_params?: {
    begin?: string;
    end?: string;
    limit?: number;
    page?: number;
  }) {
    const params = { ..._params };

    if (!params.begin) {
      const lastFulfilledAt = await this.lastFulfilledAt();
      if (!lastFulfilledAt) throw new Error("No last fulfilled date found");
      params.begin = getRakutenDatetimeFormat(lastFulfilledAt);
      console.log(`Last fulfilled date: ${params.begin}(JST)`);
    }
    if (!params.end) params.end = getRakutenDatetimeFormat(new Date());

    const { data, pagination } = await this.search({
      dateType: SEARCH_DATE_TYPE.SHIPMENT_REPORT_DATE,
      begin: params.begin!,
      end: params.end!,
      limit: params.limit,
      page: params.page,
    });

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

    return pagination.nextParams;
  }

  // MEMO: dateTypeが注文日基準でしか計算できないので、_afterを一番最新のキャンセルの日時にしてしまうと本来取りたいデータは取れない。
  // そのため、過去60日間の全てのキャンセル済みの注文を取得し、その中からafter以降でキャンセルになったものをフィルタする。
  async syncNewCancelledOrders(
    _after?: string,
    _params?: { begin?: string; end?: string; limit?: number; page?: number },
  ) {
    const params = { ..._params };

    let after = _after;
    if (!after) {
      const lastCancelledAt = await this.lastCancelledAt();
      if (!lastCancelledAt) throw new Error("No last cancelled date found");
      after = getRakutenDatetimeFormat(lastCancelledAt);
      console.log(`Last cancelled date: ${after}(JST)`);
    }

    // 60日前から今日までのデータを取得する
    if (!params.begin)
      params.begin = getRakutenDatetimeFormat(
        new Date(new Date().getTime() - 60 * 24 * 60 * 60 * 1000),
      );
    if (!params.end) params.end = getRakutenDatetimeFormat(new Date());
    console.log(`Searching cancelled orders from ${params.begin}(JST) to ${params.end}(JST)`);
    const { data, pagination } = await this.search({
      dateType: SEARCH_DATE_TYPE.ORDER_DATE,
      statuses: [
        ORDER_STATUS.CANCEL_CONFIRMED,
        ORDER_STATUS.SHIPPED,
        ORDER_STATUS.PAYMENT_PROCESSED,
      ],
      begin: params.begin,
      end: params.end,
      limit: params.limit,
      page: params.page,
    });

    // MEMO: 60日間の注文データの中からafter以降のキャンセル済みの注文を取得する
    const filteredData = data.filter((order) => {
      const cancelledAt = findCancelledAt(order);
      // このcancelledAtは日本時間。beginも日本時間になっているのでそのまま比較してよい
      return cancelledAt && new Date(cancelledAt) >= new Date(after);
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

    return pagination.nextParams ? ([after, pagination.nextParams] as const) : undefined;
  }
}

const getRakutenDatetimeFormat = (utc: string | Date) => {
  // +9時間してYYYY-MM-DDTHH:MM:SSに変換する
  return new Date(
    (typeof utc === "string" ? new Date(`${utc}Z`) : utc).getTime() + 9 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 19);
};

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
      const sku = skuValid(item);
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
    (change) =>
      // 変更理由がキャンセル
      change.changeType === CHANGE_REASON.CANCEL_COMPLETED ||
      // もしくは変更理由が、「変更完了」かつ減額
      (change.changeType === CHANGE_REASON.CHANGE_COMPLETED &&
        change.changeTypeDetail === CHANGE_TYPE_DETAIL.DECREASE),
  )?.changeCmplDatetime;
};

const skuValid = (item: ItemModel) => {
  const sku = item.SkuModelList[0];
  if (!sku) throw new Error(`SKU not found: ${item.manageNumber}`);
  if (item.SkuModelList.length > 1) throw new Error(`Multiple SKUs found: ${item.manageNumber}`);
  // MEMO: 2024年2月01日以前のデータはmerchantDefinedSkuIdがないケースも有るので、古いデータを取り込むとエラーになる
  if (!sku.merchantDefinedSkuId)
    throw new Error(`SKU merchantDefinedSkuId not found: ${item.manageNumber}`);

  return sku as Pick<SkuModel, "variantId"> & { merchantDefinedSkuId: string };
};
