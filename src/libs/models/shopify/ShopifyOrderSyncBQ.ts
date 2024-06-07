import { ShopifyOrderForNoteAttrs } from "./ShopifyOrderForNoteAttrs";
import { BigQueryClient } from "../bigquery/BigQueryClient";

export class ShopifyOrderSyncBQ extends ShopifyOrderForNoteAttrs {
  private _graphqlOrder: OrderGraphQLResponse | undefined;
  private bq: BigQueryClient;

  constructor(env: {
    SHOPIFY_ACCESS_TOKEN: string;
    DATABASE_URL: string;
    GCP_SERVICE_ACCOUNT: string;
  }) {
    super(env);
    this.bq = new BigQueryClient(env);
  }

  get graphqlOrder(): OrderGraphQLResponse {
    if (!this._graphqlOrder) throw new Error("Execute prepare() before");
    return this._graphqlOrder;
  }

  get id() {
    return super.gid;
  }

  get name() {
    return super.code;
  }

  get visit(): Visit {
    const firstVisit = this.graphqlOrder.order.customerJourneySummary?.firstVisit;
    const utmSource = decode(firstVisit?.utmParameters?.source);
    const customVisit: CustomVisit = {
      source: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
    };

    this.lineItems
      .flatMap(({ properties }) => properties)
      .forEach(({ name, value }) => {
        if (name === "_source") customVisit.source = value;
        if (name === "_utm_source") customVisit.utm_source = value;
        if (name === "_utm_medium") customVisit.utm_medium = value;
        if (name === "_utm_campaign") customVisit.utm_campaign = value;
        if (name === "_utm_content") customVisit.utm_content = value;
        if (name === "_utm_term") customVisit.utm_term = value;
      });

    return {
      landing_page: firstVisit?.landingPage || null,
      referrer_url: firstVisit?.referrerUrl || null,
      source:
        (firstVisit?.source === "an unknown source" ? utmSource : firstVisit?.source) ||
        customVisit.source ||
        null,
      source_type: firstVisit?.sourceType || null,
      utm_source: utmSource || customVisit.utm_source || null,
      utm_medium:
        decode(firstVisit?.utmParameters?.medium) || decode(customVisit.utm_medium) || null,
      utm_campaign:
        decode(firstVisit?.utmParameters?.campaign) || decode(customVisit.utm_campaign) || null,
      utm_content:
        decode(firstVisit?.utmParameters?.content) || decode(customVisit.utm_content) || null,
      utm_term: decode(firstVisit?.utmParameters?.term) || decode(customVisit.utm_term) || null,
    };
  }

  async prepare(id: number | string) {
    await this.setOrderById(id, true);
    await this.completeLineItem();
    this._graphqlOrder = await this.graphql<OrderGraphQLResponse>(orderGraphQLQuery(this.gid), {});
  }

  createBQOrdersTableData(): BQOrdersTable {
    return {
      id: this.id,
      name: this.name,
      display_financial_status: this.graphqlOrder.order.displayFinancialStatus,
      display_fulfillment_status: this.graphqlOrder.order.displayFulfillmentStatus,
      closed: this.isClosed,
      total_price: this.totalPrice,
      subtotal_price: this.subTotalPrice,
      total_shopping_price: this.totalShippingPrice,
      total_refunded_price: Number(this.graphqlOrder.order.totalRefundedSet.shopMoney.amount),
      total_refunded_shipping_price: Number(
        this.graphqlOrder.order.totalRefundedShippingSet.shopMoney.amount,
      ),
      without_tax_total_price: this.totalPrice - this.totalTax,
      total_tax: this.totalTax,
      taxes_included: this.taxesIncluded,
      subtotal_line_item_quantity: this.lineItemQuantity,
      closed_at: this.closedAt?.toISOString() || null,
      cancelled_at: this.cancelledAt?.toISOString() || null,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt?.toISOString() || null,
      fulfilled_at: this.fulfilledAt?.toISOString() || null,
      ...this.visit,
    };
  }

