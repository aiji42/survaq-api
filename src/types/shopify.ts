export type ShopifyProduct = {
  id: number;
  body_html?: string;
  handle?: string;
  title: string;
  status: "active" | "draft" | "archived";
  variants?: Array<{
    id: number;
    title: string;
  }>;
};

export type ShopifyOrderData = {
  id: number;
  admin_graphql_api_id: string;
  created_at: string;
  name: string;
  note_attributes: Array<{ name: string; value: string }>;
  line_items: {
    id: number;
    variant_id: number;
    name: string;
    properties: Array<{ name: string; value: string }>;
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
