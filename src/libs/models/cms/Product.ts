import { DB } from "../../db";
import {
  earliest,
  latest,
  Locale,
  makeSchedule,
  makeScheduleFromDeliverySchedule,
  Schedule,
} from "../../makeSchedule";

export class Product {
  constructor(
    private db: DB,
    private locale: Locale = "ja",
  ) {}

  async getProductByShopifyId(shopifyId: string) {
    // idからproductを取得
    const product = await getProduct(this.db, shopifyId);
    if (!product) return null;

    // 全variantsを探索して、全skuGroupのコードを取得
    const variants = new Variants(product.ShopifyVariants);
    const skuGroupCodes = variants.allSkuGroupCodes;
    // skuGroupのコードからskuGroupを取得
    const skuGroups = await getSKUGroups(this.db, skuGroupCodes);
    const skuGroupMap = new Map<string, string[]>(
      skuGroups.map((g) => [g.code, g.skus.map((s) => s.sku?.code ?? "")]),
    );
    // 全skuのコードを取得(skuGroupのskuも含む)
    const skuCodes = variants.getAllSkusCodes(skuGroupMap);
    // skuのコードからskuを取得
    const skus = await getSkus(this.db, skuCodes);
    const skuMap = new Map<string, CompletedSKU>(
      skus.map((s) => [s.code, new SKU(s, this.locale).completed]),
    );

    // variantの情報を整形
    const completedVariants = product.ShopifyVariants.map(
      (v) => new Variant(v, skuMap, skuGroupMap, this.locale).completed,
    );

    // defaultScheduleを取得(各variantの中で最も早いスケジュールを選択)
    const defaultSchedule =
      earliest(completedVariants.map((v) => v.schedule)) ?? makeSchedule(null, this.locale);

    return {
      productName: product.productName,
      variants: completedVariants,
      skus: Object.fromEntries(skuMap.entries()),
      skuGroups: Object.fromEntries(skuGroupMap.entries()),
      defaultSchedule,
    };
  }
}

const getProduct = async (db: DB, shopifyProductId: string) => {
  return db.prisma.shopifyProducts.findFirst({
    where: { productId: shopifyProductId },
    select: {
      productName: true,
      ShopifyVariants: {
        select: {
          variantId: true,
          variantName: true,
          skusJSON: true,
          skuGroupsJSON: true,
        },
      },
    },
  });
};

type ProductData = Exclude<Awaited<ReturnType<typeof getProduct>>, null>;
type ProductVariantData = ProductData["ShopifyVariants"][number];

class Variants {
  constructor(private _variants: ProductVariantData[]) {}

  get allSkuGroupCodes(): string[] {
    const codes = this._variants.flatMap((v) =>
      sanitizeSkuGroupsJSON(v.skuGroupsJSON).map((s) => s.skuGroupCode),
    );
    return Array.from(new Set(codes));
  }

  getAllSkusCodes(skuGroupMap: Map<string, string[]>): string[] {
    const skus = this._variants.flatMap((v) => sanitizeSkusJSON(v.skusJSON));
    return Array.from(new Set(skus.concat(...skuGroupMap.values())));
  }
}

type SkuGroup = { label: string; skuGroupCode: string };

type CompletedVariant = {
  variantId: string;
  variantName: string;
  skus: string[];
  skuGroups: SkuGroup[];
  schedule: Schedule | null;
};

class Variant {
  constructor(
    private _variant: ProductVariantData,
    private skuMap: Map<string, CompletedSKU>,
    private skuGroupMap: Map<string, string[]>,
    private locale: Locale,
  ) {}

  get skus(): string[] {
    return sanitizeSkusJSON(this._variant.skusJSON);
  }

  get skuGroups(): SkuGroup[] {
    return sanitizeSkuGroupsJSON(this._variant.skuGroupsJSON);
  }

  get skuGroupsSkus(): string[] {
    return this.skuGroups.flatMap((s) => this.skuGroupMap.get(s.skuGroupCode) ?? []);
  }

