import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { ShopifyOrder } from "../libs/models/shopify/ShopifyOrder";

/**
 * Shopifyの注文情報をGoogle AnalyticsのMeasurement Protocolに送信するタスク
 * (サテライトからのCV情報はクロスドメインのためShopify側からは送信できないため、サーバーサイドで送信する)
 */
export class PurchaseMeasurementProtocol extends KiribiPerformer<
  { orderId: number },
  void,
  Bindings
> {
  private order: ShopifyOrder;
  private apiSecret: string;
  private measurementId: string;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.order = new ShopifyOrder(env);
    this.apiSecret = env.MEASUREMENT_PROTOCOL_API_SECRET;
    this.measurementId = env.MEASUREMENT_PROTOCOL_MEASUREMENT_ID;
  }

  async perform(data: { orderId: number }) {
    await this.order.setOrderById(data.orderId);

    let clientId = "";
    this.order.lineItems.forEach(({ properties }) => {
      const { value } = properties.find(({ name, value }) => name === "_ga") ?? {};
      if (value) clientId = value;
    });
    if (!clientId) {
      console.log("No clientId found in order properties");
      return;
    }

    const url = new URL("https://www.google-analytics.com/mp/collect");
    url.searchParams.append("measurement_id", this.measurementId);
    url.searchParams.append("api_secret", this.apiSecret);

    const body = {
      client_id: clientId,
      events: [
        {
          name: "purchase",
          params: {
            currency: this.order.currency,
            value: this.order.subTotalPrice,
            transaction_id: this.order.numericId.toString(),
            tax: this.order.totalTax,
            items: this.order.lineItems.map(({ name, quantity, price }) => ({
              item_name: name,
              price: Number(price),
              quantity,
            })),
          },
        },
      ],
    };

    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(await res.text());
  }
}
