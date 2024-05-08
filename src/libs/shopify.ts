import { ShopifyOrder as ShopifyOrderData } from "../types/shopify";
import { DB } from "./db";
import { latest, makeSchedule } from "./makeSchedule";

const API_VERSION = "2024-04";

export class ShopifyOrder {
  constructor(private env: { SHOPIFY_ACCESS_TOKEN: string }) {}
  private _order: ShopifyOrderData | undefined;

  get headers() {
    return new Headers({
      "X-Shopify-Access-Token": this.env.SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json",
    });
  }

  setOrder(order: ShopifyOrderData) {
    this._order = order;
    return this;
  }

  async setOrderById(_id: number | string) {
    const id = Number(_id);

    const res = await fetch(
      `https://survaq.myshopify.com/admin/api/${API_VERSION}/orders/${id}.json`,
      { headers: this.headers },
    );
    if (!res.ok) throw new Error(await res.text());
    this._order = ((await res.json()) as { order: ShopifyOrderData }).order;

    return this;
  }

  get order() {
    const order = this._order;
    if (!order) throw new Error("Order is not set");
    return order;
  }

  get numericId() {
    return Number(this.order.id);
  }

  get gid() {
    return `gid://shopify/Order/${this.order.id}`;
  }

  get code() {
    return this.order.name;
  }

  get locale(): "ja" | "en" {
    return this.order.customer_locale.startsWith("ja") ? "ja" : "en";
  }

  get customer() {
    return this.order.customer;
  }

  get lineItems() {
    return this.order.line_items;
  }

  get noteAttributes() {
    return this.order.note_attributes;
  }

  get createdAt() {
    return new Date(this.order.created_at);
  }

  get cancelable() {
    const data = this.order;

    if (data.cancelled_at) return { isCancelable: false, reason: "Canceled" };
    if (data.fulfillment_status) return { isCancelable: false, reason: "Shipped" };

    return { isCancelable: true };
  }

  async cancel(reason: string) {
    const res = await fetch(`https://survaq.myshopify.com/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        // SEE: https://shopify.dev/docs/api/admin-graphql/2024-04/mutations/orderCancel?language=cURL
        query: `mutation OrderCancel($orderId: ID!, $notifyCustomer: Boolean, $refund: Boolean!, $restock: Boolean!, $reason: OrderCancelReason!, $staffNote: String) { orderCancel(orderId: $orderId, notifyCustomer: $notifyCustomer, refund: $refund, restock: $restock, reason: $reason, staffNote: $staffNote) { job { id done } orderCancelUserErrors { field message code } } }`,
        variables: {
          orderId: this.gid,
          notifyCustomer: true,
          refund: true,
          restock: true,
          reason: "CUSTOMER",
          staffNote: reason,
        },
      }),
    });
    if (!res.ok) throw new Error(await res.text());

    const result = (await res.json()) as
      | {
          data: {
            orderCancel: {
              orderCancelUserErrors: { field: string[]; message: string; code: string }[];
            };
          };
        }
      | {
          errors: { message: string }[];
        };

    if ("errors" in result) throw new Error(result.errors.map(({ message }) => message).join("\n"));
    else if (result.data.orderCancel.orderCancelUserErrors.length)
      throw new Error(
        result.data.orderCancel.orderCancelUserErrors
          .map(({ field, message, code }) => `${field.join(".")}: ${message} (${code})`)
          .join("\n"),
      );
  }

  async updateNoteAttributes(updatableNoteAttrs: ShopifyOrder["noteAttributes"]) {
    const merged = new Map(
      this.noteAttributes.concat(updatableNoteAttrs).map(({ name, value }) => [name, value]),
    );

    return fetch(
      `https://survaq.myshopify.com/admin/api/${API_VERSION}/orders/${this.numericId}.json`,
      {
        method: "PUT",
        body: JSON.stringify({
          order: {
            id: String(this.numericId),
            note_attributes: Array.from(merged, ([name, value]) => ({
              name,
              value,
            })),
          },
        }),
        headers: this.headers,
      },
    );
  }
}

type LineItemCustomAttr = {
  id: number;
  name: string;
  _skus: string[];
};

const LINE_ITEMS = "__line_items";
const EMPTY_ARRAY = "[]";
const SKUS = "_skus";

