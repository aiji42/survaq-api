import { relations } from "drizzle-orm";
import * as schema from "./schema";

export const shopifyProductsRelation = relations(
  schema.shopifyProducts,
  ({ one, many }) => ({
    group: one(schema.shopifyProductGroups, {
      fields: [schema.shopifyProducts.productGroupId],
      references: [schema.shopifyProductGroups.id],
    }),
    variants: many(schema.shopifyVariants),
    pages: many(schema.shopifyPages),
  })
);

export const shopifyVariantsRelation = relations(
  schema.shopifyVariants,
  ({ one, many }) => ({
    product: one(schema.shopifyProducts, {
      fields: [schema.shopifyVariants.product],
      references: [schema.shopifyProducts.id],
    }),
    skus: many(schema.shopifyVariantsShopifyCustomSkUs),
  })
);

export const shopifyVariantsToShopifyCustomSKUsRelation = relations(
  schema.shopifyVariantsShopifyCustomSkUs,
  ({ one }) => ({
    variant: one(schema.shopifyVariants, {
      fields: [schema.shopifyVariantsShopifyCustomSkUs.shopifyVariantsId],
      references: [schema.shopifyVariants.id],
    }),
    sku: one(schema.shopifyCustomSkUs, {
      fields: [schema.shopifyVariantsShopifyCustomSkUs.shopifyCustomSkUsId],
      references: [schema.shopifyCustomSkUs.id],
    }),
  })
);

export const shopifyCustomSKUsRelation = relations(
  schema.shopifyCustomSkUs,
  ({ one, many }) => ({
    variant: many(schema.shopifyVariantsShopifyCustomSkUs),
    crntInvOrderSKU: one(schema.shopifyInventoryOrderSkUs, {
      fields: [schema.shopifyCustomSkUs.currentInventoryOrderSkuId],
      references: [schema.shopifyInventoryOrderSkUs.id],
    }),
  })
);

export const shopifyInventoryOrderSKUsRelation = relations(
  schema.shopifyInventoryOrderSkUs,
  ({ one }) => ({
    sku: one(schema.shopifyCustomSkUs, {
      fields: [schema.shopifyInventoryOrderSkUs.skuId],
      references: [schema.shopifyCustomSkUs.id],
    }),
    invOrder: one(schema.shopifyInventoryOrders, {
      fields: [schema.shopifyInventoryOrderSkUs.inventoryOrderId],
      references: [schema.shopifyInventoryOrders.id],
    }),
  })
);

export const shopifyPageRelation = relations(
  schema.shopifyPages,
  ({ one }) => ({
    product: one(schema.shopifyProducts, {
      fields: [schema.shopifyPages.product],
      references: [schema.shopifyProducts.id],
    }),
    logoFile: one(schema.directusFiles, {
      fields: [schema.shopifyPages.logo],
      references: [schema.directusFiles.id],
    }),
    faviconFile: one(schema.directusFiles, {
      fields: [schema.shopifyPages.favicon],
      references: [schema.directusFiles.id],
    }),
  })
);
