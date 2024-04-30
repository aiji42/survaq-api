import { Pool } from "@prisma/pg-worker";
import { PrismaPg } from "@prisma/adapter-pg-worker";
import { PrismaClient } from "@prisma/client";
import { sanitizeSkusJSON } from "./makeVariants";
import { Prisma } from ".prisma/client";

const createClient = (env: { DATABASE_URL: string }) => {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const makeQueries = (
  client: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
) => {
  return {
    getAllProducts: () => {
      return client.shopifyProducts.findMany({
        select: {
          productName: true,
          productId: true,
        },
      });
    },
    getProduct: (productId: string) => {
      return client.shopifyProducts.findFirst({
        where: { productId },
        select: {
          id: true,
          productName: true,
          productId: true,
          ShopifyVariants: {
            select: {
              id: true,
              variantName: true,
              variantId: true,
              skusJSON: true,
              customSelects: true,
              skuLabel: true,
              skus: {
                select: {
                  sku: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      subName: true,
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
                  },
                },
                orderBy: [{ sort: "asc" }, { id: "asc" }],
              },
            },
          },
        },
      });
    },
    getVariants: (productRecordId: number) => {
      return client.shopifyVariants.findMany({
        where: { product: productRecordId },
        select: {
          variantName: true,
          variantId: true,
        },
      });
    },
    getVariant: (variantId: string | number) => {
      return client.shopifyVariants.findFirst({
        where: { variantId: String(variantId) },
        select: {
          skusJSON: true,
        },
      });
    },
    getSKUs: (codes: string[]) => {
      if (codes.length < 1) return [];
      return client.shopifyCustomSKUs.findMany({
        where: { code: { in: codes } },
        select: {
          id: true,
          code: true,
          name: true,
          subName: true,
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
    },
    getAllPages: () => {
      return client.shopifyPages.findMany({
        select: {
          pathname: true,
          domain: true,
        },
      });
    },
    getPage: (pathnameOrDomain: string) => {
      return client.shopifyPages.findFirst({
        where: {
          OR: [{ pathname: pathnameOrDomain }, { domain: pathnameOrDomain }],
        },
        select: {
          id: true,
          body: true,
          description: true,
          domain: true,
          ogpImageUrl: true,
          title: true,
          updatedAt: true,
          createdAt: true,
          pathname: true,
          ogpShortTitle: true,
          buyButton: true,
          customBody: true,
          customHead: true,
          logoFile: {
            select: {
              filename_disk: true,
              width: true,
              height: true,
            },
          },
          faviconFile: {
            select: {
              filename_disk: true,
            },
          },
          ShopifyProducts: {
            select: {
              id: true,
              productName: true,
              productId: true,
              ShopifyVariants: {
                select: {
                  id: true,
                  variantName: true,
                  variantId: true,
                  skusJSON: true,
                  customSelects: true,
                  skuLabel: true,
                  skus: {
                    select: {
                      sku: {
                        select: {
                          id: true,
                          code: true,
                          name: true,
                          subName: true,
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
                      },
                    },
                    orderBy: [{ sort: "asc" }, { id: "asc" }],
                  },
                },
              },
            },
          },
        },
      });
    },
    getDeliverySchedulesBySkuCodes: (codes: string[]) => {
      if (codes.length < 1) return [];
      return client.shopifyCustomSKUs.findMany({
        where: {
          code: { in: codes },
          NOT: { skipDeliveryCalc: true },
        },
        select: {
          currentInventoryOrderSKU: {
            select: {
              ShopifyInventoryOrders: {
                select: {
                  deliverySchedule: true,
                },
              },
            },
          },
        },
      });
    },
    getTransactionMail: (id: number) => {
      return client.transactionMails.findFirst({
        where: { id },
        select: {
          from: true,
          fromName: true,
          subject: true,
          body: true,
          status: true,
          log: true,
          testResource: true,
          resource: true,
        },
      });
    },
    insertProduct: (data: Prisma.ShopifyProductsCreateInput) => {
      return client.shopifyProducts.create({
        data: {
          ...data,
          updatedAt: new Date(),
          createdAt: new Date(),
        },
      });
    },
    insertVariantMany: (data: Prisma.ShopifyVariantsCreateManyInput[]) => {
      return client.shopifyVariants.createMany({
        data: data.map((item) => ({
          ...item,
          updatedAt: new Date(),
          createdAt: new Date(),
        })),
      });
    },
    deleteVariantMany: (variantIds: string[]) => {
      if (variantIds.length < 1) return;
      return client.shopifyVariants.deleteMany({
        where: { variantId: { in: variantIds } },
      });
    },
    deleteVariantManyByProductId: (productId: number) => {
      return client.shopifyVariants.deleteMany({
        where: { product: productId },
      });
    },
    updateVariant: (variantId: string, data: Prisma.ShopifyVariantsUpdateInput) => {
      return client.shopifyVariants.update({
        where: { variantId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    },
    updateTransactionMail: (id: number, data: Prisma.TransactionMailsUpdateInput) => {
      return client.transactionMails.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    },
    removeDirectusFiles: (id: string) => {
      return client.directus_files.delete({
        where: { id },
      });
    },
  };
};

export const getPrismaClient = (env: { DATABASE_URL: string }) => {
  const client = createClient(env);

  return {
    client,
    ...makeQueries(client),
    getProductWithSKUs: (productId: string) => {
      return client.$transaction(async (prisma) => {
        const { getProduct, getSKUs } = makeQueries(prisma);
        const product = await getProduct(productId);
        const skuCodes =
          product?.ShopifyVariants.flatMap((item) => sanitizeSkusJSON(item.skusJSON)) ?? [];
        const skus = await getSKUs(skuCodes);

        return { product, skus };
      });
    },
    getPageWithSKUs: (code: string) => {
      return client.$transaction(async (prisma) => {
        const { getPage, getSKUs } = makeQueries(prisma);
        const page = await getPage(code);
        const skuCodes =
          page?.ShopifyProducts.ShopifyVariants.flatMap((item) =>
            sanitizeSkusJSON(item.skusJSON),
          ) ?? [];
        const skus = await getSKUs(skuCodes);

        return { page, skus };
      });
    },
  };
};

export type Client = ReturnType<typeof getPrismaClient>;

export type Product = Exclude<Awaited<ReturnType<Client["getProduct"]>>, null | undefined>;

export type SKUs = Awaited<ReturnType<Client["getSKUs"]>>;
