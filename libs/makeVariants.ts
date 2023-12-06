import {
  earliest,
  latest,
  makeSchedule,
  makeScheduleFromDeliverySchedule,
} from "./makeSchedule";
import { getSKUs, Product, SKUs } from "../src/db";

type Locale = "ja" | "en";

export const makeVariants = async (product: Product, locale: Locale) => {
  const skuCodes = [
    ...new Set(
      product.ShopifyVariants.flatMap(({ skusJSON }) =>
        sanitizeSkusJSON(skusJSON)
      )
    ),
  ];
  let skuMap = new Map<string, SKUs[number]>();
  if (skuCodes.length) {
    const skus = await getSKUs(skuCodes);
    skuMap = new Map(skus.map((record) => [record.code, record]));
  }

  return product.ShopifyVariants.map(
    ({
      variantId,
      variantName,
      customSelects,
      skuLabel,
      ShopifyVariants_ShopifyCustomSKUs: mapping,
      skusJSON,
    }) => {
      const selectableSKUs =
        mapping?.flatMap(({ ShopifyCustomSKUs }) =>
          ShopifyCustomSKUs ? makeSKU(ShopifyCustomSKUs, locale) : []
        ) ?? [];
      const baseSKUs = sanitizeSkusJSON(skusJSON).flatMap((code) => {
        const row = skuMap.get(code);
        return row ? makeSKU(row, locale) : [];
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
    skipDeliveryCalc,
    currentInventoryOrderSKU,
    sortNumber,
  }: SKUs[number],
  locale: Locale
) => {
  const deliverySchedule = skipDeliveryCalc
    ? null
    : currentInventoryOrderSKU?.ShopifyInventoryOrders.deliverySchedule ?? null;

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
    availableStock:
      currentInventoryOrderSKU?.ShopifyInventoryOrders.name ?? "REAL",
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
