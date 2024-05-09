import { ShopifyOrderData } from "../../src/types/shopify";

const base = {
  id: 5941690892493,
  admin_graphql_api_id: "gid://shopify/Order/5941690892493",
  app_id: 580111,
  browser_ip: "58.138.187.2",
  buyer_accepts_marketing: true,
  cancel_reason: null,
  cancelled_at: null,
  cart_token: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  checkout_id: 52588049400013,
  checkout_token: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  client_details: {
    accept_language: "ja-JP",
    browser_height: null,
    browser_ip: "58.138.187.2",
    browser_width: null,
    session_hash: null,
    user_agent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  },
  closed_at: null,
  company: null,
  confirmation_number: "IWJU8MDDL",
  confirmed: true,
  contact_email: "example@example.com",
  created_at: "2024-05-09T09:41:36+09:00",
  currency: "JPY",
  current_subtotal_price: "19800",
  current_subtotal_price_set: {
    shop_money: {
      amount: "19800",
      currency_code: "JPY",
    },
    presentment_money: {
      amount: "19800",
      currency_code: "JPY",
    },
  },
  current_total_additional_fees_set: null,
  current_total_discounts: "0",
  current_total_discounts_set: {
    shop_money: {
      amount: "0",
      currency_code: "JPY",
    },
    presentment_money: {
      amount: "0",
      currency_code: "JPY",
    },
  },
  current_total_duties_set: null,
  current_total_price: "19800",
  current_total_price_set: {
    shop_money: {
      amount: "19800",
      currency_code: "JPY",
    },
    presentment_money: {
      amount: "19800",
      currency_code: "JPY",
    },
  },
  current_total_tax: "1800",
  current_total_tax_set: {
    shop_money: {
      amount: "1800",
      currency_code: "JPY",
    },
    presentment_money: {
      amount: "1800",
      currency_code: "JPY",
    },
  },
  customer_locale: "ja-JP",
  device_id: null,
  discount_codes: [],
  duties_included: false,
  email: "example@example.com",
  estimated_taxes: false,
  financial_status: "pending",
  fulfillment_status: null,
  landing_site:
    "/?utm_source=google&utm_medium=cpc&utm_campaign=6888758837453_【ショッピング】スマートショッピング広告2&gad_source=1&gclid=Cj0KCQjwxeyxBhC7ARIsAC7dS38a5nn7SA61Kj1ZpaY0z5Y_HQuiCi-lczj0OKqUyG1GzLXkcXVpIGIaAkUnEALw_wcB",
  landing_site_ref: null,
  location_id: null,
  merchant_of_record_app_id: null,
  name: "#S103241",
  note: "",
  note_attributes: [
    {
      name: "__buddy_data",
      value:
        '[{"promotionId":2823,"promotionType":"CART_LINE_EDITOR","updatedAt":"2024-05-06T06:23:10.004Z","isPromotionApplied":false,"useAbProducts":false}]',
    },
  ],
  number: 102241,
  order_number: 103241,
  order_status_url:
    "https://survaq-store.com/56288444621/orders/f78fceaf9f83bfa89b689c71f0df6687/authenticate?key=xxxxxxxxxxxxxxxxxxxxx",
  original_total_additional_fees_set: null,
  original_total_duties_set: null,
  payment_gateway_names: ["【新】コンビニ決済 - SBPS"],
  phone: null,
  po_number: null,
  presentment_currency: "JPY",
  processed_at: "2024-05-09T09:41:34+09:00",
  reference: "86c6423b53d44855536041c69175e54b",
  referring_site: "https://www.google.com/",
  source_identifier: "86c6423b53d44855536041c69175e54b",
  source_name: "web",
  source_url: null,
  subtotal_price: "19800",
  subtotal_price_set: {
    shop_money: {
      amount: "19800",
      currency_code: "JPY",
    },
    presentment_money: {
      amount: "19800",
      currency_code: "JPY",
    },
  },
  tags: "",
  tax_exempt: false,
  tax_lines: [
    {
      price: "1800",
      rate: 0.1,
      title: "CT",
      price_set: {
        shop_money: {
          amount: "1800",
          currency_code: "JPY",
        },
        presentment_money: {
          amount: "1800",
          currency_code: "JPY",
        },
      },
      channel_liable: false,
    },
  ],
  taxes_included: true,
  test: false,
  token: "xxxxxxxxxxxxxxxxxxxxxxxxxxx",
  total_discounts: "0",
  total_discounts_set: {
    shop_money: {
      amount: "0",
      currency_code: "JPY",
    },
    presentment_money: {
      amount: "0",
      currency_code: "JPY",
    },
  },
  total_line_items_price: "19800",
  total_line_items_price_set: {
    shop_money: {
      amount: "19800",
      currency_code: "JPY",
    },
    presentment_money: {
      amount: "19800",
      currency_code: "JPY",
    },
  },
  total_outstanding: "19800",
  total_price: "19800",
  total_price_set: {
    shop_money: {
      amount: "19800",
      currency_code: "JPY",
    },
    presentment_money: {
      amount: "19800",
      currency_code: "JPY",
    },
  },
  total_shipping_price_set: {
    shop_money: {
      amount: "0",
      currency_code: "JPY",
    },
    presentment_money: {
      amount: "0",
      currency_code: "JPY",
    },
  },
  total_tax: "1800",
  total_tax_set: {
    shop_money: {
      amount: "1800",
      currency_code: "JPY",
    },
    presentment_money: {
      amount: "1800",
      currency_code: "JPY",
    },
  },
  total_tip_received: "0",
  total_weight: 0,
  updated_at: "2024-05-09T15:26:14+09:00",
  user_id: null,
  billing_address: {
    first_name: "太郎",
    address1: "熱田区金山",
    phone: "08012341234",
    city: "名古屋市",
    zip: "456-0001",
    province: "Aichi",
    country: "Japan",
    last_name: "田中",
    address2: null,
    company: null,
    latitude: 35.0,
    longitude: 136.0,
    name: "田中太郎",
    country_code: "JP",
    province_code: "JP-23",
  },
  customer: {
    id: 5902215971021,
    email: "example@example.com",
    created_at: "2023-10-27T12:40:35+09:00",
    updated_at: "2024-05-09T09:41:36+09:00",
    first_name: "太郎",
    last_name: "田中",
    state: "disabled",
    note: "",
    verified_email: true,
    multipass_identifier: null,
    tax_exempt: false,
    phone: null,
    email_marketing_consent: {
      state: "subscribed",
      opt_in_level: "single_opt_in",
      consent_updated_at: "2023-10-27T12:40:57+09:00",
    },
    sms_marketing_consent: null,
    tags: "田中太郎",
    currency: "JPY",
    tax_exemptions: [],
    admin_graphql_api_id: "gid://shopify/Customer/5902215971021",
    default_address: {
      id: 10237889511629,
      customer_id: 5902215971021,
      first_name: "太郎",
      last_name: "田中",
      company: null,
      address1: "熱田区金山",
      address2: null,
      city: "名古屋市",
      province: "Aichi",
      country: "Japan",
      zip: "456-0001",
      phone: "08012341234",
      name: "田中太郎",
      province_code: "JP-23",
      country_code: "JP",
      country_name: "Japan",
      default: true,
    },
  },
  discount_applications: [],
  fulfillments: [],
  line_items: [
    {
      id: 15132713976013,
      admin_graphql_api_id: "gid://shopify/LineItem/15132713976013",
      current_quantity: 1,
      fulfillable_quantity: 1,
      fulfillment_service: "manual",
      fulfillment_status: null,
      gift_card: false,
      grams: 0,
      name: "★キャンペーン中★首と肩がホッとする枕PLUS | 首と肩を40度で15分間温めることで心地よい睡眠を手に入れる為のホットまくら【PH01-CPA】 - PLUS-ダークグレー / なし / なし",
      price: "19800",
      price_set: {
        shop_money: {
          amount: "19800",
          currency_code: "JPY",
        },
        presentment_money: {
          amount: "19800",
          currency_code: "JPY",
        },
      },
      product_exists: true,
      product_id: 8817265705165,
      properties: [
        {
          name: "_skus",
          value: '["double1-PHDG","doublecover1-PHDG"]',
        },
      ],
      quantity: 1,
      requires_shipping: true,
      sku: "double1-PHDG",
      taxable: true,
      title:
        "★キャンペーン中★首と肩がホッとする枕PLUS | 首と肩を40度で15分間温めることで心地よい睡眠を手に入れる為のホットまくら【PH01-CPA】",
      total_discount: "0",
      total_discount_set: {
        shop_money: {
          amount: "0",
          currency_code: "JPY",
        },
        presentment_money: {
          amount: "0",
          currency_code: "JPY",
        },
      },
      variant_id: 47565530464461,
      variant_inventory_management: "shopify",
      variant_title: "PLUS-ダークグレー / なし / なし",
      vendor: "SurvaQストア",
      tax_lines: [
        {
          channel_liable: false,
          price: "1800",
          price_set: {
            shop_money: {
              amount: "1800",
              currency_code: "JPY",
            },
            presentment_money: {
              amount: "1800",
              currency_code: "JPY",
            },
          },
          rate: 0.1,
          title: "CT",
        },
      ],
      duties: [],
      discount_allocations: [],
    },
  ],
  payment_terms: null,
  refunds: [],
  shipping_address: {
    first_name: "太郎",
    address1: "熱田区金山",
    phone: "08012341234",
    city: "名古屋市",
    zip: "456-0001",
    province: "Aichi",
    country: "Japan",
    last_name: "田中",
    address2: null,
    company: null,
    latitude: 35.0,
    longitude: 136.0,
    name: "田中太郎",
    country_code: "JP",
    province_code: "JP-23",
  },
  shipping_lines: [
    {
      id: 4990282465485,
      carrier_identifier: "650f1a14fa979ec5c74d063e968411d4",
      code: "送料無料",
      discounted_price: "0",
      discounted_price_set: {
        shop_money: {
          amount: "0",
          currency_code: "JPY",
        },
        presentment_money: {
          amount: "0",
          currency_code: "JPY",
        },
      },
      is_removed: false,
      phone: null,
      price: "0",
      price_set: {
        shop_money: {
          amount: "0",
          currency_code: "JPY",
        },
        presentment_money: {
          amount: "0",
          currency_code: "JPY",
        },
      },
      requested_fulfillment_service_id: null,
      source: "shopify",
      title: "送料無料",
      tax_lines: [
        {
          channel_liable: false,
          price: "0",
          price_set: {
            shop_money: {
              amount: "0",
              currency_code: "JPY",
            },
            presentment_money: {
              amount: "0",
              currency_code: "JPY",
            },
          },
          rate: 0.1,
          title: "CT",
        },
      ],
      discount_allocations: [],
    },
  ],
};

export const order = ({
  email,
  financial_status = "pending",
  fulfillment_status = null,
  cancelled_at = null,
  closed_at = null,
  additionalNoteAttributes = [],
  additionalLineItems = [],
  noSKUProperties = false,
}: {
  email: string;
  financial_status?: ShopifyOrderData["financial_status"];
  fulfillment_status?: ShopifyOrderData["fulfillment_status"];
  closed_at?: Date | null;
  cancelled_at?: Date | null;
  additionalNoteAttributes?: ShopifyOrderData["note_attributes"];
  additionalLineItems?: ShopifyOrderData["line_items"];
  noSKUProperties?: boolean;
}) => {
  return {
    ...base,
    contact_email: email,
    financial_status,
    fulfillment_status,
    email,
    customer: {
      ...base.customer,
      email,
    },
    cancelled_at: cancelled_at?.toISOString() ?? null,
    closed_at: closed_at?.toISOString() ?? null,
    note_attributes: [...base.note_attributes, ...additionalNoteAttributes],
    line_items: [
      ...base.line_items.map((lineItem) => ({
        ...lineItem,
        properties: noSKUProperties ? [] : lineItem.properties,
      })),
      ...additionalLineItems,
    ],
  };
};
