export class ShopifyClient {
  constructor(private env: { SHOPIFY_ACCESS_TOKEN: string }) {}
  protected readonly API_VERSION = "2024-04";

  protected get headers() {
    return new Headers({
      "X-Shopify-Access-Token": this.env.SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json",
    });
  }
}
