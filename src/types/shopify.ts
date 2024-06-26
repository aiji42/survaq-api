export type ShopifyProductData = {
  id: number;
  body_html?: string;
  handle?: string;
  title: string;
  status: "active" | "draft" | "archived";
  variants?: Array<{
    id: number;
    title: string;
    compare_at_price: string | null;
    created_at: string;
    updated_at: string;
    price: string;
    taxable: boolean;
  }>;
  created_at: string;
  updated_at: string;
};

export type ShopifyOrderData = {
  id: number;
  admin_graphql_api_id: string;
  created_at: string;
  name: string;
  note_attributes: Array<{ name: string; value: string }>;
  note: string;
  currency: string;
  subtotal_price: string;
  total_price: string;
  total_tax: string;
  order_status_url: string;
  total_shipping_price_set: {
    shop_money: {
      amount: string;
    };
  };
  taxes_included: boolean;
  line_items: {
    id: number;
    admin_graphql_api_id: string;
    variant_id: number;
    product_id: number;
    name: string;
    title: string;
    quantity: number;
    price: string;
    tax_lines: Array<{ price: string }>;
    properties: Array<{ name: string; value: string }>;
  }[];
  fulfillments: {
    created_at: string;
    line_items: Array<{ id: number }>;
  }[];
  customer: {
    email: string;
    default_address?: {
      name: string;
    };
  };
  customer_locale: string;
  cancel_reason: null | string;
  cancelled_at: null | string;
  updated_at: null | string;
  closed_at: null | string;
  fulfillment_status: null | "fulfilled" | "partial" | "restocked";
  financial_status:
    | "pending"
    | "authorized"
    | "partially_paid"
    | "paid"
    | "partially_refunded"
    | "refunded"
    | "voided";
  payment_gateway_names: string[];
};
