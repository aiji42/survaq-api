import { ShopifyOrder } from "../types/shopify";
import { getClient } from "./db";
import { latest, makeSchedule } from "./makeSchedule";

export type NoteAttributes = ShopifyOrder["note_attributes"];

const API_VERSION = "2023-10";

export const getShopifyClient = (env: { SHOPIFY_ACCESS_TOKEN: string }) => {
  const headers = new Headers({
    "X-Shopify-Access-Token": env.SHOPIFY_ACCESS_TOKEN,
    "Content-Type": "application/json",
  });

  return {
    updateOrderNoteAttributes: (original: ShopifyOrder, updatableNoteAttrs: NoteAttributes) => {
      const merged = new Map(
        original.note_attributes.concat(updatableNoteAttrs).map(({ name, value }) => [name, value]),
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

export const LINE_ITEMS = "__line_items";
const EMPTY_ARRAY = "[]";
const SKUS = "_skus";

export const getPersistedListItemCustomAttrs = (data: ShopifyOrder): LineItemCustomAttr[] => {
  const { value = EMPTY_ARRAY } =
    data.note_attributes.find(({ name }) => name === LINE_ITEMS) ?? {};
  return JSON.parse(value);
};

export const getNewLineItemCustomAttrs = async (
  data: ShopifyOrder,
  getVariant: ReturnType<typeof getClient>["getVariant"],
): Promise<[LineItemCustomAttr[], Error[]]> => {
  const skusByLineItemId = Object.fromEntries(
    getPersistedListItemCustomAttrs(data)
      .filter(({ [SKUS]: skus }) => skus.length > 0)
      .map(({ id, [SKUS]: skus }) => [id, JSON.stringify(skus)]),
  );

  const res = await Promise.allSettled(
    data.line_items.map(async ({ id, name, properties, variant_id }) => {
      let skus: string | undefined | null =
        skusByLineItemId[id] ?? properties.find((p) => p.name === SKUS)?.value;
      if (!skus || skus === EMPTY_ARRAY) skus = (await getVariant(variant_id))?.skusJson;

      return { id, name, [SKUS]: JSON.parse(skus ?? EMPTY_ARRAY) };
    }),
  );

  return res.reduce<[LineItemCustomAttr[], Error[]]>(
    ([successes, errs], result) => {
      if (result.status === "fulfilled") successes.push(result.value);
      else errs.push(result.reason);
      return [successes, errs];
    },
    [[], []],
  );
};

export const eqLineItemCustomAttrs = (
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

export const hasNoSkuLineItem = (data: LineItemCustomAttr[]) => {
  return data.some(({ _skus }) => _skus.length < 1);
};

type DeliveryScheduleCustomAttrs = {
  estimate: string;
  notifications: { notifiedAt: string; value: string }[];
};

export const DELIVERY_SCHEDULE = "__delivery_schedule";
const EMPTY = "{}";

export const getPersistedDeliveryScheduleCustomAttrs = (
  data: ShopifyOrder,
): DeliveryScheduleCustomAttrs | Record<string, never> => {
  const { value = EMPTY } =
    data.note_attributes.find(({ name }) => name === DELIVERY_SCHEDULE) ?? {};
  return JSON.parse(value);
};

export const hasPersistedDeliveryScheduleCustomAttrs = (data: ShopifyOrder) => {
  return "estimate" in getPersistedDeliveryScheduleCustomAttrs(data);
};

export const getNewDeliveryScheduleCustomAttrs = async (
  data: LineItemCustomAttr[],
  getSKUs: ReturnType<typeof getClient>["getSKUs"],
): Promise<DeliveryScheduleCustomAttrs> => {
  const skus = await getSKUs([...new Set(data.flatMap(({ _skus }) => _skus))]);
  const schedule =
    latest(
      skus.map((sku) => makeSchedule(sku.crntInvOrderSKU?.invOrder.deliverySchedule ?? null)),
    ) ?? makeSchedule(null);

  return {
    estimate: `${schedule.year}-${schedule.month}-${schedule.term}`,
    notifications: [
      // TODO: 通知機能ができたらここに追加していく
      // {
      //   notifiedAt: new Date().toISOString(),
      //   value: `${schedule.year}-${schedule.month}-${schedule.term}`,
      // },
    ],
  };
};
