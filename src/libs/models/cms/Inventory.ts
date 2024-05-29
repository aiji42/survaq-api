import { DB } from "../../db";
import { BigQuery } from "cfw-bq";
import { SlackNotifier } from "../../slack";
import { SlackEdgeAppEnv } from "slack-edge/dist/app-env";
import { makeSchedule } from "../../makeSchedule";

type SKU = {
  inventory: number;
  stockBuffer: number | null;
  faultyRate: number;
  unshippedOrderCount: number;
  currentInventoryOrderSKUId: number | null;
  inventoryOrderSKUs: {
    id: number;
    quantity: number;
    heldQuantity: number;
    ShopifyInventoryOrders: {
      name: string;
      deliverySchedule: string | null;
    };
  }[];
};

// TODO: BQのprojectIdとかSlackのチャンネルとか共通の固定値にしておきたい
export class Inventory {
  private bq: BigQuery;
  private _sku: undefined | SKU;
  private _waitingShipmentQuantity: number | undefined;
  private slack: SlackNotifier;
  constructor(
    private db: DB,
    private code: string,
    env: { GCP_SERVICE_ACCOUNT: string } & SlackEdgeAppEnv,
  ) {
    this.bq = new BigQuery(JSON.parse(env.GCP_SERVICE_ACCOUNT), "shopify-322306");
    this.slack = new SlackNotifier(env);
  }

  async prepare() {
    this._sku = await this.getSku();
    this._waitingShipmentQuantity = await this.getWaitingShipmentQuantity();
  }

  get sku() {
    if (!this._sku) throw new Error("Sku not prepared");
    return this._sku;
  }

  get waitingShipmentQuantity() {
    if (this._waitingShipmentQuantity === undefined)
      throw new Error("waitingShipmentQuantity not prepared");
    return this._waitingShipmentQuantity;
  }

  async update() {
    const held = this.hold();
    let availableInventoryOrderSKU = held.find(({ isFull }) => !isFull);
    if (!availableInventoryOrderSKU) {
      await this.notifyAlertForFullInventoryOrderSKU();
      availableInventoryOrderSKU = held.at(-1)!;
    }

    // 販売枠を変更する旨を通知
    if (this.sku.currentInventoryOrderSKUId !== availableInventoryOrderSKU.id)
      await this.notifyForChangeCurrentInventoryOrderSKUId(availableInventoryOrderSKU.id);

    const [, ...inventoryOrderSKUs] = held;

    // TODO: テストが終わったらコメントアウトを外す
    return {
      where: { code: this.code },
      data: {
        currentInventoryOrderSKUId: availableInventoryOrderSKU.id,
        unshippedOrderCount: this.waitingShipmentQuantity,
        inventoryOrderSKUs: {
          update: inventoryOrderSKUs.map(({ id, heldQuantity }) => ({
            where: { id },
            data: { heldQuantity },
          })),
        },
      },
    };
    // await this.db.prisma.shopifyCustomSKUs.update({
    //   where: { code: this.code },
    //   data: {
    //     currentInventoryOrderSKUId: availableInventoryOrderSKU.id,
    //     unshippedOrderCount: this.waitingShipmentQuantity,
    //     inventoryOrderSKUs: {
    //       update: inventoryOrderSKUs.map(({ id, heldQuantity }) => ({
    //         where: { id },
    //         data: { heldQuantity },
    //       })),
    //     },
    //   },
    // });
  }

  // FIXME: 一旦テストのためにチャンネルはデフォルトにしておく(最終的には"#notify-cms-info"にする)
  private async notifyForChangeCurrentInventoryOrderSKUId(
    newCurrentInventoryOrderSKUId: null | number,
  ) {
    if (newCurrentInventoryOrderSKUId === null) {
      this.slack.append({
        title: this.code,
        color: "good",
        fields: [{ title: "新しい販売枠", value: "実在庫" }],
      });
    } else {
      const inventoryOrderSKU = this.sku.inventoryOrderSKUs.find(
        ({ id }) => id === newCurrentInventoryOrderSKUId,
      )!;
      const schedule = makeSchedule(inventoryOrderSKU.ShopifyInventoryOrders.deliverySchedule);
      this.slack.append({
        title: this.code,
        color: "good",
        fields: [
          { title: "発注名", value: inventoryOrderSKU.ShopifyInventoryOrders.name },
          { title: "入荷数", value: inventoryOrderSKU.quantity.toString() },
          { title: "配送予定", value: schedule.text },
        ],
      });
    }

    await this.slack.notify("SKUの販売枠を変更しました");
  }