  createBQLineItemsTableData(): BQLineItemsTable[] {
    return this.lineItems.map(
      ({ admin_graphql_api_id, name, variant_id, product_id, quantity, price, tax_lines }) => {
        const totalPrice = Number(price);
        const taxPrice = Number(tax_lines[0]?.price || "0");
        const withoutTaxTotalPrice = totalPrice - taxPrice;
        return {
          id: admin_graphql_api_id,
          name,
          order_id: this.id,
          variant_id: gidVariant(variant_id),
          product_id: gidProduct(product_id),
          quantity,
          original_total_price: totalPrice,
          tax_price: taxPrice,
          without_tax_total_price: withoutTaxTotalPrice,
          delivery_schedule: null,
          skus: null,
          sku_quantity: null,
        };
      },
    );
  }

  createBQOrderSKUsTableData(): BQOrderSKUsTable[] {
    const skusByLineItemId = new Map<number, string[]>(
      this.completedLineItem.map(({ id, _skus }) => [id, _skus]),
    );

    return this.lineItems.flatMap((lineItem) => {
      const skus = skusByLineItemId.get(lineItem.id);
      if (!skus) return [];
      const quantityBySku = skus.reduce<Record<string, number>>((acc, sku) => {
        return { ...acc, [sku]: (acc[sku] ?? 0) + 1 };
      }, {});
      const fulfilledAt =
        this.fulfillments.find(({ line_items }) => line_items.some(({ id }) => id === lineItem.id))
          ?.created_at ?? null;

      return Object.entries(quantityBySku).map(([code, quantity]) => ({
        code,
        order_id: this.id,
        line_item_id: lineItem.admin_graphql_api_id,
        product_id: gidProduct(lineItem.product_id),
        variant_id: gidVariant(lineItem.variant_id),
        ordered_at: this.createdAt.toISOString(),
        fulfilled_at: fulfilledAt,
        canceled_at: this.cancelledAt?.toISOString() || null,
        closed_at: this.closedAt?.toISOString() || null,
        quantity: quantity * lineItem.quantity,
      }));
    });
  }

  get upsertBQOrdersTableDataQuery() {
    const data = this.createBQOrdersTableData();
    return `DELETE FROM \`shopify.orders\` WHERE id = '${this.gid}';
        INSERT INTO \`shopify.orders\` (${Object.keys(data).join(", ")})
        VALUES (${Object.values(data).map(valueToSQL).join(", ")});`;
  }

  async upsertBQOrdersTableData() {
    await this.bq.query(this.upsertBQOrdersTableDataQuery);
  }

  get upsertBQLineItemsTableDataQuery() {
    const data = this.createBQLineItemsTableData();
    let query = `DELETE FROM \`shopify.line_items\` WHERE order_id = '${this.gid}';`;
    if (data.length) {
      query += `
          INSERT INTO \`shopify.line_items\` (${Object.keys(data[0]!).join(", ")})
          VALUES ${data.map((d) => `(${Object.values(d).map(valueToSQL).join(", ")})`).join(", ")};`;
    }
    return query;
  }

  async upsertBQLineItemsTableData() {
    await this.bq.query(this.upsertBQLineItemsTableDataQuery);
  }

  get upsertBQOrderSKUsTableDataQuery() {
    const data = this.createBQOrderSKUsTableData();
    let query = `DELETE FROM \`shopify.order_skus\` WHERE order_id = '${this.gid}';`;
    if (data.length) {
      query += `
          INSERT INTO \`shopify.order_skus\` (${Object.keys(data[0]!).join(", ")})
          VALUES ${data.map((d) => `(${Object.values(d).map(valueToSQL).join(", ")})`).join(", ")};`;
    }
    return query;
  }

  async upsertBQOrderSKUsTableData() {
    await this.bq.query(this.upsertBQOrderSKUsTableDataQuery);
  }

  async bulkUpsertBQTables() {
    const query = [
      this.upsertBQOrdersTableDataQuery,
      this.upsertBQLineItemsTableDataQuery,
      this.upsertBQOrderSKUsTableDataQuery,
    ].join("\n");

    await this.bq.query(query);
  }

