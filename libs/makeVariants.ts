import {
  earliest,
  latest,
  makeSchedule,
  makeScheduleFromDeliverySchedule,
} from "./makeSchedule";
import { getSKUs, Product, SKUs } from "../src/db";

type Locale = "ja" | "en";

export const makeVariants = async (product: Product, locale: Locale) => {
  const codes = product.variants.flatMap((item) =>
    sanitizeSkusJSON(item.skusJson)
  );
  const skus = codes.length ? await getSKUs(codes) : [];
  const skuMap = new Map<string, SKUs[number]>(
    skus.map((sku) => [sku.code, sku])
  );

  return product.variants.map(
    ({ variantId, variantName, customSelects, skuLabel, skus, skusJson }) => {
      const selectableSKUs = skus.flatMap(({ sku }) =>
        sku ? makeSKU(sku, locale) : []
      );
      const baseSKUs = sanitizeSkusJSON(skusJson).flatMap((code) => {
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
    crntInvOrderSKU,
    sortNumber,
  }: SKUs[number],
  locale: Locale
) => {
  const deliverySchedule = skipDeliveryCalc
    ? null
    : crntInvOrderSKU?.invOrder.deliverySchedule ?? null;

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
    availableStock: crntInvOrderSKU?.invOrder.name ?? "REAL",
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
