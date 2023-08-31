import {
  earliest,
  latest,
  makeScheduleFromDeliverySchedule,
  Schedule,
} from "./makeSchedule";
import { Database } from "../src/database.type";
import { SupabaseClient } from "@supabase/supabase-js";

type Locale = "ja" | "en";

type CustomizedVariant = {
  productId?: string;
  variantId: string;
  variantName: string;
  skus: {
    code: string;
    name: string;
    subName: string;
    displayName: string;
    schedule: Schedule<false> | null;
    availableStock: string;
  }[];
  skuSelectable: number;
  skuLabel?: string | null;
  schedule: Schedule<false> | null;
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

export const makeVariants = async (
  product: Database["public"]["Tables"]["ShopifyProducts"]["Row"],
  variants: Variants,
  locale: Locale,
  supabaseClient: SupabaseClient<Database>
): Promise<CustomizedVariant[]> => {
  const skuCodes = [
    ...new Set(variants.flatMap(({ skusJSON }) => sanitizeSkusJSON(skusJSON))),
  ];
  let skuMap = new Map<
    string,
    Database["public"]["Tables"]["ShopifyCustomSKUs"]["Row"]
  >();
  if (skuCodes.length) {
    const { data } = await supabaseClient
      .from("ShopifyCustomSKUs")
      .select("*")
      .in("code", skuCodes);
    skuMap = new Map(data?.map((record) => [record.code, record]));
  }

  return variants.map(
    ({
      variantId,
      variantName,
      customSelects,
      skuLabel,
      ShopifyVariants_ShopifyCustomSKUs: mapping,
      skusJSON,
    }) => {
      const skuRows =
        mapping && mapping.length > 0
          ? mapping
              .sort(({ sort: a, id: aId }, { sort: b, id: bId }) => {
                return a === null && b === null
                  ? aId - bId
                  : a === null
                  ? 1
                  : b === null
                  ? -1
                  : a - b;
              })
              .map(({ ShopifyCustomSKUs }) => ShopifyCustomSKUs)
          : sanitizeSkusJSON(skusJSON).flatMap(
              (code) => skuMap.get(code) ?? []
            );

      const skus = skuRows.map((row) => makeSKU(row, locale));

      const selectableSKUs =
        mapping
          ?.sort(({ sort: a, id: aId }, { sort: b, id: bId }) => {
            return a === null && b === null
              ? aId - bId
              : a === null
              ? 1
              : b === null
              ? -1
              : a - b;
          })
          ?.map(({ ShopifyCustomSKUs }) =>
            makeSKU(ShopifyCustomSKUs, locale)
          ) ?? [];
      const baseSKUs = sanitizeSkusJSON(skusJSON).flatMap((code) => {
        const row = skuMap.get(code);
        return row ? makeSKU(row, locale) : [];
      });

      const skuSchedules = skus.map(({ schedule }) => schedule);

      const defaultSchedule = latest([
        latest(baseSKUs.map(({ schedule }) => schedule)),
        earliest(selectableSKUs.map(({ schedule }) => schedule)),
      ]);

      return {
        productId: product.productId,
        variantId,
        variantName,
        skuLabel,
        skuSelectable: customSelects,
        // 非推奨: 消す
        schedule:
          customSelects > 0 ? earliest(skuSchedules) : latest(skuSchedules),
        skus, // 非推奨: 消す
        selectableSKUs,
        baseSKUs,
        defaultSchedule,
      };
    }
  );
};

export const makeSKU = (
  {
    code,
    name,
    subName,
    displayName,
    availableStock,
    skipDeliveryCalc,
    incomingStockDeliveryScheduleA,
    incomingStockDeliveryScheduleB,
    incomingStockDeliveryScheduleC,
  }: Database["public"]["Tables"]["ShopifyCustomSKUs"]["Row"],
  locale: Locale
) => {
  const deliverySchedule = skipDeliveryCalc
    ? null
    : availableStock === "REAL"
    ? null
    : availableStock === "A"
    ? incomingStockDeliveryScheduleA
    : availableStock === "B"
    ? incomingStockDeliveryScheduleB
    : availableStock === "C"
    ? incomingStockDeliveryScheduleC
    : null;

  return {
    code,
    name,
    subName: subName ?? "",
    displayName: displayName ?? "",
    schedule: makeScheduleFromDeliverySchedule(deliverySchedule, locale, true),
    availableStock,
  };
};

const sanitizeSkusJSON = (json: string | null) => {
  if (typeof json !== "string") return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    if (parsed.some((s) => typeof s !== "string")) return [];
    return parsed as string[];
  } catch (_) {
    return [];
  }
};