  // 確認用
  async getBQOrdersTableData() {
    const res = await this.bq.query<BQOrdersTable>(
      `SELECT * FROM \`shopify.orders\` WHERE id = '${this.gid}'`,
    );
    return res[0];
  }

  // 確認用
  async getBQLineItemsTableData() {
    return this.bq.query<BQLineItemsTable>(
      `SELECT * FROM \`shopify.line_items\` WHERE order_id = '${this.gid}'`,
    );
  }

  // 確認用
  async getBQOrderSKUsTableData() {
    return this.bq.query<BQOrderSKUsTable>(
      `SELECT * FROM \`shopify.order_skus\` WHERE order_id = '${this.gid}'`,
    );
  }
}

type BQOrdersTable = {
  id: string;
  name: string;
  display_financial_status: string;
  display_fulfillment_status: string;
  closed: boolean;
  total_price: number;
  subtotal_price: number;
  // MEMO: データベースでタイポしている(shopping -> shipping)
  total_shopping_price: number;
  total_refunded_price: number;
  total_refunded_shipping_price: number;
  without_tax_total_price: number;
  total_tax: number;
  taxes_included: boolean;
  subtotal_line_item_quantity: number;
  closed_at: string | null;
  cancelled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  fulfilled_at: string | null;
  landing_page: string | null;
  referrer_url: string | null;
  source: string | null;
  source_type: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
};

type BQLineItemsTable = {
  id: string;
  name: string;
  order_id: string;
  variant_id: string | null;
  product_id: string | null;
  quantity: number;
  original_total_price: number;
  tax_price: number;
  without_tax_total_price: number;
  delivery_schedule: null; // Deprecated
  skus: null; // Deprecated
  sku_quantity: null; // Deprecated
};

type BQOrderSKUsTable = {
  code: string;
  order_id: string;
  line_item_id: string;
  product_id: string | null;
  variant_id: string | null;
  ordered_at: string;
  fulfilled_at: string | null;
  canceled_at: string | null;
  closed_at: string | null;
  quantity: number;
};

const orderGraphQLQuery = (id: string) => `query {
  order(id: "${id}") {
    displayFinancialStatus
    displayFulfillmentStatus
    totalRefundedSet {
      shopMoney {
        amount
      }
    }
    totalRefundedShippingSet {
      shopMoney {
        amount
      }
    }
    customerJourneySummary {
      firstVisit {
        landingPage
        referrerUrl
        source
        sourceType
        utmParameters {
          source
          medium
          campaign
          content
          term
        }
      }
    }
  }
}`;

type OrderGraphQLResponse = {
  order: {
    displayFinancialStatus: string;
    displayFulfillmentStatus: string;
    totalRefundedSet: ShopMoney;
    totalRefundedShippingSet: ShopMoney;
    customerJourneySummary?: {
      firstVisit?: {
        landingPage?: string;
        referrerUrl?: string;
        source?: string;
        sourceType?: string;
        utmParameters?: {
          source?: string;
          medium?: string;
          campaign?: string;
          content?: string;
          term?: string;
        };
      };
    };
  };
};

type ShopMoney = {
  shopMoney: {
    amount: string;
  };
};

type Visit = Pick<
  BQOrdersTable,
  | "landing_page"
  | "referrer_url"
  | "source"
  | "source_type"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_content"
  | "utm_term"
>;

type CustomVisit = {
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
};

const decode = <T extends string | null | undefined>(src: T): T => {
  if (typeof src !== "string") return src;
  try {
    return decodeURI(src) as T;
  } catch (_) {
    return src;
  }
};

const gidVariant = (id: number) => `gid://shopify/ProductVariant/${id}`;
const gidProduct = (id: number) => `gid://shopify/Product/${id}`;

const valueToSQL = (value: string | number | boolean | null) => {
  if (value === null) return "NULL";
  if (typeof value === "string") return `'${value}'`;
  return value;
};
