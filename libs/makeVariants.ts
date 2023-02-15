import { makeScheduleFromDeliverySchedule, Schedule } from "./makeSchedule";
import { Database } from "../src/database.type";

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
  skuLabel?: string | null;
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
        skus:
          skus?.map(({ code, name, subName, deliverySchedule }) => {
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
          }) ?? [],
      };
    }
  );
};

export type VariantsSupabase =
  (Database["public"]["Tables"]["ShopifyVariants"]["Row"] & {
    ShopifyVariants_ShopifyCustomSKUs:
      | {
          ShopifyCustomSKUs: Database["public"]["Tables"]["ShopifyCustomSKUs"]["Row"];
        }[]
      | null;
  })[];

export const makeVariantsSupabase = (
  product: Database["public"]["Tables"]["ShopifyProducts"]["Row"],
  variants: VariantsSupabase,
  locale: Locale
): CustomizedVariant[] => {
  return variants.map(
    ({
      variantId,
      variantName,
      customSelects,
      deliverySchedule,
      skuLabel,
      ShopifyVariants_ShopifyCustomSKUs,
    }) => {
      let schedule = null;
      if (deliverySchedule) {
        const { texts, ...omitTexts } = makeScheduleFromDeliverySchedule(
          deliverySchedule as DeliverySchedule,
          locale
        );
        schedule = omitTexts;
      }
      return {
        productId: product.productId,
        variantId,
        variantName,
        skuLabel,
        skuSelectable: customSelects,
        schedule,
        skus:
          ShopifyVariants_ShopifyCustomSKUs?.map(
            ({
              ShopifyCustomSKUs: { code, name, subName, deliverySchedule },
            }) => {
              let schedule = null;
              if (deliverySchedule) {
                const { texts, ...omitTexts } =
                  makeScheduleFromDeliverySchedule(
                    deliverySchedule as DeliverySchedule,
                    locale
                  );
                schedule = omitTexts;
              }
              return {
                code,
                name,
                subName: subName ?? "",
                schedule,
              };
            }
          ) ?? [],
      };
    }
  );
};
