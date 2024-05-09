import { ShopifyOrderData } from "../../../types/shopify";

export class ShopifyOrder {
  constructor(private env: { SHOPIFY_ACCESS_TOKEN: string }) {}
  private _order: ShopifyOrderData | undefined;
  protected readonly API_VERSION = "2024-04";

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
      `https://survaq.myshopify.com/admin/api/${this.API_VERSION}/orders/${id}.json`,
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

  get noteAttributes() {
    return this.order.note_attributes;
  }

  get createdAt() {
    return new Date(this.order.created_at);
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

  get closedAt() {
    return this.order.closed_at ? new Date(this.order.closed_at) : null;
  }
}
