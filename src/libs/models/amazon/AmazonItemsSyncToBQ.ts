import { AmazonItem } from "./AmazonItem";
import { BigQueryClient } from "../bigquery/BigQueryClient";
import { Bindings } from "../../../../bindings";

type ReportData = {
  商品名: string;
  出品者SKU: string;
};

export class AmazonItemsSyncToBQ extends AmazonItem {
  private bq: BigQueryClient;
  constructor(env: Bindings) {
    super(env);
    this.bq = new BigQueryClient(env);
  }

  async syncReport(reportId: string) {
    const data = await this.downloadReport<ReportData[]>(reportId);

    console.log(`Found ${data.length} items`);

    const existingItemMap = await this.db.useTransaction(async (db) => {
      // DBを検索して、insertするもの、updateするものを分ける
      const existingItems = await db.prisma.amazonItems.findMany({
        select: {
          amazonItemId: true,
          title: true,
          ShopifyProductGroups: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        where: {
          amazonItemId: {
            in: data.map((item) => item["出品者SKU"]),
          },
        },
      });
      const existingItemMap = new Map(existingItems.map((item) => [item.amazonItemId, item]));

      const insertItems = data.filter((item) => !existingItemMap.has(item["出品者SKU"]));
      const updateItems = data.filter((item) => existingItemMap.has(item["出品者SKU"]));
      const insertData = insertItems.map(parseForCMSItemsTableData);
      const updateData = updateItems.map(parseForCMSItemsTableData);

      console.log(`Insert ${insertData.length} items`);
      console.log(`Update ${updateData.length} items`);
      // DBに同期
      await db.prisma.amazonItems.createMany({
        data: insertData,
      });
      await Promise.all(
        updateData.map((data) =>
          db.prisma.amazonItems.update({
            where: { amazonItemId: data.amazonItemId },
            data,
          }),
        ),
      );

      return existingItemMap;
    });

    // BigQueryに同期
    const bqItemsTableData = data.reduce<BQItemsTableData[]>((acc, _item) => {
      const item = parseForBQItemsTableData(_item);
      if (existingItemMap.has(item.id)) {
        const existingItem = existingItemMap.get(item.id);
        item.productGroupId = existingItem!.ShopifyProductGroups?.id ?? null;
        item.productGroupName = existingItem!.ShopifyProductGroups?.title ?? null;
      }
      acc.push(item);
      return acc;
    }, []);

    console.log("Syncing items to BigQuery", bqItemsTableData.length, "items");
    await this.bq.deleteAndInsert("amazon", "items", "id", bqItemsTableData);
  }
}

const parseForCMSItemsTableData = (item: ReportData) => {
  return {
    title: item["商品名"],
    amazonItemId: item["出品者SKU"],
  };
};

type BQItemsTableData = {
  id: string;
  title: string;
  productGroupId: number | null;
  productGroupName: string | null;
};

const parseForBQItemsTableData = (item: ReportData): BQItemsTableData => {
  return {
    id: item["出品者SKU"],
    title: item["商品名"],
    productGroupId: null,
    productGroupName: null,
  };
};
