import { ShopifyOrder } from "./ShopifyOrder";

export class ShopifyOrderForCancel extends ShopifyOrder {
  private _cancellingOperated = false;

  // ShopifyのAPIでのキャンセル可不可条件ではなく、あくまでサバキュー独自のキャンセルを許すかどうかの条件
  get cancelable():
    | { isCancelable: true; reason?: never }
    | { isCancelable: false; reason: "Closed" | "Canceled" | "Shipped" | "Unmanaged" } {
    if (this.isUnmanaged) return { isCancelable: false, reason: "Unmanaged" };
    if (this.isCancelled) return { isCancelable: false, reason: "Canceled" };
    if (this.isClosed) return { isCancelable: false, reason: "Closed" };
    if (this.fulfillmentStatus) return { isCancelable: false, reason: "Shipped" };

    return { isCancelable: true };
  }

  // ShopifyのAPIでキャンセル可能かどうか
  get isAvailableCancelOperation() {
    // 未払はキャンセルできない
    if (this.financialStatus === "pending") return false;
    // 出荷済みはキャンセルできない
    return !this.fulfillmentStatus;
  }

  // コンビニ決済・銀行振込の場合、返金用口座を聞かないといけない
  get isRequiringCashRefunds() {
    if (!["paid", "partially_paid"].includes(this.financialStatus)) return false;

    return this.order.payment_gateway_names.some(
      (name) => name.includes("コンビニ決済") || name.includes("銀行振込"),
    );
  }

  get isCompletedCancelOperation() {
    return this._cancellingOperated;
  }

  async cancel(reason: string) {
    // MEMO: キャンセルを実行すると自動的にクローズされる
    const data = await this.graphql<CancelGraphQLData>(
      `mutation OrderCancel($orderId: ID!, $notifyCustomer: Boolean, $refund: Boolean!, $restock: Boolean!, $reason: OrderCancelReason!) { orderCancel(orderId: $orderId, notifyCustomer: $notifyCustomer, refund: $refund, restock: $restock, reason: $reason) { job { id done } orderCancelUserErrors { field message code } } }`,
      {
        orderId: this.gid,
        // 自動通知はしない
        notifyCustomer: false,
        refund: true,
        restock: true,
        reason: "CUSTOMER",
      },
    );

    if (data.orderCancel.orderCancelUserErrors.length)
      throw new Error(
        data.orderCancel.orderCancelUserErrors
          .map(({ field, message, code }) => `${field.join(".")}: ${message} (${code})`)
          .join("\n"),
      );

    this._cancellingOperated = true;

    await this.commitCancelReason(reason);
  }

  async close(asCancel = false, reason?: string) {
    const data = await this.graphql<CloseGraphQLData>(
      `mutation OrderClose($input: OrderCloseInput!) { orderClose(input: $input) { userErrors { field message } } }`,
      {
        input: {
          id: this.gid,
        },
      },
    );

    if (data.orderClose.userErrors.length)
      throw new Error(
        data.orderClose.userErrors
          .map(({ field, message }) => `${field.join(".")}: ${message}`)
          .join("\n"),
      );

    if (asCancel) this._cancellingOperated = true;
    if (asCancel && reason) await this.commitCancelReason(reason);
  }

  async commitCancelReason(_reason: string) {
    const reason = `---キャンセル理由---\n${_reason}`;
    await this.updateNote(reason);
  }
}

type CancelGraphQLData = {
  orderCancel: {
    orderCancelUserErrors: { field: string[]; message: string; code: string }[];
  };
};

type CloseGraphQLData = {
  orderClose: {
    userErrors: { field: string[]; message: string }[];
  };
};