  get schedule(): Schedule | null {
    // MEMO: skusJSONとskuGroupsJSONの両方が登録されているとスケジュールが狂うので注意
    return latest([
      latest(this.skus.map((code) => this.skuMap.get(code)!.schedule)),
      earliest(this.skuGroupsSkus.map((code) => this.skuMap.get(code)!.schedule)),
      // 本日ベースのスケジュールも入れて、誤って過去日がdefaultScheduleにならないようにする
      makeSchedule(null, this.locale),
    ]);
  }

  get completed(): CompletedVariant {
    if (this.skus.length) {
      return {
        variantId: this._variant.variantId,
        variantName: this._variant.variantName,
        skus: this.skus,
        skuGroups: [],
        schedule: this.schedule,
      };
    }
    if (this.skuGroups.length) {
      return {
        variantId: this._variant.variantId,
        variantName: this._variant.variantName,
        skus: [],
        skuGroups: this.skuGroups,
        schedule: this.schedule,
      };
    }

    return {
      variantId: this._variant.variantId,
      variantName: this._variant.variantName,
      skus: [],
      skuGroups: [],
      schedule: null,
    };
  }
}

export type CompletedSKU = {
  id: number;
  code: string;
  name: string;
  displayName: string;
  schedule: Schedule | null;
  sortNumber: number;
  skipDeliveryCalc: boolean;
};

class SKU {
  constructor(
    private _sku: SkuData,
    private locale: Locale,
  ) {}

  get schedule(): Schedule | null {
    const scheduleCode = this._sku.skipDeliveryCalc
      ? null
      : this._sku.currentInventoryOrderSKU?.ShopifyInventoryOrders?.deliverySchedule ?? null;

    return latest([
      makeScheduleFromDeliverySchedule(scheduleCode, this.locale),
      // 本日ベースのスケジュールも入れて、誤って過去日がscheduleにならないようにする
      makeSchedule(null, this.locale),
    ]);
  }

  get completed(): CompletedSKU {
    return {
      id: this._sku.id,
      code: this._sku.code,
      name: this._sku.name,
      displayName: this._sku.displayName ?? "",
      schedule: this.schedule,
      sortNumber: this._sku.sortNumber,
      skipDeliveryCalc: this._sku.skipDeliveryCalc ?? false,
    };
  }
}

type SkuData = Awaited<ReturnType<typeof getSkus>>[number];

const getSkus = async (db: DB, skuCodes: string[]) => {
  if (!skuCodes.length) return [];
  return db.prisma.shopifyCustomSKUs.findMany({
    where: { code: { in: skuCodes } },
    select: {
      id: true,
      code: true,
      name: true,
      displayName: true,
      skipDeliveryCalc: true,
      sortNumber: true,
      currentInventoryOrderSKU: {
        select: {
          id: true,
          ShopifyInventoryOrders: {
            select: {
              id: true,
              name: true,
              deliverySchedule: true,
            },
          },
        },
      },
    },
  });
};

const getSKUGroups = async (db: DB, skuGroupCodes: string[]) => {
  if (!skuGroupCodes.length) return [];
  return db.prisma.shopifyCustomSKUGroups.findMany({
    where: { code: { in: skuGroupCodes } },
    select: {
      id: true,
      code: true,
      skus: {
        select: {
          sku: {
            select: {
              code: true,
            },
          },
        },
        orderBy: { sort: "asc" },
      },
    },
  });
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

const sanitizeSkuGroupsJSON = (
  json: string | null,
): Array<{ label: string; skuGroupCode: string }> => {
  if (typeof json !== "string") return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    const isValid = parsed.every((item) => {
      if (typeof item !== "object") return false;
      return !(typeof item.label !== "string" || typeof item.skuGroupCode !== "string");
    });
    return isValid ? parsed : [];
  } catch (_) {
    return [];
  }
};

const uniqueBy = <T, K extends keyof T>(arr: T[], key: K) => {
  const map = new Map<T[K], T>();
  for (const item of arr) {
    map.set(item[key], item);
  }
  return Array.from(map.values());
};
