import { ShopifyProduct } from "./ShopifyProduct";
import { DB } from "../../db";
import { BigQueryClient } from "../bigquery/BigQueryClient";

export class ShopifyProductSyncBQ extends ShopifyProduct {
  private db: DB;
  private bq: BigQueryClient;
  constructor(
    env: ConstructorParameters<typeof ShopifyProduct>[0] &
      ConstructorParameters<typeof DB>[0] &
      ConstructorParameters<typeof BigQueryClient>[0],
  ) {
    super(env);
    this.db = new DB(env);
    this.bq = new BigQueryClient(env);
  }

  private async getGroup() {
    const res = await this.db.prisma.shopifyProducts.findFirst({
      where: {
        productId: this.id,
      },
      select: {
        ShopifyProductGroups: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return res?.ShopifyProductGroups ?? null;
  }

  private createBQProductTable(
    productGroup: { id: number; title: string | null } | null,
  ): BQProductTable {
    const product = this.product;

    return {
      id: this.gid,
      title: this.name,
      status: this.status.toUpperCase(),
      created_at: product.created_at,
      updated_at: product.updated_at,
      productGroupId: productGroup?.id.toString() ?? null,
      productGroupName: productGroup?.title ?? null,
      syncedAt: new Date().toISOString(),
    };
  }

  private createBQVariantTable(): BQVariantTable[] {
    return this.variants.map((variant) => ({
      id: variant.gid,
      product_id: this.gid,
      title: variant.title,
      // MEMO: 取得できないので空文字を入れておく
      display_name: "",
      price: parseFloat(variant.price),
      compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
      taxable: variant.taxable,
      // MEMO: 取得できないのでtrueを入れておく
      available_for_sale: true,
      created_at: variant.created_at,
      updated_at: variant.updated_at,
    }));
  }

  private async upsertBQProductTableQuery() {
    const productGroup = await this.getGroup();
    const data = this.createBQProductTable(productGroup);
    const deleteQuery = this.bq.makeDeleteQuery("shopify", "products", "id", [data.id]);
    const insertQuery = this.bq.makeInsertQuery("shopify", "products", [data]);
    return `${deleteQuery};\n${insertQuery}`;
  }

  private async upsertBQVariantTableQuery() {
    const data = this.createBQVariantTable();
    const deleteQuery = this.bq.makeDeleteQuery(
      "shopify",
      "variants",
      "id",
      data.map((d) => d.id),
    );
    const insertQuery = this.bq.makeInsertQuery("shopify", "variants", data);
    return `${deleteQuery};\n${insertQuery}`;
  }

  async bulkUpsertBQTables() {
    const productQuery = await this.upsertBQProductTableQuery();
    const variantQuery = await this.upsertBQVariantTableQuery();
    await this.bq.query(`${productQuery};\n${variantQuery}`);
  }
}

type BQProductTable = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  productGroupId: string | null;
  productGroupName: string | null;
  syncedAt: string | null;
};

type BQVariantTable = {
  id: string;
  product_id: string;
  title: string;
  display_name: string;
  price: number;
  compare_at_price: number | null;
  taxable: boolean;
  available_for_sale: boolean;
  created_at: string;
  updated_at: string;
};
