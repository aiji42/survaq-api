import { DB } from "../../db";
import { BigQuery } from "cfw-bq";
import { SlackNotifier } from "../../slack";
import { SlackEdgeAppEnv } from "slack-edge/dist/app-env";
import { makeSchedule } from "../../makeSchedule";

type SKU = {
  code: string;
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

export class Inventory {
  constructor(protected sku: SKU) {}

  get code() {
    return this.sku.code;
  }

  get availableInventories() {
    // FIXME: リアルタイムで在庫を差し押さえるのであればbufferの概念はいらなくなる？(なくならなくても数の変更はあるはず)
    const buffer = this.sku.stockBuffer ?? 0;

    return [
      // MEMO: 計算上実在庫を仮想の発注データとして扱う
      {
        id: null,
        limit:
          this.sku.inventory -
          Math.max(buffer, Math.ceil(this.sku.inventory * this.sku.faultyRate)),
        deliverySchedule: null,
      },
      ...this.sku.inventoryOrderSKUs.map(
        ({ id, quantity, ShopifyInventoryOrders: { deliverySchedule } }) => ({
          id,
          limit: quantity - Math.ceil(quantity * this.sku.faultyRate),
          deliverySchedule,
        }),
      ),
    ] as const;
  }

  protected holdInventories(waitingQty: number) {
    const list = this.availableInventories.reduce<
      {
        id: number | null;
        heldQuantity: number;
        isFull: boolean;
        deliverySchedule: null | string;
      }[]
    >((acc, { id, limit, deliverySchedule }) => {
      const allocatedQty = acc.reduce((sum, { heldQuantity }) => sum + heldQuantity, 0);
      const unAllocatedQty = waitingQty - allocatedQty;
      const heldQuantity = Math.min(unAllocatedQty, limit);
      return [
        ...acc,
        {
          id,
          heldQuantity,
          isFull: heldQuantity >= limit,
          deliverySchedule,
        },
      ];
    }, []);

    return list as [
      { id: null; heldQuantity: number; isFull: boolean; deliverySchedule: null },
      ...{ id: number; heldQuantity: number; isFull: boolean; deliverySchedule: string | null }[],
    ];
  }

  availableInventoryOrderSKU(waitingQty: number) {
    return this.holdInventories(waitingQty).find(({ isFull }) => !isFull);
  }
}

export class InventoryOperator extends Inventory {
  private slack: SlackNotifier;
  constructor(
    sku: SKU,
    private waitingShipmentQuantity: number,
    env: SlackEdgeAppEnv,
  ) {
    super(sku);
    this.slack = new SlackNotifier(env);
  }

  async update(db: DB) {
    const held = this.holdInventories(this.waitingShipmentQuantity);
    let availableInventoryOrderSKU = this.availableInventoryOrderSKU(this.waitingShipmentQuantity);

    // 販売枠がこれ以上ない旨をアラートとして通知
    if (!availableInventoryOrderSKU) await this.notifyAlertForFullInventoryOrderSKU();

    // 販売枠を変更する旨を通知
    if (
      availableInventoryOrderSKU &&
      this.sku.currentInventoryOrderSKUId !== availableInventoryOrderSKU.id
    )
      await this.notifyForChangeCurrentInventoryOrderSKUId(availableInventoryOrderSKU.id);

    const [, ...inventoryOrderSKUs] = held;

    // TODO: テストが終わったらコメントアウトを外す
    return {
      where: { code: this.code },
      data: {
        currentInventoryOrderSKUId: availableInventoryOrderSKU?.id,
        unshippedOrderCount: this.waitingShipmentQuantity,
        inventoryOrderSKUs: {
          update: inventoryOrderSKUs.map(({ id, heldQuantity }) => ({
            where: { id },
            data: { heldQuantity },
          })),
        },
      },
    };
    // await db.prisma.shopifyCustomSKUs.update({
    //   where: { code: this.code },
    //   data: {
    //     currentInventoryOrderSKUId: availableInventoryOrderSKU?.id,
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

  // FIXME: 一旦テストのためにチャンネルはデフォルトにしておく(最終的にはSLACK_CHANNEL.INFOにする)
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

  // FIXME: 一旦テストのためにチャンネルはデフォルトにしておく(最終的にはSLACK_CHANNEL.ALERTにする)
  private async notifyAlertForFullInventoryOrderSKU() {
    this.slack.append({
      title: this.code,
      color: "danger",
      text: "発注データが不足しており、販売可能枠のシフトができません。すべての入荷待ち件数が差し押さえられています。",
    });

    await this.slack.notify("SKUの販売枠を変更できませんでした");
  }

  // SKUの取得+BQへのクエリ => CMSのアップデートという処理の流れになるので、インスタンス内で完結させるとトランザクションが長くなってしまう。
  // なので、「SKUの取得」と「BQへのクエリ」はstaticにして、利用側でBQへのクエリをトランザクション外で実行してもらう
  static async fetchSku(db: DB, code: string) {
    return db.prisma.shopifyCustomSKUs.findUniqueOrThrow({
      where: { code },
      select: {
        code: true,
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

  static async fetchWaitingShipmentQuantity(bq: BigQuery, code: string) {
    // 未キャンセル・未クローズ・未フルフィル・注文より180日以内のSKUを未出荷として件数を取得
    const query = `
        SELECT SUM(quantity) as quantity
        FROM \`shopify.order_skus\`
        WHERE canceled_at IS NULL
          AND closed_at IS NULL
          AND fulfilled_at IS NULL
          AND DATE_DIFF(CURRENT_TIMESTAMP(), ordered_at, DAY) < 180
          AND code = '${code}'
        GROUP BY code
    `;
    const [res] = await bq.query<{ quantity: number }>(query);

    return res?.quantity ?? 0;
  }
}
