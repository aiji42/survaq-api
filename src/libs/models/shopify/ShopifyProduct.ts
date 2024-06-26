import { ShopifyProductData } from "../../../types/shopify";
import { ShopifyClient } from "./ShopifyClient";
import { CustomNotFoundError } from "../../errors";

export class ShopifyProduct extends ShopifyClient {
  private _product: ShopifyProductData | undefined;

  async setProductById(_id: number | string) {
    const id = Number(_id);

    const res = await fetch(
      `https://survaq.myshopify.com/admin/api/${this.API_VERSION}/products/${id}.json`,
      { headers: this.headers },
    );
    if (res.status === 404) throw new CustomNotFoundError(`Product not found: (id: ${id})`);
    if (!res.ok) throw new Error(await res.text());

    this._product = ((await res.json()) as { product: ShopifyProductData }).product;

    return this;
  }

  get isProductSet() {
    return !!this._product;
  }

  get product() {
    const product = this._product;
    if (!product) throw new Error("Product is not set");
    return product;
  }

  get id() {
    return String(this.product.id);
  }

  get gid() {
    return `gid://shopify/Product/${this.product.id}`;
  }

  get name() {
    return this.product.title;
  }

  get status() {
    return this.product.status;
  }

  get isActive() {
    return this.status === "active";
  }

  get variants() {
    return (
      this.product.variants?.map((variant) => ({
        ...variant,
        gid: `gid://shopify/ProductVariant/${variant.id}`,
      })) ?? []
    );
  }

  get variantMap() {
    return Object.fromEntries(this.variants.map(({ id, title }) => [String(id), title]));
  }

  get variantIds() {
    return this.variants.map(({ id }) => String(id));
  }

  findVariantName(id: string) {
    const name = this.variantMap[id];
    if (!name) throw new Error(`Variant name not found for id: ${id}`);
    return name;
  }
}
