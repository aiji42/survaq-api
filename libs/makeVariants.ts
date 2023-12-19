import {
  earliest,
  latest,
  Locale,
  makeSchedule,
  makeScheduleFromDeliverySchedule,
  Schedule,
} from "./makeSchedule";
import { Product, SKUs } from "../src/db";

type MadeVariants = {
  productId: string;
  variantId: string;
  variantName: string;
  skuLabel: string | null;
  skuSelectable: number;
  selectableSKUs: MadeSKU[];
  baseSKUs: MadeSKU[];
  defaultSchedule: Schedule<false> | null;
}[];

export const makeSKUCodes = (product: Product) => {
  return product.variants.flatMap((item) => sanitizeSkusJSON(item.skusJson));
};

export const makeVariants = async (
  product: Product,
  skus: SKUs,
  locale: Locale
): Promise<MadeVariants> => {
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

type MadeSKU = {
  id: number;
  code: string;
  name: string;
  subName: string;
  displayName: string;
  schedule: Schedule<false> | null;
  availableStock: string;
  sortNumber: number;
  skipDeliveryCalc: boolean;
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
): MadeSKU => {
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
    skipDeliveryCalc: skipDeliveryCalc ?? false,
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
