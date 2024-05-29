import { Pool } from "@prisma/pg-worker";
import { PrismaPg } from "@prisma/adapter-pg-worker";
import { PrismaClient, Prisma } from "@prisma/client";

type TransactionalPrismaClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export class DB {
  public readonly prisma: PrismaClient | TransactionalPrismaClient;

  constructor(env: { DATABASE_URL: string } | TransactionalPrismaClient) {
    if ("DATABASE_URL" in env) {
      const pool = new Pool({ connectionString: env.DATABASE_URL });
      const adapter = new PrismaPg(pool);
      this.prisma = new PrismaClient({ adapter });
    } else {
      this.prisma = env;
    }
  }

  async useTransaction<T>(
    transactionalProcess: (db: DB) => Promise<T>,
    timeout = 15000,
  ): Promise<T> {
    return (this.prisma as PrismaClient).$transaction(
      async (prisma) => {
        const db = new DB(prisma);
        return transactionalProcess(db);
      },
      {
        // 「Transaction API error: Transaction already closed: Could not perform operation.」を防ぐためタイムアウトを延長
        timeout, // default: 5000
      },
    );
  }

  getAllProducts() {
    return this.prisma.shopifyProducts.findMany({
      select: {
        productName: true,
        productId: true,
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
        skuGroupsJSON: true,
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

  getPage(pathnameOrDomain: string) {
    return this.prisma.shopifyPages.findFirst({
      orderBy: { updatedAt: "desc" },
      where: {
        NOT: { pathname: { contains: "test" } },
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
            productId: true,
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

  getTransactionMail(id: number) {
    return this.prisma.transactionMails.findFirst({
      where: { id },
      select: {
        id: true,
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

  getCancelRequest(id: number) {
    return this.prisma.cancelRequests.findFirstOrThrow({
      where: { id },
      select: {
        id: true,
        orderKey: true,
        store: true,
        status: true,
        reason: true,
        log: true,
        note: true,
      },
    });
  }

  getCancelRequestByOrderKey(orderKey: string | number) {
    return this.prisma.cancelRequests.findFirst({
      where: { orderKey: String(orderKey) },
      select: {
        id: true,
        orderKey: true,
        store: true,
        status: true,
        reason: true,
        log: true,
        note: true,
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
      skipDuplicates: true,
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

  updateTransactionMail(id: number, data: Prisma.TransactionMailsUpdateInput) {
    return this.prisma.transactionMails.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  removeDirectusFiles(id: string) {
    return this.prisma.directus_files.delete({
      where: { id },
    });
  }

  createCancelRequest(data: Prisma.CancelRequestsCreateInput) {
    return this.prisma.cancelRequests.create({
      data: {
        ...data,
        updatedAt: new Date(),
        createdAt: new Date(),
      },
    });
  }

  updateCancelRequestByOrderKey(orderKey: string, data: Prisma.CancelRequestsUpdateInput) {
    return this.prisma.cancelRequests.update({
      where: { orderKey },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }
}
