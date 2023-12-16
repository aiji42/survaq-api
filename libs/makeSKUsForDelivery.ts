import { makeVariants } from "./makeVariants";
import { makeSchedule, Schedule } from "./makeSchedule";

type SKUsForDelivery = Array<{
  id: number;
  code: string;
  name: string;
  schedule: Schedule<false>;
  sortNumber: number;
}>;

export const makeSKUsForDelivery = (
  variants: Awaited<ReturnType<typeof makeVariants>>,
  filterDelaying = true
): SKUsForDelivery => {
  const earliestSchedule = makeSchedule(null);

  return variants
    .flatMap(({ baseSKUs, selectableSKUs }) => [...baseSKUs, ...selectableSKUs])
    .reduce<SKUsForDelivery>((acc, sku) => {
      const schedule = sku.schedule ?? earliestSchedule;
      if (
        acc.find(({ code }) => code === sku.code) ||
        // 現在時点基準よりも以前にスケジュールが組まれているものは除く
        (filterDelaying && schedule.numeric <= earliestSchedule.numeric)
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
        },
      ];
    }, [])
    .sort((a, b) => a.sortNumber - b.sortNumber || a.id - b.id);
};
