import { ShopifyOrder } from "../types/shopify";
import { getClient } from "./db";
import { Notifier } from "./slack";

const API_VERSION = "2023-10";

export const getShopifyClient = (env: { SHOPIFY_ACCESS_TOKEN: string }) => {
  const headers = new Headers({
    "X-Shopify-Access-Token": env.SHOPIFY_ACCESS_TOKEN,
    "Content-Type": "application/json",
  });

  return {
    updateOrderNoteAttributes: (
      original: ShopifyOrder,
      newNoteAttribute: ShopifyOrder["note_attributes"],
    ) => {
      const merged = new Map(
        original.note_attributes.concat(newNoteAttribute).map(({ name, value }) => [name, value]),
      );

      return fetch(
        `https://survaq.myshopify.com/admin/api/${API_VERSION}/orders/${original.id}.json`,
        {
          method: "PUT",
          body: JSON.stringify({
            order: {
              id: original.id,
              note_attributes: Array.from(merged, ([name, value]) => ({
                name,
                value,
              })),
            },
          }),
          headers,
        },
      );
    },
  };
};

type LineItemCustomAttr = {
  id: number;
  name: string;
  _skus: string[];
};

const LINE_ITEMS = "__line_items";
const EMPTY = "[]";
const SKUS = "_skus";

export const getPersistedListItemCustomAttrs = (data: ShopifyOrder): LineItemCustomAttr[] => {
  const { value = EMPTY } = data.note_attributes.find(({ name }) => name === LINE_ITEMS) ?? {};
  return JSON.parse(value);
};

export const getNewLineItemCustomAttrs = async (
  data: ShopifyOrder,
  getVariant: ReturnType<typeof getClient>["getVariant"],
  notifier: Notifier,
) => {
  const skusByLineItemId = Object.fromEntries(
    getPersistedListItemCustomAttrs(data)
      .filter(({ [SKUS]: skus }) => skus.length > 0)
      .map(({ id, [SKUS]: skus }) => [id, JSON.stringify(skus)]),
  );

  return Promise.all<LineItemCustomAttr>(
    data.line_items.map(async ({ id, name, properties, variant_id }) => {
      let skus = skusByLineItemId[id] ?? properties.find((p) => p.name === SKUS)?.value;
      if (!skus || skus === EMPTY)
        try {
          const skusJson = (await getVariant(variant_id))?.skusJson;
          if (!skusJson) notifier.appendNotConnectedSkuOrder(data, "notify-order");
          else skus = skusJson;
        } catch (e) {
          notifier.appendErrorMessage(e);
        }

      return { id, name, [SKUS]: JSON.parse(skus ?? EMPTY) };
    }),
  );
};

export const isEqualLineItemCustomAttrs = (
  dataA: LineItemCustomAttr[],
  dataB: LineItemCustomAttr[],
): boolean => {
  if (dataA.length !== dataB.length) return false;

  const sortedA = [...dataA].sort((a, b) => a.id - b.id);
  const sortedB = [...dataB].sort((a, b) => a.id - b.id);

  return sortedA.every((a, index) => {
    const b = sortedB[index];
    if (a.id !== b?.id) return false;
    const [skusA, skusB] = [new Set(a._skus), new Set(b._skus)];
    return skusA.size === skusB.size && [...skusA].every((item) => skusB.has(item));
  });
};
