import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";

type ValidationResult = {
  products: {
    id: number | string;
    name: string;
    cmsLink: string;
    message: string;
  }[];
  variations: {
    id: number | string;
    name: string;
    cmsLink: string;
    message: string;
  }[];
  inventories: {
    id: number | string;
    name: string;
    cmsLink: string;
    message: string;
  }[];
};

export class CMSChecker extends KiribiPerformer<{ orderId: number }, void, Bindings> {
  private db: DB;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.db = new DB(env);
  }

  perform(payload: { orderId: number }): Promise<void> | void {
    return undefined;
  }

  async validate(): Promise<ValidationResult> {
    const result: ValidationResult = {
      products: [],
      variations: [],
      inventories: [],
    };

    await this.db.useTransaction(async (tDB) => {
      // 商品グループが設定されていない商品を取得
      (await getNotGroupedProducts(tDB.prisma)).forEach((product) => {
        result.products.push({
          id: product.productId,
          name: product.productName,
          cmsLink: cmsProductLink(product.id),
          message: "商品グループが設定されていません",
        });
      });

      // バリエーションとSKUの整合性を確認
      const skuCodes = new Set<string>((await getAllSKUCodes(tDB.prisma)).map(({ code }) => code));
      const notConnectedSKUVariations = await getNotConnectedSKUVariations(tDB.prisma);
      notConnectedSKUVariations.forEach((variant) => {
        if (!variant.skusJSON) {
          result.variations.push({
            id: variant.variantId,
            name: variant.variantName,
            cmsLink: cmsVariationLink(variant.id),
            message: "SKUが設定されていません",
          });
          return;
        }

        try {
          const skus: string[] = JSON.parse(variant.skusJSON);
          if (skus.some((sku) => !skuCodes.has(sku)))
            result.variations.push({
              id: variant.variantId,
              name: variant.variantName,
              cmsLink: cmsVariationLink(variant.id),
              message: "存在しないSKUコードがskusJSONに含まれています",
            });
        } catch (_) {
          result.variations.push({
            id: variant.variantId,
            name: variant.variantName,
            cmsLink: cmsVariationLink(variant.id),
            message: "skusJSONの形式が間違っています",
          });
        }
      });

      // 発注内訳のSKUの重複を確認
      (await getAllDuplicatedInventorySKUs(tDB.prisma)).forEach((inventoryOrder) => {
        const skus = [
          ...new Set(inventoryOrder.ShopifyInventoryOrderSKUs.map(({ sku }) => sku?.code)),
        ];
        const ids = [...new Set(inventoryOrder.ShopifyInventoryOrderSKUs.map(({ id }) => id))];

        result.inventories.push({
          id: inventoryOrder.id,
          name: inventoryOrder.name,
          message: `発注内訳に重複があります (SKU:[${skus.join(",")}] 発注内訳:[${ids.join(",")}])`,
          cmsLink: cmsInventoryLink(inventoryOrder.id),
        });
      });
    });

    return result;
  }
}

const cmsProductLink = (id: number) => `https://cms.survaq.com/admin/content/ShopifyProducts/${id}`;

const cmsVariationLink = (id: number) =>
  `https://cms.survaq.com/admin/content/ShopifyVariants/${id}`;

const cmsInventoryLink = (id: number) =>
  `https://cms.survaq.com/admin/content/ShopifyInventoryOrders/${id}`;

const getNotGroupedProducts = async (tDB: DB["prisma"]) => {
  return tDB.shopifyProducts.findMany({
    select: {
      id: true,
      productName: true,
      productId: true,
    },
    where: { productGroupId: null },
  });
};

const getNotConnectedSKUVariations = async (transactedPrisma: DB["prisma"]) => {
  return transactedPrisma.shopifyVariants.findMany({
    select: {
      id: true,
      variantId: true,
      variantName: true,
      skusJSON: true,
    },
    where: {
      skus: {
        none: {
          sku: { isNot: null },
        },
      },
    },
  });
};

const getAllSKUCodes = async (transactedPrisma: DB["prisma"]) => {
  return transactedPrisma.shopifyCustomSKUs.findMany({
    select: { code: true },
  });
};

const getAllDuplicatedInventorySKUs = async (transactedPrisma: DB["prisma"]) => {
  const data = await transactedPrisma.shopifyInventoryOrderSKUs.groupBy({
    by: ["inventoryOrderId", "skuId"],
    having: {
      skuId: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  if (!data.length) return [];

  return transactedPrisma.shopifyInventoryOrders.findMany({
    select: {
      id: true,
      name: true,
      ShopifyInventoryOrderSKUs: {
        where: {
          skuId: { in: data.flatMap(({ skuId }) => skuId ?? []) },
        },
        select: {
          id: true,
          sku: {
            select: {
              code: true,
            },
          },
        },
      },
    },
    where: {
      id: { in: data.map(({ inventoryOrderId }) => inventoryOrderId) },
    },
  });
};
