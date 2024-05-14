import { ShopifyOrder } from "../shopify/ShopifyOrder";
import { LogilessClient } from "./LogilessClient";

export class LogilessSalesOrder extends LogilessClient {
  private _salesOrder: SalesOrderData | undefined;

  get salesOrder() {
    const salesOrder = this._salesOrder;
    if (!salesOrder) throw new Error("Sales order is not set");
    return salesOrder;
  }

  get id() {
    return this.salesOrder.id;
  }

  get code() {
    return this.salesOrder.code;
  }

  get deliveryStatus() {
    return this.salesOrder.delivery_status;
  }

  async setSalesOrderByShopifyOrder(shopifyOrder: ShopifyOrder) {
    // Shopifyのコードは#から始まるため、それを除外
    const code = shopifyOrder.code.replace(/^#/, "");

    const body = JSON.stringify({
      codes: [code],
    });
    const res = await fetch(`https://app2.logiless.com/api/v1/merchant/1394/sales_orders/search`, {
      headers: {
        Authorization: `Bearer ${(await this.getTokens()).accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body,
    });

    if (!res.ok) {
      console.log(await res.json());
      throw new Error("Failed to get sales order");
    }

    const {
      data: [salesOrder],
    } = (await res.json()) as { data: SalesOrderData[] };
    if (!salesOrder) throw new Error("Sales order not found");

    this._salesOrder = salesOrder;

    return this;
  }

  get cancelable():
    | { isCancelable: true; reason?: never }
    | { isCancelable: false; reason: "Working" | "Pending" | "Canceled" | "Shipped" } {
    if (this.deliveryStatus === "WaitingForShipment") return { isCancelable: true };

    if (this.deliveryStatus === "Working") return { isCancelable: false, reason: "Working" };
    if (this.deliveryStatus === "Pending") return { isCancelable: false, reason: "Pending" };
    if (this.deliveryStatus === "Cancel") return { isCancelable: false, reason: "Canceled" };
    if (this.deliveryStatus === "Shipped") return { isCancelable: false, reason: "Shipped" };
    if (this.deliveryStatus === "PartlyShipped") return { isCancelable: false, reason: "Shipped" };

    throw new Error("Unexpected delivery status");
  }

  async cancel() {
    // 同じ受注コードで新規受注の作成を許可しない(デフォルトの挙動の通り)
    const body = JSON.stringify({
      clears_code: false,
    });
    const res = await fetch(
      `https://app2.logiless.com/api/v1/merchant/1394/sales_orders/${this.id}/reversal`,
      {
        headers: {
          Authorization: `Bearer ${(await this.getTokens()).accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body,
      },
    );

    if (!res.ok) {
      console.log(await res.json());
      throw new Error("Failed to cancel sales order");
    }
  }
}

type DocumentStatus =
  | "Processing"
  | "WaitingForPayment"
  | "WaitingForAllocation"
  | "WaitingForShipment"
  | "Shipped"
  | "Cancel";
type AllocationStatus = "WaitingForAllocation" | "Allocated";
type DeliveryStatus =
  | "WaitingForShipment"
  | "Working"
  | "PartlyShipped"
  | "Shipped"
  | "Pending"
  | "Cancel";
type IncomingPaymentStatus = "NotPaid" | "PartlyPaid" | "Paid";
type AuthorizationStatus =
  | "NotRequired"
  | "Unauthorized"
  | "Authorizing"
  | "Authorized"
  | "Captured"
  | "AuthorizationFailure";
type LineStatus =
  | "WaitingForTransfer"
  | "WaitingForAllocation"
  | "Allocated"
  | "Shipped"
  | "Cancel";

type SalesOrderLine = {
  id: number;
  status: LineStatus;
  article_code: string;
  article_name: string;
  quantity: number;
};

type SalesOrderData = {
  id: number;
  code: string;
  document_status: DocumentStatus;
  allocation_status: AllocationStatus;
  delivery_status: DeliveryStatus;
  incoming_payment_status: IncomingPaymentStatus;
  authorization_status: AuthorizationStatus;
  customer_code?: string;
  payment_method: string;
  delivery_method: string;
  buyer_country: string;
  recipient_country: string;
  store: {
    id: number;
    name: string;
  };
  document_date: string;
  ordered_at: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
  lines: SalesOrderLine[];
};
