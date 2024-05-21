import { DB } from "../../db";
import { latest, makeSchedule } from "../../makeSchedule";
import { DeliveryScheduleAttrs, LineItemAttr, ShopifyOrder } from "./ShopifyOrder";

export class ShopifyOrderForNoteAttrs extends ShopifyOrder {
  private readonly db: DB;
  private _completedLineItem: LineItemAttr[] | undefined;
  private _completedDeliverySchedule: DeliveryScheduleAttrs | undefined;

  constructor(env: { SHOPIFY_ACCESS_TOKEN: string; DATABASE_URL: string }) {
    super(env);
    this.db = new DB(env);
  }

  get completedLineItem() {
    if (!this._completedLineItem) throw new Error("Execute completeLineItem() before");
    return this._completedLineItem;
  }

  get completedDeliverySchedule() {
    if (!this._completedDeliverySchedule)
      throw new Error("Execute completeDeliverySchedule() before");

    return this._completedDeliverySchedule;
  }

  get isCompletedSku() {
    return this.completedLineItem.every(({ _skus }) => _skus.length > 0);
  }

  get shouldUpdateLineItemAttrs() {
    // この日以前の古いデータは更新しない
    const THRESHOLD_DATE = new Date("2024-01-01T00:00:00");
    return (
      this.createdAt > THRESHOLD_DATE &&
      !isEqualLineItemAttrs(this.completedLineItem, this.savedLineItemAttrs)
    );
  }

  get shouldSendDeliveryScheduleNotification() {
    // 下記をすべて満たしているときに通知を送る
    // - まだnote_attributesにはスケージュールが保存されていない(まだ一度も通知が送られていない)
    // - 補完されたスケージュール情報が存在する(存在しないということはCMSにデータがないか、時期を計算しなくていい商品)
    // - まだ発送されていない
    // - キャンセルされていない
    // - クローズされていない
    // - 30日以内の注文
    return (
      !this.hasValidSavedDeliveryScheduleAttrs &&
      !!this.completedDeliverySchedule.estimate &&
      !this.fulfillmentStatus &&
      !this.cancelledAt &&
      !this.closedAt &&
      this.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
  }

  get shouldUpdateNoteAttributes() {
    return this.shouldUpdateLineItemAttrs || this.shouldSendDeliveryScheduleNotification;
  }

  async completeLineItem() {
    const skusByLineItemId = Object.fromEntries(
      this.savedLineItemAttrs
        .filter(({ [this.SKUS]: skus }) => skus.length > 0)
        .map(({ id, [this.SKUS]: skus }) => [id, JSON.stringify(skus)]),
    );

    this._completedLineItem = await Promise.all(
      this.lineItems.map(async ({ id, name, properties, variant_id }) => {
        let skus: string | undefined | null =
          skusByLineItemId[id] ?? properties.find((p) => p.name === this.SKUS)?.value;
        if (!skus || skus === this.EMPTY_ARRAY)
          skus = (await this.db.getVariant(variant_id))?.skusJSON;

        return { id, name, [this.SKUS]: JSON.parse(skus || this.EMPTY_ARRAY) };
      }),
    );
  }

  async completeDeliverySchedule() {
    if (this.hasValidSavedDeliveryScheduleAttrs) {
      this._completedDeliverySchedule = this.validSavedDeliveryScheduleAttrs;
      return;
    }
    // SKU情報が一つでも不足していたら、配送日時は未確定とする
    if (!this.isCompletedSku) {
      this._completedDeliverySchedule = { estimate: "" };
      return;
    }
    // unmanaged_itemのようなスケージュール計算がいらないものはscheduleがnullになる
    const schedule = await getDeliverySchedule(this.completedLineItem, this.db);
    this._completedDeliverySchedule = { estimate: schedule ?? "" };
  }

  async updateNoteAttributes() {
    const newNoteAttributes = [];
    if (this.shouldSendDeliveryScheduleNotification)
      newNoteAttributes.push({
        name: this.DELIVERY_SCHEDULE,
        value: JSON.stringify(this.completedDeliverySchedule),
      });
    if (this.shouldUpdateLineItemAttrs)
      newNoteAttributes.push({
        name: this.LINE_ITEMS,
        value: JSON.stringify(this.completedLineItem),
      });

    return super.updateNoteAttributes(newNoteAttributes);
  }
}

const isEqualLineItemAttrs = (dataA: LineItemAttr[], dataB: LineItemAttr[]): boolean => {
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

const getDeliverySchedule = async (data: LineItemAttr[], client: DB): Promise<string | null> => {
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
