import { DB } from "../../db";
import { latest, makeSchedule } from "../../makeSchedule";
import { ShopifyOrder } from "./ShopifyOrder";

const EMPTY_ARRAY = "[]";
const EMPTY_OBJ = "{}";

export class ShopifyOrderForNoteAttrs extends ShopifyOrder {
  private readonly db: DB;
  private _completedLineItemCustomAttrs: LineItemCustomAttr[] | undefined;
  private _completedDeliveryScheduleCustomAttrs: DeliveryScheduleCustomAttrs | undefined;
  private readonly LINE_ITEMS = "__line_items";
  private readonly DELIVERY_SCHEDULE = "__delivery_schedule";
  private readonly SKUS = "_skus";

  constructor(env: { SHOPIFY_ACCESS_TOKEN: string; DATABASE_URL: string }) {
    super(env);
    this.db = new DB(env);
  }

  get savedLineItemCustomAttrs(): LineItemCustomAttr[] {
    const { value } = this.noteAttributes.find(({ name }) => name === this.LINE_ITEMS) ?? {};
    return JSON.parse(value || EMPTY_ARRAY);
  }

  get savedDeliveryScheduleCustomAttrs() {
    const { value } = this.noteAttributes.find(({ name }) => name === this.DELIVERY_SCHEDULE) ?? {};
    return JSON.parse(value || EMPTY_OBJ);
  }

  get hasValidSavedDeliverySchedule() {
    return (
      "estimate" in this.savedDeliveryScheduleCustomAttrs &&
      !!this.savedDeliveryScheduleCustomAttrs.estimate
    );
  }

  get completedLineItemCustomAttrs() {
    if (!this._completedLineItemCustomAttrs)
      throw new Error("Execute completeLineItemCustomAttrs() before");
    return this._completedLineItemCustomAttrs;
  }

  get completedDeliveryScheduleCustomAttrs() {
    if (!this._completedDeliveryScheduleCustomAttrs)
      throw new Error("Execute completeDeliveryScheduleCustomAttrs() before");

    return this._completedDeliveryScheduleCustomAttrs;
  }

  get isCompletedSku() {
    return this.completedLineItemCustomAttrs.every(({ _skus }) => _skus.length > 0);
  }

  get shouldUpdateLineItemCustomAttrs() {
    // この日以前の古いデータは更新しない
    const THRESHOLD_DATE = new Date("2024-01-01T00:00:00");
    return (
      THRESHOLD_DATE &&
      !eqLineItemCustomAttrs(this.completedLineItemCustomAttrs, this.savedLineItemCustomAttrs)
    );
  }

  get shouldSendDeliveryScheduleNotification() {
    // FIXME: 日時ではなく、fulfillment_statusやcancelled_at、closed_atを見て、有効かつ未発送の注文に送るようにする
    const LIMIT_DATE = new Date("2024-01-21T07:48:00");

    // まだnote_attributesにはスケージュールが保存されておらず、閾値以降の申し込みで、配送日時がSKUから計算できた場合に通知をして良いものとする
    return (
      !this.hasValidSavedDeliverySchedule &&
      !!this.completedDeliveryScheduleCustomAttrs.estimate &&
      this.createdAt > LIMIT_DATE
    );
  }

  get shouldUpdateNoteAttributes() {
    return this.shouldUpdateLineItemCustomAttrs || this.shouldSendDeliveryScheduleNotification;
  }

  async completeLineItemCustomAttrs() {
    const skusByLineItemId = Object.fromEntries(
      this.savedLineItemCustomAttrs
        .filter(({ [this.SKUS]: skus }) => skus.length > 0)
        .map(({ id, [this.SKUS]: skus }) => [id, JSON.stringify(skus)]),
    );

    this._completedLineItemCustomAttrs = await Promise.all(
      this.lineItems.map(async ({ id, name, properties, variant_id }) => {
        let skus: string | undefined | null =
          skusByLineItemId[id] ?? properties.find((p) => p.name === this.SKUS)?.value;
        if (!skus || skus === EMPTY_ARRAY) skus = (await this.db.getVariant(variant_id))?.skusJSON;

        return { id, name, [this.SKUS]: JSON.parse(skus || EMPTY_ARRAY) };
      }),
    );
  }

  async completeDeliveryScheduleCustomAttrs() {
    if (this.hasValidSavedDeliverySchedule) {
      this._completedDeliveryScheduleCustomAttrs = this.savedDeliveryScheduleCustomAttrs;
      return;
    }
    // SKU情報が一つでも不足していたら、配送日時は未確定とする
    if (!this.isCompletedSku) {
      this._completedDeliveryScheduleCustomAttrs = { estimate: "" };
      return;
    }
    // unmanaged_itemのようなスケージュール計算がいらないものはscheduleがnullになる
    const schedule = await getDeliverySchedule(this.completedLineItemCustomAttrs, this.db);
    this._completedDeliveryScheduleCustomAttrs = { estimate: schedule ?? "" };
  }

  async updateNoteAttributes() {
    const newNoteAttributes = [];
    if (this.shouldSendDeliveryScheduleNotification)
      newNoteAttributes.push({
        name: this.DELIVERY_SCHEDULE,
        value: JSON.stringify(this.completedDeliveryScheduleCustomAttrs),
      });
    if (this.shouldUpdateLineItemCustomAttrs)
      newNoteAttributes.push({
        name: this.LINE_ITEMS,
        value: JSON.stringify(this.completedLineItemCustomAttrs),
      });

    const merged = new Map(
      this.noteAttributes.concat(newNoteAttributes).map(({ name, value }) => [name, value]),
    );

    return fetch(
      `https://survaq.myshopify.com/admin/api/${this.API_VERSION}/orders/${this.numericId}.json`,
      {
        method: "PUT",
        body: JSON.stringify({
          order: {
            id: String(this.numericId),
            note_attributes: Array.from(merged, ([name, value]) => ({
              name,
              value,
            })),
          },
        }),
        headers: this.headers,
      },
    );
  }
}

type LineItemCustomAttr = {
  id: number;
  name: string;
  _skus: string[];
};

const eqLineItemCustomAttrs = (
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

type DeliveryScheduleCustomAttrs = {
  estimate: string;
};

export const getDeliverySchedule = async (
  data: LineItemCustomAttr[],
  client: DB,
): Promise<string | null> => {
  const codes = [...new Set(data.flatMap(({ _skus }) => _skus))];
  const skus = await client.getDeliverySchedulesBySkuCodes(codes);
  const schedules = skus.map((sku) =>
    makeSchedule(sku.currentInventoryOrderSKU?.ShopifyInventoryOrders.deliverySchedule ?? null),
  );

  // skusがスケジュール計算対象外ものだけで構成されている場合は、スケジュール未確定とする
  if (schedules.length < 1) return null;

  // schedulesが過去日だけで構成されていると、latest()が過去日を返してしまうためmakeSchedule(null)を混ぜて抑制
  const estimate = latest([...schedules, makeSchedule(null)]);

  // latestに1つ以上の要素で構成される配列を渡しているので、estimateがnullになることは無いはずだが、一応ケアしておく
  if (!estimate) return null;

  return `${estimate.year}-${estimate.month}-${estimate.term}`;
};
