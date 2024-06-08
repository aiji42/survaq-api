import { ItemModel, RakutenItem } from "./RakutenItem";
import { Bindings } from "../../../../bindings";
import { BigQueryClient } from "../bigquery/BigQueryClient";

export class RakutenItemSync extends RakutenItem {
  private bq: BigQueryClient;
  constructor(env: Bindings) {
    super(env);
    this.bq = new BigQueryClient(env);
  }

  async sync() {
    const items = await this.search({ limit: 100 });
    let next = items.next;
    while (next) {
      // TODO: waitしてレートリミットを回避する
      const nextItems = await next();
      items.data.push(...nextItems.data);
      next = nextItems.next;
    }

    console.log(`Found ${items.data.length} items`);

    const existingItemMap = await this.db.useTransaction(async (db) => {
      // DBを検索して、insertするもの、updateするものを分ける
      const existingItems = await db.prisma.rakutenItems.findMany({
        select: {
          rakutenItemId: true,
          title: true,
          ShopifyProductGroups: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        where: {
          rakutenItemId: {
            in: items.data.map((item) => item.manageNumber),
          },
        },
      });
      const existingItemMap = new Map(existingItems.map((item) => [item.rakutenItemId, item]));

      const insertItems = items.data.filter((item) => !existingItemMap.has(item.manageNumber));
      const updateItems = items.data.filter((item) => existingItemMap.has(item.manageNumber));
      const insertData = insertItems.map(parseForDBItemsTableData);
      const updateData = updateItems.map(parseForDBItemsTableData);

      console.log(`Insert ${insertData.length} items`);
      console.log(`Update ${updateData.length} items`);
      // DBに同期
      await db.prisma.rakutenItems.createMany({
        data: insertData,
      });
      await Promise.all(
        updateData.map((data) =>
          db.prisma.rakutenItems.update({
            where: { rakutenItemId: data.rakutenItemId },
            data,
          }),
        ),
      );

      return existingItemMap;
    });

    // BigQueryに同期
    const bqItemsTableData = items.data.reduce<BQItemsTableData[]>((acc, data) => {
      const item = parseForBQItemsTableData(data);
      if (existingItemMap.has(item.id)) {
        const existingItem = existingItemMap.get(item.id);
        item.productGroupId = existingItem!.ShopifyProductGroups?.id ?? null;
        item.productGroupName = existingItem!.ShopifyProductGroups?.title ?? null;
      }
      acc.push(item);
      return acc;
    }, []);

    console.log("Syncing items to BigQuery", bqItemsTableData.length, "items");
    await this.bq.deleteAndInsert("rakuten", "items", "id", bqItemsTableData);
  }
}

const parseForDBItemsTableData = (item: ItemModel) => {
  return {
    rakutenItemId: item.manageNumber,
    title: item.title,
  };
};

type BQItemsTableData = {
  id: string;
  title: string;
  productGroupId: number | null;
  productGroupName: string | null;
  created_at: Date;
  updated_at: Date;
};

const parseForBQItemsTableData = (item: ItemModel): BQItemsTableData => {
  return {
    id: item.manageNumber,
    title: item.title,
    productGroupId: null,
    productGroupName: null,
    created_at: new Date(item.created),
    updated_at: new Date(item.updated),
  };
};
