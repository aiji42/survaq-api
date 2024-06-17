import { z } from "zod";
import { Bindings } from "../../../../bindings";
import { BigQueryClient } from "../bigquery/BigQueryClient";

export class SmartShoppingPerformanceSync {
  private bq: BigQueryClient;
  constructor(env: Bindings) {
    this.bq = new BigQueryClient(env);
  }

  async syncToBigQuery(data: ImportableData) {
    const parsedData = data
      .map(parseImportableData)
      .filter(({ merchantCenterId }) => merchantCenterId !== " --");
    await this.bq.deleteAndInsert("merchant_center", "performances", "date", parsedData);
  }
}

export const importableDataSchema = z.array(
  z.object({
    date: z.string(),
    merchantCenterId: z.string(),
    name: z.string(),
    currencyCode: z.string(),
    cost: z.number(),
  }),
);

export type ImportableData = z.infer<typeof importableDataSchema>;

type BQPerformancesTable = {
  date: string;
  merchantCenterId: string;
  name: string;
  currencyCode: string;
  cost: number;
};

const parseImportableData = (data: ImportableData[number]): BQPerformancesTable => {
  return {
    date: data.date,
    merchantCenterId: data.merchantCenterId,
    name: data.name,
    currencyCode: data.currencyCode,
    cost: data.cost,
  };
};
