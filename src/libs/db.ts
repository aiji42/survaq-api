import { Pool } from "@prisma/pg-worker";
import { PrismaPg } from "@prisma/adapter-pg-worker";
import { PrismaClient } from "@prisma/client";
import { sanitizeSkusJSON } from "./makeVariants";
import { Prisma } from ".prisma/client";

type TransactionalPrismaClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export class DB {
  public readonly prisma: PrismaClient;

  constructor(env: { DATABASE_URL: string }) {
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    this.prisma = new PrismaClient({ adapter });
  }

  getAllProducts() {
    return this.prisma.shopifyProducts.findMany({
      select: {
        productName: true,
        productId: true,
      },
    });
  }

  getProduct(productId: string, _prisma?: TransactionalPrismaClient) {
    return (_prisma ?? this.prisma).shopifyProducts.findFirst({
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
  }

  getVariants(productRecordId: number) {
    return this.prisma.shopifyVariants.findMany({
      where: { product: productRecordId },
      select: {
        variantName: true,
        variantId: true,
      },
    });
  }

  getVariant(variantId: string | number) {
    return this.prisma.shopifyVariants.findFirst({
      where: { variantId: String(variantId) },
      select: {
        skusJSON: true,
      },
    });
  }

  getSKUs(codes: string[], _prisma?: TransactionalPrismaClient) {
    if (codes.length < 1) return [];
    return (_prisma ?? this.prisma).shopifyCustomSKUs.findMany({
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
  }

  getAllPages() {
    return this.prisma.shopifyPages.findMany({
      select: {
        pathname: true,
        domain: true,
      },
    });
  }

  getPage(pathnameOrDomain: string, _prisma?: TransactionalPrismaClient) {
    return (_prisma ?? this.prisma).shopifyPages.findFirst({
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
  }

  getDeliverySchedulesBySkuCodes(codes: string[]) {
    if (codes.length < 1) return [];
    return this.prisma.shopifyCustomSKUs.findMany({
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
  }

  getTransactionMail(id: number, _prisma?: TransactionalPrismaClient) {
    return (_prisma ?? this.prisma).transactionMails.findFirst({
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
  }

  insertProduct(data: Prisma.ShopifyProductsCreateInput) {
    return this.prisma.shopifyProducts.create({
      data: {
        ...data,
        updatedAt: new Date(),
        createdAt: new Date(),
      },
    });
  }

  insertVariantMany(data: Prisma.ShopifyVariantsCreateManyInput[]) {
    return this.prisma.shopifyVariants.createMany({
      data: data.map((item) => ({
        ...item,
        updatedAt: new Date(),
        createdAt: new Date(),
      })),
    });
  }

  deleteVariantMany(variantIds: string[]) {
    if (variantIds.length < 1) return;
    return this.prisma.shopifyVariants.deleteMany({
      where: { variantId: { in: variantIds } },
    });
  }

  deleteVariantManyByProductId(productId: number) {
    return this.prisma.shopifyVariants.deleteMany({
      where: { product: productId },
    });
  }

  updateVariant(variantId: string, data: Prisma.ShopifyVariantsUpdateInput) {
    return this.prisma.shopifyVariants.update({
      where: { variantId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  updateTransactionMail(
    id: number,
    data: Prisma.TransactionMailsUpdateInput,
    _prisma?: TransactionalPrismaClient,
  ) {
    return (_prisma ?? this.prisma).transactionMails.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  removeDirectusFiles(id: string, _prisma?: TransactionalPrismaClient) {
    return (_prisma ?? this.prisma).directus_files.delete({
      where: { id },
    });
  }

  getProductWithSKUs(productId: string) {
    return this.prisma.$transaction(async (prisma) => {
      const product = await this.getProduct(productId, prisma);
      const skuCodes =
        product?.ShopifyVariants.flatMap((item) => sanitizeSkusJSON(item.skusJSON)) ?? [];
      const skus = await this.getSKUs(skuCodes, prisma);

      return { product, skus };
    });
  }

  getPageWithSKUs(code: string) {
    return this.prisma.$transaction(async (prisma) => {
      const page = await this.getPage(code, prisma);
      const skuCodes =
        page?.ShopifyProducts.ShopifyVariants.flatMap((item) => sanitizeSkusJSON(item.skusJSON)) ??
        [];
      const skus = await this.getSKUs(skuCodes, prisma);

      return { page, skus };
    });
  }
}

export type Product = Exclude<Awaited<ReturnType<DB["getProduct"]>>, null | undefined>;

export type SKUs = Awaited<ReturnType<DB["getSKUs"]>>;
