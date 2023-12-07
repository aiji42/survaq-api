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
  variants: Awaited<ReturnType<typeof makeVariants>>
): SKUsForDelivery => {
  const earliestSchedule = makeSchedule(null);

  return variants
    .flatMap(({ baseSKUs, selectableSKUs }) => [...baseSKUs, ...selectableSKUs])
    .reduce<SKUsForDelivery>((acc, sku) => {
      if (
        acc.find(({ code }) => code === sku.code) ||
        !sku.schedule ||
        // 現在時点基準よりも以前にスケジュールが組まれているものは除く
        sku.schedule.numeric <= earliestSchedule.numeric
      )
        return acc;
      return [
        ...acc,
        {
          id: sku.id,
          code: sku.code,
          name: sku.displayName || sku.name,
          schedule: sku.schedule,
          sortNumber: sku.sortNumber,
        },
      ];
    }, [])
    .sort((a, b) => a.sortNumber - b.sortNumber || a.id - b.id);
};
