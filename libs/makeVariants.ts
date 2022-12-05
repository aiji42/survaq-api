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
  schedule: Omit<Schedule, "texts"> | null;
};
export const makeVariants = (
  variants: Variant[],
  locale: Locale
): CustomizedVariant[] => {
  return variants.map(
    ({
      productId,
      variantId,
      variantName,
      skus,
      skuSelectable,
      deliverySchedule,
    }) => {
      let schedule = null;
      if (deliverySchedule) {
        const { texts, ...omitTexts } = makeScheduleFromDeliverySchedule(
          deliverySchedule,
          locale
        );
        schedule = omitTexts;
      }
      return {
        productId,
        variantId,
        variantName,
        skuSelectable,
        schedule,
        skus: skus.map(({ code, name, subName, deliverySchedule }) => {
          let schedule = null;
          if (deliverySchedule) {
            const { texts, ...omitTexts } = makeScheduleFromDeliverySchedule(
              deliverySchedule,
              locale
            );
            schedule = omitTexts;
          }
          return {
            code,
            name,
            subName,
            schedule,
          };
        }),
      };
    }
  );
};
