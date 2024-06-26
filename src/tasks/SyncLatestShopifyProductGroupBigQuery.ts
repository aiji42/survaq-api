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

    const [last] = await bq.query<{ syncedAt: Date }>(
      `SELECT syncedAt FROM \`shopify.products\` ORDER BY syncedAt DESC LIMIT 1`,
    );
    if (!last) return;

    const groups = await db.prisma.shopifyProductGroups.findMany({
      select: {
        id: true,
        title: true,
        ShopifyProducts: {
          select: {
            productId: true,
          },
        },
        updatedAt: true,
      },
      where: {
        updatedAt: {
          gte: last.syncedAt,
        },
      },
    });
    if (groups.length < 1) {
      console.log("no new data found");
      return;
    }

    const queries = groups.map((group) => {
      const productIds = group.ShopifyProducts.map(
        (product) => `gid://shopify/Product/${product.productId}`,
      );
      return bq.makeUpdateQuery("shopify", "products", "id", productIds, {
        productGroupId: group.id.toString(),
        productGroupName: group.title,
        syncedAt: new Date().toISOString(),
      });
    });
    await bq.query(queries.join(";\n"));
  }
}
