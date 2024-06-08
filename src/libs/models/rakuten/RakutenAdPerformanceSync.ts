import { z } from "zod";
import { Bindings } from "../../../../bindings";
import { BigQueryClient } from "../bigquery/BigQueryClient";

export class RakutenAdPerformanceSync {
  private bq: BigQueryClient;
  constructor(env: Bindings) {
    this.bq = new BigQueryClient(env);
  }

  async syncToBigQuery(data: ImportableData) {
    const parsedData = data.map(parseImportableData);
    await this.bq.deleteAndInsert("rakuten", "ad_performances", "id", parsedData);
  }
}

export const importableDataSchema = z.array(
  z.object({
    date: z.string(),
    itemId: z.string(),
    clicks: z.number(),
    impressions: z.number(),
    cost: z.number(),
    ctr: z.number(),
    cpc: z.number(),
  }),
);

export type ImportableData = z.infer<typeof importableDataSchema>;

type BQAdPerformancesTable = {
  id: string;
  date: string;
  item_id: string;
  clicks: number;
  impressions: number;
  cost: number;
  ctr: number;
  cpc: number;
};

const parseImportableData = (data: ImportableData[number]): BQAdPerformancesTable => {
  return {
    id: `${data.date}-${data.itemId}`,
    date: data.date,
    item_id: data.itemId,
    clicks: data.clicks,
    impressions: data.impressions,
    cost: data.cost,
    ctr: data.ctr,
    cpc: data.cpc,
  };
};
