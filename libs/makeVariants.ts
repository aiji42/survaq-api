import { makeScheduleFromDeliverySchedule, Schedule } from "./makeSchedule";

type Locale = "ja" | "en";

type CustomizedVariant = {
  productId?: string;
  variantId: string;
  variantName: string;
  skus: {
    code: string;
    name: string;
    subName: string;
    schedule: Omit<Schedule, "texts"> | null;
  }[];
  skuSelectable: number;
};
export const makeVariants = (
  variants: Variant[],
  locale: Locale
): CustomizedVariant[] => {
  return variants.map(
    ({ productId, variantId, variantName, skus, skuSelectable }) => ({
      productId,
      variantId,
      variantName,
      skuSelectable,
      skus: skus.map(({ code, name, subName, deliverySchedule }) => {
        if (deliverySchedule) {
          const { texts, ...omitTexts } = makeScheduleFromDeliverySchedule(
            deliverySchedule,
            locale
          );
          return {
            code,
            name,
            subName,
            schedule: omitTexts,
          };
        }

        return {
          code,
          name,
          subName,
          schedule: null,
        };
      }),
    })
  );
};
