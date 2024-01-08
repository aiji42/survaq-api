import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as base from "../../drizzle/schema";
import * as relations from "../../drizzle/relations";
import { eq, or, inArray } from "drizzle-orm";
import { PgInsertValue, PgUpdateSetSource } from "drizzle-orm/pg-core";

const schema = {
  ...base,
  ...relations,
};

export const getClient = (env: string | { DATABASE_URL: string }) => {
  const pool = new Pool({
    connectionString: typeof env === "string" ? env : env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  const client = drizzle(pool, { schema });

  return {
    cleanUp: () => pool.end(),

    getAllProducts: () => {
      return client.query.shopifyProducts.findMany({
        columns: {
          productName: true,
          productId: true,
        },
      });
    },

    getProductWithGroup: (productId: string) => {
      return client.query.shopifyProducts.findFirst({
        with: {
          group: true,
        },
        where: eq(schema.shopifyProducts.productId, productId),
      });
    },

    getProduct: (productId: string) => {
      return client.query.shopifyProducts.findFirst({
        columns: {
          id: true,
          productName: true,
          productId: true,
        },
        with: {
          variants: {
            columns: {
              id: true,
              variantName: true,
              variantId: true,
              skusJson: true,
              customSelects: true,
              skuLabel: true,
            },
            with: {
              skus: {
                with: {
                  sku: {
                    columns: {
                      id: true,
                      code: true,
                      name: true,
                      subName: true,
                      displayName: true,
                      skipDeliveryCalc: true,
                      sortNumber: true,
                    },
                    with: {
                      crntInvOrderSKU: {
                        columns: {
                          id: true,
                        },
                        with: {
                          invOrder: {
                            columns: {
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
                orderBy: (record, { asc }) => [
                  asc(record.sort),
                  asc(record.id),
                ],
              },
            },
          },
        },
        where: eq(schema.shopifyProducts.productId, productId),
      });
    },

    insertProduct: (data: PgInsertValue<typeof schema.shopifyProducts>) => {
      return client
        .insert(schema.shopifyProducts)
        .values({
          ...data,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        })
        .returning();
    },

    getVariants: (productRecordId: number) => {
      return client.query.shopifyVariants.findMany({
        columns: {
          variantId: true,
          variantName: true,
        },
        where: eq(schema.shopifyVariants.product, productRecordId),
      });
    },

    getVariant: (variantId: number | string) => {
      return client.query.shopifyVariants.findFirst({
        where: eq(schema.shopifyVariants.variantId, String(variantId)),
      });
    },

    insertVariantMany: (
      data: PgInsertValue<typeof schema.shopifyVariants>[],
    ) => {
      return client.insert(schema.shopifyVariants).values(
        data.map((item) => ({
          ...item,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        })),
      );
    },

    deleteVariantMany: (variantIds: string[]) => {
      return client
        .delete(schema.shopifyVariants)
        .where(inArray(schema.shopifyVariants.variantId, variantIds));
    },

    deleteVariantManyByProductId: (productId: number) => {
      return client
        .delete(schema.shopifyVariants)
        .where(eq(schema.shopifyVariants.product, productId));
    },

    updateVariant: (
      variantId: string,
      data: PgUpdateSetSource<typeof schema.shopifyVariants>,
    ) => {
      return client
        .update(schema.shopifyVariants)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.shopifyVariants.variantId, variantId));
    },

    getSKUs: (codes: string[]) => {
      return client.query.shopifyCustomSkUs.findMany({
        columns: {
          id: true,
          code: true,
          name: true,
          subName: true,
          displayName: true,
          skipDeliveryCalc: true,
          sortNumber: true,
        },
        with: {
          crntInvOrderSKU: {
            columns: {
              id: true,
            },
            with: {
              invOrder: {
                columns: {
                  id: true,
                  name: true,
                  deliverySchedule: true,
                },
              },
            },
          },
        },
        where: inArray(schema.shopifyCustomSkUs.code, codes),
      });
    },

    getAllPages: () => {
      return client.query.shopifyPages.findMany({
        columns: {
          pathname: true,
          domain: true,
        },
      });
    },

    getPage: (pathnameOrDomain: string) => {
      return client.query.shopifyPages.findFirst({
        where: or(
          eq(schema.shopifyPages.pathname, pathnameOrDomain),
          eq(schema.shopifyPages.domain, pathnameOrDomain),
        ),
        with: {
          logoFile: {
            columns: {
              filename_disk: true,
              width: true,
              height: true,
            },
          },
          faviconFile: {
            columns: {
              filename_disk: true,
            },
          },
          product: {
            with: {
              group: true,
              variants: {
                with: {
                  skus: {
                    with: {
                      sku: {
                        with: {
                          crntInvOrderSKU: {
                            with: {
                              invOrder: true,
                            },
                          },
                        },
                      },
                    },
                    orderBy: (record, { asc }) => [
                      asc(record.sort),
                      asc(record.id),
                    ],
                  },
                },
              },
            },
          },
        },
      });
    },
  };
};

export type Client = ReturnType<typeof getClient>;

export type Product = Exclude<
  Awaited<ReturnType<Client["getProduct"]>>,
  null | undefined
>;

export type SKUs = Awaited<ReturnType<Client["getSKUs"]>>;