export const getPersistedListItemCustomAttrs = (data: ShopifyOrder): LineItemCustomAttr[] => {
  const { value } = data.noteAttributes.find(({ name }) => name === LINE_ITEMS) ?? {};
  return JSON.parse(value || EMPTY_ARRAY);
};

export const getNewLineItemCustomAttrs = async (
  data: ShopifyOrder,
  client: DB,
): Promise<[LineItemCustomAttr[], Error[]]> => {
  const skusByLineItemId = Object.fromEntries(
    getPersistedListItemCustomAttrs(data)
      .filter(({ [SKUS]: skus }) => skus.length > 0)
      .map(({ id, [SKUS]: skus }) => [id, JSON.stringify(skus)]),
  );

  const res = await Promise.allSettled(
    data.lineItems.map(async ({ id, name, properties, variant_id }) => {
      let skus: string | undefined | null =
        skusByLineItemId[id] ?? properties.find((p) => p.name === SKUS)?.value;
      if (!skus || skus === EMPTY_ARRAY) skus = (await client.getVariant(variant_id))?.skusJSON;

      return { id, name, [SKUS]: JSON.parse(skus || EMPTY_ARRAY) };
    }),
  );

  return res.reduce<[LineItemCustomAttr[], Error[]]>(
    ([successes, errs], result) => {
      if (result.status === "fulfilled") successes.push(result.value);
      else errs.push(result.reason);
      return [successes, errs];
    },
    [[], []],
  );
};

export const eqLineItemCustomAttrs = (
  dataA: LineItemCustomAttr[],
  dataB: LineItemCustomAttr[],
): boolean => {
  if (dataA.length !== dataB.length) return false;

  const sortedA = [...dataA].sort((a, b) => a.id - b.id);
  const sortedB = [...dataB].sort((a, b) => a.id - b.id);

  return sortedA.every((a, index) => {
    const b = sortedB[index];
    if (a.id !== b?.id) return false;
    const [skusA, skusB] = [new Set(a._skus), new Set(b._skus)];
    return skusA.size === skusB.size && [...skusA].every((item) => skusB.has(item));
  });
};

export const makeUpdatableLineItemNoteAttr = (data: LineItemCustomAttr[]) => {
  return { name: LINE_ITEMS, value: JSON.stringify(data) };
};

export const hasNoSkuLineItem = (data: LineItemCustomAttr[]) => {
  return data.some(({ _skus }) => _skus.length < 1);
};

export type DeliveryScheduleCustomAttrs = {
  estimate: string;
};

const DELIVERY_SCHEDULE = "__delivery_schedule";
const EMPTY = "{}";

export const getPersistedDeliveryScheduleCustomAttrs = (
  data: ShopifyOrder,
): DeliveryScheduleCustomAttrs | Record<string, never> => {
  const { value } = data.noteAttributes.find(({ name }) => name === DELIVERY_SCHEDULE) ?? {};
  return JSON.parse(value || EMPTY);
};

export const hasPersistedDeliveryScheduleCustomAttrs = (data: ShopifyOrder) => {
  return "estimate" in getPersistedDeliveryScheduleCustomAttrs(data);
};

export const getNewDeliveryScheduleCustomAttrs = async (
  data: LineItemCustomAttr[],
  client: DB,
): Promise<DeliveryScheduleCustomAttrs | null> => {
  const codes = [...new Set(data.flatMap(({ _skus }) => _skus))];
  const skus = await client.getDeliverySchedulesBySkuCodes(codes);
  const schedules = skus.map((sku) =>
    makeSchedule(sku.currentInventoryOrderSKU?.ShopifyInventoryOrders.deliverySchedule ?? null),
  );

  // skusがスケジュール計算対象外ものだけで構成されている場合は、スケジュール未確定とする
  if (schedules.length < 1) return null;

  // schedulesが過去日だけで構成されていると、latest()が過去日を返してしまうためmakeSchedule(null)を混ぜて抑制
  const estimate = latest([...schedules, makeSchedule(null)]);

  // latestに1つ以上の要素で構成される配列を渡しているので、estimateがnullになることは無いはずだが、一応ケアしておく
  if (!estimate) return null;

  return {
    estimate: `${estimate.year}-${estimate.month}-${estimate.term}`,
  };
};

export const makeUpdatableDeliveryScheduleNoteAttr = (data: DeliveryScheduleCustomAttrs) => {
  return { name: DELIVERY_SCHEDULE, value: JSON.stringify(data) };
};
