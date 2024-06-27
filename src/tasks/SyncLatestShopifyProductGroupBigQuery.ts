import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { BigQueryClient } from "../libs/models/bigquery/BigQueryClient";
import { DB } from "../libs/db";

/**
 * ProductGroupの最新情報をBigQueryのshopify.productsに同期する
 */
export class SyncLatestShopifyProductGroupBigQuery extends KiribiPerformer<{}, void, Bindings> {
  async perform() {
    const bq = new BigQueryClient(this.env);
    const db = new DB(this.env);

    const groups = await db.prisma.shopifyProductGroups.findMany({
      select: {
        id: true,
        title: true,
        ShopifyProducts: {
          select: {
            productId: true,
          },
        },
      },
      where: {
        updatedAt: {
          // MEMO: 3時間以内に更新されたものを対象にする
          // あまり効率は良くないが、syncedAtを見て更新すると歯抜けになるので
          gte: new Date(Date.now() - 1000 * 60 * 60 * 3),
        },
      },
    });
    if (groups.length < 1) return;

    const queries = groups.map((group) => {
      const productIds = group.ShopifyProducts.map(
        (product) => `gid://shopify/Product/${product.productId}`,
      );
      return bq.makeUpdateQuery("shopify", "products", "id", productIds, {
        productGroupId: group.id.toString(),
        productGroupName: group.title,
      });
    });
    await bq.query(queries.join(";\n"));
  }
}
