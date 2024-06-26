import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { ShopifyProductSyncBQ } from "../libs/models/shopify/ShopifyProductSyncBQ";

/**
 * Shopifyの商品情報(product/variant)をBigQueryに同期する
 */
export class SyncShopifyProductToBigQuery extends KiribiPerformer<
  { productId: number },
  void,
  Bindings
> {
  async perform({ productId }: { productId: number }) {
    const product = await new ShopifyProductSyncBQ(this.env).setProductById(productId);

    await product.bulkUpsertBQTables();
  }
}
