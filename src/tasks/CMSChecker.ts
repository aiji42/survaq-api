import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";
import { SlackNotifier } from "../libs/slack";

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

const channel = "notify-cms";

export class CMSChecker extends KiribiPerformer<undefined, void, Bindings> {
  private db: DB;
  private slack: SlackNotifier;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.db = new DB(env);
    this.slack = new SlackNotifier(env);
  }

  async perform() {
    const result = await this.validate();

    if (result.products.length)
      this.slack.append(
        {
          title: "プロダクトを確認してください",
          text: `${result.products.length}件の問題が発生中`,
          color: "danger",
        },
        channel,
      );
    if (result.variations.length)
      this.slack.append(
        {
          title: "バリエーションを確認してください",
          text: `${result.variations.length}件の問題が発生中`,
          color: "danger",
        },
        channel,
      );
    if (result.inventories.length)
      this.slack.append(
        {
          title: "発注を確認してください",
          text: `${result.inventories.length}件の問題が発生中`,
          color: "danger",
        },
        channel,
      );

    await this.slack.notify(
      "設定値に問題が発生しています。<https://api.survaq.com/status/data|ステータスページ>を確認し、適宜対応してください。",
    );
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
