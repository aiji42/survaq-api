import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";
import { ShopifyProduct } from "../libs/models/shopify/ShopifyProduct";

// TODO:BigQueryへの同期もこのJOBでやってしまう
/**
 * Shopifyの商品情報をCMSに同期する
 */
export class ProductSync extends KiribiPerformer<{ productId: number }, void, Bindings> {
  db: DB;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.db = new DB(env);
  }

  async perform({ productId }: { productId: number }) {
    const product = new ShopifyProduct(this.env);
    await product.setProductById(productId);

    let productRecord: null | { id: number } = await this.db.prisma.shopifyProducts.findUnique({
      select: { id: true },
      where: { productId: product.id },
    });

    // activeかつ、CMS上にまだ商品がないなら商品を追加
    if (!productRecord && product.isActive) {
      console.log("insert new product", product.id, product.name);
      productRecord = await this.db.insertProduct({
        productId: product.id,
        productName: product.name,
      });
    }

    // activeなら、CMS上から該当商品を探し、その商品が持つバリエーションの配列と交差差分をとって
    // CMS上に存在しないIDがあれば、そのバリエーションを作る
    // CMS上にしか存在しないIDがあるのであれば、そのバリエーションは削除する
    // CMS上・Shopify両方に存在していればバリエーションをアップデートする
    if (product.isActive && productRecord) {
      const variants = await this.db.getVariants(productRecord.id);
      const cmsVariantMap = new Map(variants.map((v) => [v.variantId, v] as const));

      const variantIds = product.variantIds;
      // FIXME: Object.groupByが来たらリファクタ
      const shouldInsertVariantIds = variantIds.filter((id) => !cmsVariantMap.has(id));
      const shouldDeleteVariantIds = [...cmsVariantMap.keys()].filter(
        (id) => !variantIds.includes(id),
      );
      // ものによっては大量にvariantがあるので、タイトルが異なるものだけアップデートの対象とする
      const shouldUpdateVariantIds = variantIds.filter(
        (id) =>
          cmsVariantMap.has(id) &&
          cmsVariantMap.get(id)?.variantName !== product.findVariantName(id),
      );

      if (shouldInsertVariantIds.length) {
        console.log(`insert new ${shouldInsertVariantIds.length} variant(s)`);
        await this.db.insertVariantMany(
          shouldInsertVariantIds.map((variantId) => ({
            variantId,
            variantName: product.findVariantName(variantId),
            product: productRecord.id,
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
              variantName: product.findVariantName(variantId),
            }),
          ),
        );
      }
    }

    // draft/archived ならCMS上から該当商品を探し、その商品が持つバリエーションをすべて削除する
    // バリエーション削除時に、SKU紐付け用の中間テーブルが残らないようにする
    if (!product.isActive && productRecord) {
      console.log("delete variants by product record id", productRecord.id);
      await this.db.deleteVariantManyByProductId(productRecord.id);
    }
  }
}