  // FIXME: 一旦テストのためにチャンネルはデフォルトにしておく(最終的には"#notify-cms"にする)
  private async notifyAlertForFullInventoryOrderSKU() {
    this.slack.append({
      title: this.code,
      color: "danger",
      text: "発注データが不足しており、販売可能枠のシフトができません。すべての入荷待ち件数が差し押さえられています。",
    });

    await this.slack.notify("SKUの販売枠を変更できませんでした");
  }

  private hold() {
    // FIXME: リアルタイムで在庫を差し押さえるのであればbufferの概念はいらなくなる？(なくならなくても数の変更はあるはず)
    const buffer = this.sku.stockBuffer ?? 0;

    // 現在の出荷待ち件数を、実在庫 > 発注1 > 発注2 ... の順番に差押件数として振っていく
    const list = [
      // MEMO: 計算上実在庫を仮想の発注データとして扱う
      {
        id: null,
        limit:
          this.sku.inventory -
          Math.max(buffer, Math.ceil(this.sku.inventory * this.sku.faultyRate)),
      },
      ...this.sku.inventoryOrderSKUs.map(({ id, quantity }) => ({
        id,
        limit: quantity - Math.ceil(quantity * this.sku.faultyRate),
      })),
    ].reduce<{ id: number | null; heldQuantity: number; isFull: boolean }[]>(
      (acc, { id, limit }) => {
        const allocatedQty = acc.reduce((sum, { heldQuantity }) => sum + heldQuantity, 0);
        const unAllocatedQty = this.waitingShipmentQuantity - allocatedQty;
        const heldQuantity = Math.min(unAllocatedQty, limit);
        return [
          ...acc,
          {
            id,
            heldQuantity,
            isFull: heldQuantity >= limit,
          },
        ];
      },
      [],
    );

    return list as [
      { id: null; heldQuantity: number; isFull: boolean },
      ...{ id: number; heldQuantity: number; isFull: boolean }[],
    ];
  }

  private async getSku() {
    return this.db.prisma.shopifyCustomSKUs.findUniqueOrThrow({
      where: { code: this.code },
      select: {
        inventory: true,
        stockBuffer: true,
        faultyRate: true,
        unshippedOrderCount: true,
        currentInventoryOrderSKUId: true,
        inventoryOrderSKUs: {
          select: {
            id: true,
            quantity: true,
            heldQuantity: true,
            ShopifyInventoryOrders: {
              select: {
                name: true,
                deliverySchedule: true,
              },
            },
          },
          where: {
            ShopifyInventoryOrders: {
              status: { in: ["waitingShipping", "waitingReceiving"] },
            },
          },
          orderBy: [
            {
              ShopifyInventoryOrders: {
                deliveryDate: "asc",
              },
            },
            {
              ShopifyInventoryOrders: {
                id: "asc",
              },
            },
          ],
        },
      },
    });
  }

  private async getWaitingShipmentQuantity() {
    // 未キャンセル・未クローズ・未フルフィル・注文より180日以内のSKUを未出荷として件数を取得
    const query = `
        SELECT SUM(quantity) as quantity
        FROM \`shopify.order_skus\`
        WHERE canceled_at IS NULL
          AND closed_at IS NULL
          AND fulfilled_at IS NULL
          AND DATE_DIFF(CURRENT_TIMESTAMP(), ordered_at, DAY) < 180
          AND code = '${this.code}'
        GROUP BY code
    `;
    const [res] = await this.bq.query<{ quantity: number }>(query);

    return res?.quantity ?? 0;
  }
}
