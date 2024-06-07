import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";
import { BigQueryClient } from "../libs/models/bigquery/BigQueryClient";

type Result = {
  code: string;
  before: { inventory: number; lastSyncedAt: string | null };
  after: { inventory: number; lastSyncedAt: string };
};

export class UpdateSkuOnFulfillment extends KiribiPerformer<{}, Result[], Bindings> {
  db: DB;
  bq: BigQueryClient;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.bq = new BigQueryClient(env);
    this.db = new DB(env);
  }

  async perform() {
    const skus = await getSkus(this.db);
    const shippedQuantity = await getShippedQuantity(
      this.bq,
      skus.map(({ code, lastSyncedAt }) => ({
        code,
        shippedAt: lastSyncedAt?.toISOString() ?? "2023-03-01",
      })),
    );

    const results: Result[] = [];
    for (const sku of skus) {
      const target = shippedQuantity.find(({ code }) => code === sku.code);
      if (!target) continue;

      const inventory = sku.inventory - target.quantity;

      // ここからはテスト用なので消してOK
      console.log({
        where: { code: sku.code },
        data: {
          inventory,
          lastSyncedAt: target.lastShippedAt,
        },
      });
      results.push({
        code: sku.code,
        before: { inventory: sku.inventory, lastSyncedAt: sku.lastSyncedAt?.toISOString() ?? null },
        after: { inventory, lastSyncedAt: target.lastShippedAt.toISOString() },
      });
      // ここまで
      // TODO: テストが終わったらコメントアウトを外す
      // await this.db.prisma.shopifyCustomSKUs.update({
      //   where: { code: sku.code },
      //   data: {
      //     inventory,
      //     lastSyncedAt,
      //   },
      // });
    }

    return results;
  }
}

const getSkus = async (db: DB) => {
  return db.prisma.shopifyCustomSKUs.findMany({
    select: {
      code: true,
      inventory: true,
      lastSyncedAt: true,
    },
  });
};

const getShippedQuantity = async (
  bq: BigQueryClient,
  targets: { code: string; shippedAt: string }[],
) => {
  const query = `
    SELECT code, SUM(quantity) as quantity, MAX(fulfilled_at) as lastShippedAt
      FROM shopify.order_skus
      WHERE ${targets
        .map(({ code, shippedAt }) => `(fulfilled_at > '${shippedAt}' AND code = '${code}')`)
        .join(" OR ")}
      GROUP BY code
  `;
  return bq.query<{ code: string; quantity: number; lastShippedAt: Date }>(query);
};
