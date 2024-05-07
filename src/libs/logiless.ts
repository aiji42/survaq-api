import { Bindings } from "../../bindings";

type AuthResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

type Tokens = {
  accessToken: string;
  refreshToken: string;
  isExpired: boolean;
};

export class Logiless {
  private salesOrderCache: Map<string, SalesOrder> = new Map();
  constructor(private readonly env: Bindings) {}

  async loginCallback(code: string) {
    const res = await fetch(
      `https://app2.logiless.com/oauth2/token?client_id=${this.env.LOGILESS_CLIENT_ID}&client_secret=${this.env.LOGILESS_CLIENT_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=${this.env.LOGILESS_REDIRECT_URI}`,
    );
    if (!res.ok) throw new Error("Failed to get token");
    const result = (await res.json()) as AuthResult;

    await this.storeTokens(result);
  }

  async getTokens() {
    const tokens = await this.getTokensViaStore();
    if (!tokens) throw new Error("Not logged in");

    if (tokens.isExpired) return this.refreshTokens(tokens.refreshToken);

    return tokens;
  }

  private async refreshTokens(refreshToken: string): Promise<Tokens> {
    const res = await fetch(
      `https://app2.logiless.com/oauth2/token?client_id=${this.env.LOGILESS_CLIENT_ID}&client_secret=${this.env.LOGILESS_CLIENT_SECRET}&refresh_token=${refreshToken}&grant_type=refresh_token`,
    );
    if (!res.ok) throw new Error("Failed to refresh token");
    const result = (await res.json()) as AuthResult;

    await this.storeTokens(result);

    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      isExpired: false,
    };
  }

  private async storeTokens(token: AuthResult) {
    await this.env.CACHE.put("LOGILESS_TOKEN", JSON.stringify(token), {
      metadata: { expire: new Date(Date.now() + token.expires_in * 1000) },
    });
  }

  private async getTokensViaStore(): Promise<Tokens | null> {
    const { value, metadata } = await this.env.CACHE.getWithMetadata<
      { access_token: string; refresh_token: string },
      { expire: Date }
    >("LOGILESS_TOKEN", "json");
    if (!value || !metadata) return null;

    const isExpired = metadata.expire < new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      accessToken: value.access_token,
      refreshToken: value.refresh_token,
      isExpired,
    };
  }

  async purgeTokens() {
    await this.env.CACHE.delete("LOGILESS_TOKEN");
  }

  async getSalesOrder(_code: string) {
    // Shopifyのコードは#から始まるため、それを除外
    const code = _code.replace(/^#/, "");

    if (this.salesOrderCache.has(code)) return this.salesOrderCache.get(code)!;

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
    } = (await res.json()) as { data: SalesOrder[] };
    if (!salesOrder) throw new Error("Sales order not found");

    this.salesOrderCache.set(code, salesOrder);

    return salesOrder;
  }

  async getCancelable(code: string): Promise<{ isCancelable: boolean; reason?: string }> {
    const data = await this.getSalesOrder(code);

    if (data.delivery_status === "WaitingForShipment") return { isCancelable: true };
    if (data.delivery_status === "Working") return { isCancelable: false, reason: "Working" };
    if (data.delivery_status === "PartlyShipped" || data.delivery_status === "Shipped")
      return { isCancelable: false, reason: "Shipped" };
    if (data.delivery_status === "Pending") return { isCancelable: false, reason: "Pending" };
    if (data.delivery_status === "Cancel") return { isCancelable: false, reason: "Canceled" };

    throw new Error("Unexpected delivery status");
  }

  async cancelSalesOrder(code: string) {
    const { id } = await this.getSalesOrder(code);

    // 同じ受注コードで新規受注の作成を許可しない(デフォルトの挙動の通り)
    const body = JSON.stringify({
      clears_code: false,
    });
    const res = await fetch(
      `https://app2.logiless.com/api/v1/merchant/1394/sales_orders/${id}/reversal`,
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

type SalesOrder = {
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
