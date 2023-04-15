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
  skusJSON: string | null;
};

export type Variants =
  (Database["public"]["Tables"]["ShopifyVariants"]["Row"] & {
    ShopifyVariants_ShopifyCustomSKUs:
      | {
          id: number;
          sort: number | null;
          ShopifyCustomSKUs: Database["public"]["Tables"]["ShopifyCustomSKUs"]["Row"];
        }[]
      | null;
  })[];

export const makeVariants = (
  product: Database["public"]["Tables"]["ShopifyProducts"]["Row"],
  variants: Variants,
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
      skusJSON,
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
        skusJSON: sanitizeSkusJSON(skusJSON),
        skus:
          ShopifyVariants_ShopifyCustomSKUs?.sort(
            ({ sort: a, id: aId }, { sort: b, id: bId }) => {
              return a === null && b === null
                ? aId - bId
                : a === null
                ? 1
                : b === null
                ? -1
                : a - b;
            }
          )?.map(
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

const sanitizeSkusJSON = (json: string | null) => {
  if (typeof json !== "string") return null;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    if (parsed.some((s) => typeof s !== "string")) return null;
    return json;
  } catch (_) {
    return null;
  }
};
