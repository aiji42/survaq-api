import { PrismaClient, Prisma } from "@prisma/client/edge";

let prisma: PrismaClient;

export const setClient = (url: string) => {
  prisma = new PrismaClient({
    datasourceUrl: url,
  });
};

export const getAllProducts = () => {
  return prisma.shopifyProducts.findMany({
    select: { productName: true, productId: true },
  });
};

export const getProduct = (productId: string) => {
  return prisma.shopifyProducts.findFirst({
    include: {
      ShopifyProductGroups: true,
      ShopifyVariants: {
        include: {
          ShopifyVariants_ShopifyCustomSKUs: {
            include: {
              ShopifyCustomSKUs: {
                include: {
                  currentInventoryOrderSKU: {
                    include: {
                      ShopifyInventoryOrders: true,
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
    where: { productId },
  });
};
export type Product = Exclude<Awaited<ReturnType<typeof getProduct>>, null>;

export const insertProduct = (data: Prisma.ShopifyProductsCreateInput) => {
  return prisma.shopifyProducts.create({
    data: {
      ...data,
      updatedAt: new Date(),
      createdAt: new Date(),
    },
  });
};

export const getVariants = (productId: number) => {
  return prisma.shopifyVariants.findMany({
    where: {
      product: productId,
    },
  });
};

export const insertVariantMany = (
  data: Prisma.ShopifyVariantsCreateManyInput[]
) => {
  return prisma.shopifyVariants.createMany({
    data: data.map((item) => ({
      ...item,
      updatedAt: new Date(),
      createdAt: new Date(),
    })),
    skipDuplicates: true,
  });
};

export const deleteVariantMany = (variantIds: string[]) => {
  return prisma.shopifyVariants.deleteMany({
    where: { variantId: { in: variantIds } },
  });
};

export const deleteVariantManyByProductId = (productId: number) => {
  return prisma.shopifyVariants.deleteMany({
    where: { product: productId },
  });
};

export const updateVariant = (
  variantId: string,
  data: Prisma.ShopifyVariantsUpdateInput
) => {
  return prisma.shopifyVariants.update({ data, where: { variantId } });
};

export const getSKUs = (codes: string[]) => {
  return prisma.shopifyCustomSKUs.findMany({
    include: {
      currentInventoryOrderSKU: {
        include: {
          ShopifyInventoryOrders: true,
        },
      },
    },
    where: {
      code: { in: codes },
    },
  });
};
export type SKUs = Awaited<ReturnType<typeof getSKUs>>;

export const getAllPages = () => {
  return prisma.shopifyPages.findMany({
    select: {
      pathname: true,
      domain: true,
    },
  });
};

export const getPage = (pathnameOrDomain: string) => {
  return prisma.shopifyPages.findFirst({
    where: {
      OR: [{ pathname: pathnameOrDomain }, { domain: pathnameOrDomain }],
    },
    include: {
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
        include: {
          ShopifyProductGroups: true,
          ShopifyVariants: {
            include: {
              ShopifyVariants_ShopifyCustomSKUs: {
                include: {
                  ShopifyCustomSKUs: {
                    include: {
                      currentInventoryOrderSKU: {
                        include: {
                          ShopifyInventoryOrders: true,
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
};
