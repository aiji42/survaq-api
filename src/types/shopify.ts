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

export type ShopifyOrder = {
  id: number;
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
    default_address: {
      name: string;
    };
  };
  customer_locale: string;
};
