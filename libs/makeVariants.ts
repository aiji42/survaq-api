import {
  earliest,
  latest,
  makeSchedule,
  makeScheduleFromDeliverySchedule,
  Schedule,
} from "./makeSchedule";
import { Database } from "../src/database.type";
import { SupabaseClient } from "@supabase/supabase-js";

type Locale = "ja" | "en";

type SKU = {
  id: number;
  code: string;
  name: string;
  subName: string;
  displayName: string;
  schedule: Schedule<false> | null;
  availableStock: string;
  sortNumber: number;
};

type CustomizedVariant = {
  productId?: string;
  variantId: string;
  variantName: string;
  baseSKUs: SKU[];
  selectableSKUs: SKU[];
  skuSelectable: number;
  skuLabel?: string | null;
  defaultSchedule: Schedule<false> | null;
};

export type Variants =
  (Database["public"]["Tables"]["ShopifyVariants"]["Row"] & {
    ShopifyVariants_ShopifyCustomSKUs:
      | {
          id: number;
          sort: number | null;
          ShopifyCustomSKUs: SKURow;
        }[]
      | null;
  })[];

type SKURow = Database["public"]["Tables"]["ShopifyCustomSKUs"]["Row"] & {
  currentInventoryOrder:
    | (Database["public"]["Tables"]["ShopifyInventoryOrderSKUs"]["Row"] & {
        group: Database["public"]["Tables"]["ShopifyInventoryOrders"]["Row"];
      })
    | null;
};

export const makeVariants = async (
  product: Database["public"]["Tables"]["ShopifyProducts"]["Row"],
  variants: Variants,
  locale: Locale,
  supabaseClient: SupabaseClient<Database>
): Promise<CustomizedVariant[]> => {
  const skuCodes = [
    ...new Set(variants.flatMap(({ skusJSON }) => sanitizeSkusJSON(skusJSON))),
  ];
  let skuMap = new Map<string, SKURow>();
  if (skuCodes.length) {
    const { data } = await supabaseClient
      .from("ShopifyCustomSKUs")
      .select(
        "*, currentInventoryOrder:ShopifyInventoryOrderSKUs!currentInventoryOrderSKUId(*, group:ShopifyInventoryOrders(*))"
      )
      .in("code", skuCodes);
    skuMap = new Map(
      data?.map((record) => [record.code, record as unknown as SKURow])
    );
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
            makeSKUNew(ShopifyCustomSKUs, locale)
          ) ?? [];
      const baseSKUs = sanitizeSkusJSON(skusJSON).flatMap((code) => {
        const row = skuMap.get(code);
        return row ? makeSKUNew(row, locale) : [];
      });

      const defaultSchedule = latest([
        latest(baseSKUs.map(({ schedule }) => schedule)),
        earliest(selectableSKUs.map(({ schedule }) => schedule)),
        // 本日ベースのスケジュールも入れて、誤って過去日がdefaultScheduleにならないようにする
        makeSchedule(null, locale),
      ]);

      return {
        productId: product.productId,
        variantId,
        variantName,
        skuLabel,
        skuSelectable: customSelects ?? 0,
        selectableSKUs,
        baseSKUs,
        defaultSchedule,
      };
    }
  );
};

export const makeSKU = (
  {
    id,
    code,
    name,
    subName,
    displayName,
    availableStock,
    skipDeliveryCalc,
    incomingStockDeliveryScheduleA,
    incomingStockDeliveryScheduleB,
    incomingStockDeliveryScheduleC,
    sortNumber,
  }: Database["public"]["Tables"]["ShopifyCustomSKUs"]["Row"],
  locale: Locale
): SKU => {
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
    id,
    code,
    name,
    subName: subName ?? "",
    displayName: displayName ?? "",
    schedule: latest([
      makeScheduleFromDeliverySchedule(deliverySchedule, locale, true),
      // 本日ベースのスケジュールも入れて、誤って過去日がscheduleにならないようにする
      makeSchedule(null, locale),
    ]),
    availableStock,
    sortNumber,
  };
};

export const makeSKUNew = (
  {
    id,
    code,
    name,
    subName,
    displayName,
    skipDeliveryCalc,
    currentInventoryOrder,
    sortNumber,
  }: SKURow,
  locale: Locale
) => {
  const deliverySchedule = skipDeliveryCalc
    ? null
    : currentInventoryOrder?.group.deliverySchedule ?? null;

  return {
    id,
    code,
    name,
    subName: subName ?? "",
    displayName: displayName ?? "",
    schedule: latest([
      makeScheduleFromDeliverySchedule(deliverySchedule, locale, true),
      // 本日ベースのスケジュールも入れて、誤って過去日がscheduleにならないようにする
      makeSchedule(null, locale),
    ]),
    availableStock: currentInventoryOrder?.group.name ?? "REAL",
    sortNumber,
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
