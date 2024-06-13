import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { DB } from "../libs/db";
import { SlackNotifier } from "../libs/models/slack/SlackNotifier";
import { sanitizeSkuGroupsJSON, sanitizeSkusJSON } from "../libs/models/cms/Product";
import { SLACK_CHANNEL } from "../constants";

type Provider = "shopify" | "rakuten" | "amazon";

export type ValidationResult = {
  products: {
    id: number | string;
    provider: Provider;
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
  skus: {
    code: string;
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
  tokens: {
    name: string;
    cmsLink: string;
    message: string;
    level: "info" | "warning" | "danger";
  }[];
};

/**
 * CMSの設定値に問題がないか確認するタスク
 */
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
        SLACK_CHANNEL.ALERT,
      );
    if (result.variations.length)
      this.slack.append(
        {
          title: "バリエーションを確認してください",
          text: `${result.variations.length}件の問題が発生中`,
          color: "danger",
        },
        SLACK_CHANNEL.ALERT,
      );
    if (result.skus.length)
      this.slack.append(
        {
          title: "SKUを確認してください",
          text: `${result.skus.length}件の問題が発生中`,
          color: "danger",
        },
        SLACK_CHANNEL.ALERT,
      );
    if (result.inventories.length)
      this.slack.append(
        {
          title: "発注を確認してください",
          text: `${result.inventories.length}件の問題が発生中`,
          color: "danger",
        },
        SLACK_CHANNEL.ALERT,
      );

    const tokenProblemCount = result.tokens.filter(({ level }) => level === "danger").length;
    if (tokenProblemCount)
      this.slack.append(
        {
          title: "トークン情報を確認してください",
          text: `${tokenProblemCount}件の問題が発生中`,
          color: "danger",
        },
        SLACK_CHANNEL.ALERT,
      );

    await this.slack.notify(
      "設定値に問題が発生しています。<https://api.survaq.com/portal/status|ステータスページ>を確認し、適宜対応してください。",
    );
  }

  async validate(): Promise<ValidationResult> {
    const result: ValidationResult = {
      products: [],
      variations: [],
      skus: [],
      inventories: [],
      tokens: [],
    };

    await this.db.useTransaction(async (tDB) => {
      const getNotGroupedProductsPromise = getNotGroupedProducts(tDB.prisma);
      const getAllSKUCodesPromise = getAllSKUCodes(tDB.prisma);
      const getAllSKUGroupCodesPromise = getAllSKUGroupCodes(tDB.prisma);
      const getAllVariationsPromise = getAllVariations(tDB.prisma);
      const getAllDuplicatedInventorySKUsPromise = getAllDuplicatedInventorySKUs(tDB.prisma);
      const getNegativeInventorySKUsPromise = getNegativeInventorySKUs(tDB.prisma);
      const getTokensPromise = getTokens(tDB.prisma);

      // 商品グループが設定されていない商品を取得
      (await getNotGroupedProductsPromise).forEach((product) => {
        if (product.provider === "shopify")
          result.products.push({
            provider: product.provider,
            id: product.productId,
            name: product.productName,
            cmsLink: cmsProductLink(product.id, product.provider),
            message: "商品グループが設定されていません",
          });
        else if (product.provider === "rakuten")
          result.products.push({
            provider: product.provider,
            id: product.rakutenItemId,
            name: product.title,
            cmsLink: cmsProductLink(product.id, product.provider),
            message: "商品グループが設定されていません",
          });
        else
          result.products.push({
            provider: product.provider,
            id: product.amazonItemId,
            name: product.title,
            cmsLink: cmsProductLink(product.id, product.provider),
            message: "商品グループが設定されていません",
          });
      });

      // バリエーションとSKUの整合性を確認
      const skuCodes = new Set<string>((await getAllSKUCodesPromise).map(({ code }) => code));
      const skuGroupCodes = new Set<string>(
        (await getAllSKUGroupCodesPromise).map(({ code }) => code),
      );
      const variations = await getAllVariationsPromise;
      variations.forEach((variant) => {
        const skus = sanitizeSkusJSON(variant.skusJSON);
        const skuGroups = sanitizeSkuGroupsJSON(variant.skuGroupsJSON);

        if (!skus.length && !skuGroups.length) {
          result.variations.push({
            id: variant.variantId,
            name: variant.variantName,
            cmsLink: cmsVariationLink(variant.id),
            message: "SKUが設定されていません",
          });
          return;
        }

        if (skus.some((sku) => !skuCodes.has(sku)))
          result.variations.push({
            id: variant.variantId,
            name: variant.variantName,
            cmsLink: cmsVariationLink(variant.id),
            message: "存在しないSKUコードがskusJSONに含まれています",
          });

        if (skuGroups.some(({ skuGroupCode }) => !skuGroupCodes.has(skuGroupCode)))
          result.variations.push({
            id: variant.variantId,
            name: variant.variantName,
            cmsLink: cmsVariationLink(variant.id),
            message: "存在しないSKUグループコードがskuGroupsJSONに含まれています",
          });
      });

      // 発注内訳のSKUの重複を確認
      (await getAllDuplicatedInventorySKUsPromise).forEach((inventoryOrder) => {
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

      // 在庫がマイナスになっているSKUを確認
      (await getNegativeInventorySKUsPromise).forEach((sku) => {
        result.skus.push({
          code: sku.code,
          name: sku.name,
          message: `在庫がマイナスになっています(在庫数: ${sku.inventory})`,
          cmsLink: cmsSKULink(sku.id),
        });
      });
      await getTokensPromise.then((tokens) => {
        if (!tokens.rakutenExpireDate) {
          result.tokens.push({
            name: "Rakutenライセンスキー",
            message: "ライセンスキーの有効期限が登録されていません",
            cmsLink: "https://cms.survaq.com/admin/content/Tokens",
            level: "danger",
          });
          return;
        }
        // 有効期限を確認し、残り3日なら警告、残り1日なら危険
        const expireDate = new Date(tokens.rakutenExpireDate);
        const today = new Date();
        const diff = expireDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
        const level = diffDays <= 1 ? "danger" : diffDays <= 3 ? "warning" : "info";
        const message =
          diffDays < 1
            ? "有効期限が切れています"
            : diffDays <= 3
              ? `有効期限は残り${diffDays}日で切れます。RMSにログインしてライセンスキーを更新してください。`
              : `有効期限は残り${diffDays}日です`;
        result.tokens.push({
          name: "Rakutenライセンスキー",
          message,
          cmsLink: cmsTokenLink(),
          level,
        });
      });
    });

    return result;
  }
}

const cmsProductLink = (id: number, provider: Provider) =>
  provider === "shopify"
    ? `https://cms.survaq.com/admin/content/ShopifyProducts/${id}`
    : provider === "rakuten"
      ? `https://cms.survaq.com/admin/content/RakutenItems/${id}`
      : `https://cms.survaq.com/admin/content/AmazonItems/${id}`;

const cmsVariationLink = (id: number) =>
  `https://cms.survaq.com/admin/content/ShopifyVariants/${id}`;

const cmsInventoryLink = (id: number) =>
  `https://cms.survaq.com/admin/content/ShopifyInventoryOrders/${id}`;

const cmsSKULink = (id: number) => `https://cms.survaq.com/admin/content/ShopifyCustomSKUs/${id}`;

const cmsTokenLink = () => "https://cms.survaq.com/admin/content/Tokens";

const getNotGroupedProducts = async (tDB: DB["prisma"]) => {
  const [shopify, rakuten, amazon] = await Promise.all([
    tDB.shopifyProducts.findMany({
      select: {
        id: true,
        productName: true,
        productId: true,
      },
      where: { productGroupId: null },
    }),
    tDB.rakutenItems.findMany({
      select: {
        id: true,
        title: true,
        rakutenItemId: true,
      },
      where: { productGroupId: null },
    }),
    tDB.amazonItems.findMany({
      select: {
        id: true,
        title: true,
        amazonItemId: true,
      },
      where: { productGroupId: null },
    }),
  ]);

  return [
    ...shopify.map<{
      provider: "shopify";
      id: number;
      productName: string;
      productId: string;
    }>((data) => ({ provider: "shopify", ...data })),
    ...rakuten.map<{
      provider: "rakuten";
      id: number;
      title: string;
      rakutenItemId: string;
    }>((data) => ({ provider: "rakuten", ...data })),
    ...amazon.map<{
      provider: "amazon";
      id: number;
      title: string;
      amazonItemId: string;
    }>((data) => ({ provider: "amazon", ...data })),
  ];
};

const getAllVariations = async (transactedPrisma: DB["prisma"]) => {
  return transactedPrisma.shopifyVariants.findMany({
    select: {
      id: true,
      variantId: true,
      variantName: true,
      skusJSON: true,
      skuGroupsJSON: true,
    },
  });
};

const getAllSKUCodes = async (transactedPrisma: DB["prisma"]) => {
  return transactedPrisma.shopifyCustomSKUs.findMany({
    select: { code: true },
  });
};

const getAllSKUGroupCodes = async (transactedPrisma: DB["prisma"]) => {
  return transactedPrisma.shopifyCustomSKUGroups.findMany({
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

const getNegativeInventorySKUs = async (transactedPrisma: DB["prisma"]) => {
  return transactedPrisma.shopifyCustomSKUs.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      inventory: true,
    },
    where: {
      inventory: {
        lt: 0,
      },
    },
  });
};

const getTokens = async (transactedPrisma: DB["prisma"]) => {
  return transactedPrisma.tokens.findFirstOrThrow({
    select: {
      rakutenExpireDate: true,
    },
  });
};
