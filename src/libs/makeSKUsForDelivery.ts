import { makeSchedule, Schedule } from "./makeSchedule";
import { CompletedSKU } from "./models/cms/Product";

export type SKUsForDelivery = Array<{
  id: number;
  code: string;
  name: string;
  schedule: Schedule;
  sortNumber: number;
  delaying: boolean;
}>;

export const makeSKUsForDelivery = (skus: CompletedSKU[], onlyDelaying = true): SKUsForDelivery => {
  const earliestSchedule = makeSchedule(null);

  return skus
    .reduce<SKUsForDelivery>((acc, sku) => {
      const schedule = sku.schedule ?? earliestSchedule;
      const delaying = schedule.numeric > earliestSchedule.numeric;
      if (
        acc.find(({ code }) => code === sku.code) ||
        sku.skipDeliveryCalc ||
        (onlyDelaying && !delaying)
      )
        return acc;
      return [
        ...acc,
        {
          id: sku.id,
          code: sku.code,
          name: sku.displayName || sku.name,
          schedule,
          sortNumber: sku.sortNumber,
          delaying,
        },
      ];
    }, [])
    .sort((a, b) => a.sortNumber - b.sortNumber || a.id - b.id);
};
