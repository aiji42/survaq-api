import { ShopifyOrderData } from "../../../types/shopify";
import { ShopifyClient } from "./ShopifyClient";
import { isTestOrder } from "../../utils";
import { CustomNotFoundError } from "../../errors";

export class ShopifyOrder extends ShopifyClient {
  private _order: ShopifyOrderData | undefined;
  protected readonly LINE_ITEMS = "__line_items";
  protected readonly DELIVERY_SCHEDULE = "__delivery_schedule";
  protected readonly SKUS = "_skus";
  protected readonly EMPTY_ARRAY = "[]";
  protected readonly EMPTY_OBJ = "{}";

  setOrder(order: ShopifyOrderData) {
    this._order = order;
    return this;
  }

  async setOrderById(_id: number | string) {
    const id = Number(_id);

    const res = await fetch(
      `https://survaq.myshopify.com/admin/api/${this.API_VERSION}/orders/${id}.json`,
      { headers: this.headers },
    );
    if (res.status === 404) throw new CustomNotFoundError(`Order not found: (id: ${id})`);
    if (!res.ok) throw new Error(await res.text());

    this._order = ((await res.json()) as { order: ShopifyOrderData }).order;

    return this;
  }

  get isOrderSet() {
    return !!this._order;
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
    return this.order.admin_graphql_api_id;
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

  get currency() {
    return this.order.currency;
  }

  // 割引は加味、送料・税金は除く
  get subTotalPrice() {
    return Number(this.order.subtotal_price);
  }

  // 割引・送料・税金を含む
  get totalPrice() {
    return Number(this.order.total_price);
  }

  get totalTax() {
    return Number(this.order.total_tax);
  }

  get totalShippingPrice() {
    return Number(this.order.total_shipping_price_set.shop_money.amount);
  }

  get taxesIncluded() {
    return this.order.taxes_included;
  }

  get lineItemQuantity() {
    return this.lineItems.reduce((sum, { quantity }) => sum + quantity, 0);
  }

  get note() {
    return this.order.note;
  }

  get noteAttributes() {
    return this.order.note_attributes;
  }

  get createdAt() {
    return new Date(this.order.created_at);
  }

  get updatedAt() {
    return this.order.updated_at ? new Date(this.order.updated_at) : null;
  }

  get fulfillmentStatus() {
    return this.order.fulfillment_status;
  }

  get financialStatus() {
    return this.order.financial_status;
  }

  get cancelledAt() {
    return this.order.cancelled_at ? new Date(this.order.cancelled_at) : null;
  }

  get isCancelled() {
    return !!this.cancelledAt;
  }

  get closedAt() {
    return this.order.closed_at ? new Date(this.order.closed_at) : null;
  }

  get isClosed() {
    return !!this.closedAt;
  }

  get isTest() {
    return isTestOrder(this.order.customer.email, this.order.customer.default_address?.name ?? "");
  }

  get fulfillments() {
    return this.order.fulfillments;
  }

  get fulfilledAt() {
    const fulfillment = this.order.fulfillments[0];
    return fulfillment?.created_at ? new Date(fulfillment.created_at) : null;
  }

  get savedLineItemAttrs(): LineItemAttr[] {
    const { value } = this.noteAttributes.find(({ name }) => name === this.LINE_ITEMS) ?? {};
    return JSON.parse(value || this.EMPTY_ARRAY);
  }

  private get savedDeliveryScheduleAttrs() {
    const { value } = this.noteAttributes.find(({ name }) => name === this.DELIVERY_SCHEDULE) ?? {};
    return JSON.parse(value || this.EMPTY_OBJ);
  }

  get validSavedDeliveryScheduleAttrs(): DeliveryScheduleAttrs {
    if (!this.hasValidSavedDeliveryScheduleAttrs)
      throw new Error("Invalid saved delivery schedule attrs");
    return this.savedDeliveryScheduleAttrs;
  }

  get hasValidSavedDeliveryScheduleAttrs() {
    return (
      "estimate" in this.savedDeliveryScheduleAttrs && !!this.savedDeliveryScheduleAttrs.estimate
    );
  }

  get adminUrl() {
    return `https://admin.shopify.com/store/survaq/orders/${this.numericId}`;
  }

  get statusPageUrl() {
    return this.order.order_status_url;
  }

  get isUnmanaged() {
    return this.savedLineItemAttrs.every(
      ({ _skus }) => _skus.length === 1 && _skus[0] === "un_managed",
    );
  }

  async updateNoteAttributes(attributes: { name: string; value: string }[], overwrite = false) {
    const merged = !overwrite
      ? new Map(this.noteAttributes.concat(attributes).map(({ name, value }) => [name, value]))
      : new Map(attributes.map(({ name, value }) => [name, value]));

    const res = await fetch(
      `https://survaq.myshopify.com/admin/api/${this.API_VERSION}/orders/${this.numericId}.json`,
      {
        method: "PUT",
        headers: this.headers,
        body: JSON.stringify({
          order: {
            id: String(this.numericId),
            note_attributes: Array.from(merged, ([name, value]) => ({
              name,
              value,
            })),
          },
        }),
      },
    );

    if (!res.ok) throw new Error(await res.text());
  }

  async updateNote(text: string, overwrite = false) {
    const note = this.note && !overwrite ? `${this.note}\n\n${text}` : text;
    const res = await fetch(
      `https://survaq.myshopify.com/admin/api/${this.API_VERSION}/orders/${this.numericId}.json`,
      {
        method: "PUT",
        headers: this.headers,
        body: JSON.stringify({
          order: {
            id: String(this.numericId),
            note,
          },
        }),
      },
    );

    if (!res.ok) throw new Error(await res.text());
  }

  async graphql<T extends Record<string, any>>(
    query: string,
    variables: Record<string, any>,
  ): Promise<T> {
    const res = await fetch(
      `https://survaq.myshopify.com/admin/api/${this.API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ query, variables }),
      },
    );
    if (!res.ok) throw new Error(await res.text());

    const result: GraphQLResponse<T> = await res.json();

    if ("errors" in result) throw new Error(result.errors.map(({ message }) => message).join("\n"));

    return result.data;
  }
}

export type LineItemAttr = {
  id: number;
  name: string;
  _skus: string[];
};

export type DeliveryScheduleAttrs = {
  estimate: string;
};

type GraphQLResponse<T extends Record<string, any>> =
  | {
      data: T;
    }
  | {
      errors: { message: string }[];
    };
