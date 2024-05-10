import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";
import { ShopifyProduct } from "../types/shopify";

export class ProductSync extends KiribiPerformer<ShopifyProduct, void, Bindings> {
  db: DB;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.db = new DB(env);
  }

  async perform(data: ShopifyProduct) {
    const product = await this.db.getProduct(String(data.id));
    let productRecordId: number | undefined = product?.id;

    // activeかつ、CMS上にまだ商品がないなら商品を追加
    if (!product && data.status === "active") {
      console.log("insert new product", data.id, data.title);
      const newProduct = await this.db.insertProduct({
        productId: String(data.id),
        productName: data.title,
      });
      productRecordId = newProduct?.id;
    }

    const shopifyVariants = Object.fromEntries(
      data.variants?.map(({ id, title }) => [String(id), title]) ?? [],
    );
    const shopifyVariantIds = Object.keys(shopifyVariants);

    // activeなら、CMS上から該当商品を探し、その商品が持つバリエーションの配列と交差差分をとって
    // CMS上に存在しないIDがあれば、そのバリエーションを作る
    // CMS上にしか存在しないIDがあるのであれば、そのバリエーションは削除する
    // CMS上・Shopify両方に存在していればバリエーションをアップデートする
    if (data.status === "active" && productRecordId) {
      const variants = await this.db.getVariants(productRecordId);
      const cmsVariantMap = new Map(variants.map((v) => [v.variantId, v] as const));

      // FIXME: Object.groupByが来たらリファクタ
      const shouldInsertVariantIds = shopifyVariantIds.filter((id) => !cmsVariantMap.has(id));
      const shouldDeleteVariantIds = [...cmsVariantMap.keys()].filter(
        (id) => !shopifyVariantIds.includes(id),
      );
      // ものによっては大量にvariantがあるので、タイトルが異なるものだけアップデートの対象とする
      const shouldUpdateVariantIds = shopifyVariantIds.filter(
        (id) => cmsVariantMap.has(id) && cmsVariantMap.get(id)?.variantName !== shopifyVariants[id],
      );

      if (shouldInsertVariantIds.length) {
        console.log(`insert new ${shouldInsertVariantIds.length} variant(s)`);
        await this.db.insertVariantMany(
          shouldInsertVariantIds.map((variantId) => ({
            variantId,
            variantName: shopifyVariants[variantId]!,
            product: productRecordId,
          })),
        );
      }

      if (shouldDeleteVariantIds.length) {
        console.log(`delete ${shouldDeleteVariantIds.length} variant(s)`);
        await this.db.deleteVariantMany(shouldDeleteVariantIds);
      }

      if (shouldUpdateVariantIds.length) {
        console.log(`update ${shouldUpdateVariantIds.length} variant(s)`);
        await Promise.all(
          shouldUpdateVariantIds.map(async (variantId) =>
            this.db.updateVariant(variantId, {
              variantName: shopifyVariants[variantId]!,
            }),
          ),
        );
      }
    }

    // draft/archived ならCMS上から該当商品を探し、その商品が持つバリエーションをすべて削除する
    // バリエーション削除時に、SKU紐付け用の中間テーブルが残らないようにする
    if (data.status !== "active" && productRecordId) {
      console.log("delete variants by product record id", productRecordId);
      await db.deleteVariantManyByProductId(productRecordId);
    }
  }
}
