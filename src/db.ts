import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import * as base from "../drizzle/schema";
import * as relations from "../drizzle/relations";
import { eq, or, inArray } from "drizzle-orm";
import { PgInsertValue, PgUpdateSetSource } from "drizzle-orm/pg-core";

const schema = {
  ...base,
  ...relations,
};

let client: NodePgDatabase<typeof schema>;

export const setClient = (url: string) => {
  const pool = new Pool({ connectionString: url });
  client = drizzle(pool, { schema });

  return pool;
};

export const getAllProducts = () => {
  return client.query.shopifyProducts.findMany({
    columns: {
      productName: true,
      productId: true,
    },
  });
};

export const getProduct = async (productId: string) => {
  return client.query.shopifyProducts.findFirst({
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
            orderBy: (record, { asc }) => [asc(record.sort), asc(record.id)],
          },
        },
      },
    },
    where: eq(schema.shopifyProducts.productId, productId),
  });
};
export type Product = Exclude<
  Awaited<ReturnType<typeof getProduct>>,
  null | undefined
>;

export const insertProduct = (
  data: PgInsertValue<typeof schema.shopifyProducts>
) => {
  return client
    .insert(schema.shopifyProducts)
    .values({
      ...data,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })
    .returning();
};

export const getVariants = (productId: number) => {
  return client.query.shopifyVariants.findMany({
    where: eq(schema.shopifyVariants.product, productId),
  });
};

export const insertVariantMany = (
  data: PgInsertValue<typeof schema.shopifyVariants>[]
) => {
  return client.insert(schema.shopifyVariants).values(
    data.map((item) => ({
      ...item,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }))
  );
};

export const deleteVariantMany = (variantIds: string[]) => {
  return client
    .delete(schema.shopifyVariants)
    .where(inArray(schema.shopifyVariants.variantId, variantIds));
};

export const deleteVariantManyByProductId = (productId: number) => {
  return client
    .delete(schema.shopifyVariants)
    .where(eq(schema.shopifyVariants.product, productId));
};

export const updateVariant = (
  variantId: string,
  data: PgUpdateSetSource<typeof schema.shopifyVariants>
) => {
  return client
    .update(schema.shopifyVariants)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.shopifyVariants.variantId, variantId));
};

export const getSKUs = (codes: string[]) => {
  return client.query.shopifyCustomSkUs.findMany({
    with: {
      crntInvOrderSKU: {
        with: {
          invOrder: true,
        },
      },
    },
    where: inArray(schema.shopifyCustomSkUs.code, codes),
  });
};
export type SKUs = Awaited<ReturnType<typeof getSKUs>>;

export const getAllPages = () => {
  return client.query.shopifyPages.findMany({
    columns: {
      pathname: true,
      domain: true,
    },
  });
};

export const getPage = (pathnameOrDomain: string) => {
  return client.query.shopifyPages.findFirst({
    where: or(
      eq(schema.shopifyPages.pathname, pathnameOrDomain),
      eq(schema.shopifyPages.domain, pathnameOrDomain)
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
};
