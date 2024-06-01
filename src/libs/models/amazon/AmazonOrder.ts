import { AmazonClient } from "./AmazonClient";

type Money = {
  Amount?: string;
  CurrencyCode?: string;
};

type PaymentExecutionDetailItem = {
  Payment: Money;
  PaymentMethod: "COD" | "GC" | "PointsAccount" | "Invoice";
};

// https://developer-docs.amazon.com/sp-api/lang-ja_JP/docs/orders-api-v0-reference#order
type Order = {
  AmazonOrderId: string;
  SellerOrderId?: string;
  PurchaseDate: string;
  LastUpdateDate: string;
  OrderStatus:
    | "PendingAvailability"
    | "Pending"
    | "Unshipped"
    | "PartiallyShipped"
    | "Shipped"
    | "InvoiceUnconfirmed"
    | "Canceled"
    | "Unfulfillable";
  FulfillmentChannel?: "AFN" | "MFN";
  SalesChannel?: string;
  OrderChannel?: string;
  ShipServiceLevel?: string;
  OrderTotal?: Money;
  NumberOfItemsShipped?: number;
  NumberOfItemsUnshipped?: number;
  PaymentExecutionDetail?: PaymentExecutionDetailItem[];
  PaymentMethod?: "COD" | "CVS" | "Other";
  PaymentMethodDetails?: string[];
  MarketplaceId?: string;
  ShipmentServiceLevelCategory?:
    | "Expedited"
    | "FreeEconomy"
    | "NextDay"
    | "Priority"
    | "SameDay"
    | "SecondDay"
    | "Scheduled"
    | "Standard";
  EasyShipShipmentStatus?:
    | "PendingSchedule"
    | "PendingPickUp"
    | "PendingDropOff"
    | "LabelCanceled"
    | "PickedUp"
    | "DropOff"
    | "AtOriginFC"
    | "AtDestinationFC"
    | "Delivered"
    | "RejectedByBuyer"
    | "Undeliverable"
    | "ReturnedToSeller"
    | "ReturningToSeller"
    | "Lost"
    | "OutForDelivery"
    | "Damaged";
  CbaDisplayableShippingLabel?: string;
  OrderType?:
    | "StandardOrder"
    | "LongLeadTimeOrder"
    | "Preorder"
    | "BackOrder"
    | "SourcingOnDemandOrder";
  EarliestShipDate?: string;
  LatestShipDate?: string;
  EarliestDeliveryDate?: string;
  LatestDeliveryDate?: string;
  IsBusinessOrder?: boolean;
  IsPrime?: boolean;
  IsGlobalExpressEnabled?: boolean;
  ReplaceOrderID?: string;
  IsReplacementOrder?: boolean;
  PromiseResponseDueDate?: string;
  IsEstimatedShipDateSet?: boolean;
  IsSoldByAB?: boolean;
  IsIBA?: boolean;
  BuyerInvoicePreference?: "INDIVIDUAL" | "BUSINESS";
  FulfillmentInstruction?: {
    FulfillmentSupplySourceId?: string;
  };
  IsISPU?: boolean;
  IsAccessPointOrder?: boolean;
  SellerDisplayName?: string;
  BuyerInfo?: {
    BuyerName?: string;
    BuyerEmail?: string;
    BuyerCounty?: string;
    BuyerTaxInfo?: {
      CompanyLegalName?: string;
      TaxingRegion?: string;
      TaxClassifications?: {
        Name?: string;
        Value?: string;
      }[];
    };
  };
  HasRestrictedItems?: boolean;
  ElectronicInvoiceStatus?: "NotRequired" | "NotFound" | "Processing" | "Errored" | "Accepted";
};

type GetOrderResponse = {
  payload: {
    Orders: Order[];
    NextToken?: string;
    CreatedBefore: string;
  };
};

type OrderItem = {
  ASIN: string;
  SellerSKU?: string;
  OrderItemId: string;
  Title?: string;
  QuantityOrdered: number;
  QuantityShipped: number;
  ProductInfo?: {
    NumberOfItems: number;
  };
  PointsGranted?: {
    PointsNumber: number;
    PointsMonetaryValue: Money;
  };
  ItemPrice?: Money;
  ShippingPrice?: Money;
  ItemTax?: Money;
  ShippingTax?: Money;
  ShippingDiscount?: Money;
  ShippingDiscountTax?: Money;
  PromotionDiscount?: Money;
  PromotionDiscountTax?: Money;
  PromotionIds: string[];
  CODFee?: Money;
  CODFeeDiscount?: Money;
  IsGift?: "true" | "false";
  ConditionNote?: string;
  ConditionId?: "New" | "Used" | "Collectible" | "Refurbished" | "Preorder" | "Club";
  ConditionSubtypeId?: string;
  ScheduledDeliveryStartDate?: string;
  ScheduledDeliveryEndDate?: string;
  PriceDesignation?: "BusinessPrice" | "ConsumerPrice";
  TaxCollection?: {
    Model?: "MarketplaceFacilitator" | "Developer";
    ResponsibleParty?: "Marketplace" | "Seller";
  };
  SerialNumberRequired?: boolean;
  IsTransparency?: boolean;
  IossNumber?: string;
  StoreChainStoreId?: string;
  DeemedResellerCategory?: "IOSS" | "UOSS";
  BuyerInfo?: {
    BuyerCustomizedInfo?: {
      CustomizedURL?: string;
    };
    GiftWrapPrice?: Money;
    GiftWrapTax?: Money;
    GiftMessageText?: string;
    GiftWrapLevel?: string;
  };
  BuyerRequestedCancel?: {
    IsBuyerRequestedCancel?: "true" | "false";
    BuyerCancelReason?: string;
  };
  SerialNumbers?: string[];
  SubstitutionPreferences?: {
    SubstitutionType?: "CUSTOMER_PREFERENCE" | "AMAZON_RECOMMENDED" | "DO_NOT_SUBSTITUTE";
    SubstitutionOptions?: {
      ASIN?: string;
      QuantityOrdered?: number;
      SellerSKU?: string;
      Title?: string;
      Measurement?: {
        Value?: number;
        Unit?: string;
      };
    }[];
  };
  Measurement?: {
    Value?: number;
    Unit?: string;
  };
  ShippingConstraints?: {
    PalletDelivery?: "MANDATORY";
  };
};

type GetOrderItemsResponse = {
  payload: {
    OrderItems: OrderItem[];
    NextToken?: string;
    AmazonOrderId: string;
  };
};

export class AmazonOrder extends AmazonClient {
  static ordersEndpoint = "https://sellingpartnerapi-fe.amazon.com/orders/v0/orders";
  static orderItemsEndpoint =
    "https://sellingpartnerapi-fe.amazon.com/orders/v0/orders/{amazonOrderId}/orderItems";

  // https://developer-docs.amazon.com/sp-api/lang-ja_JP/docs/orders-api-v0-reference
  async getOrders(): Promise<Order[]> {
    const url = new URL(AmazonOrder.ordersEndpoint);
    url.searchParams.append("MarketplaceIds", "A1VC38T7YXB528"); // JP (https://docs.developer.amazonservices.com/ja_JP/dev_guide/DG_Endpoints.html)
    url.searchParams.append("MaxResultsPerPage", "10");
    // CreatedAfterかLastUpdatedAfterのどちらかを指定する必要がある
    url.searchParams.append("CreatedAfter", new Date("2024-04-01").toISOString());

    const res = await this.request<GetOrderResponse>(url);
    return res.payload.Orders;
  }

  async getOrderItems(amazonOrderId: string) {
    const url = new URL(AmazonOrder.orderItemsEndpoint.replace("{amazonOrderId}", amazonOrderId));
    const res = await this.request<GetOrderItemsResponse>(url);

    return res.payload.OrderItems;
  }
}
