import { LitElement, html } from "lit";
import { Task } from "@lit/task";
import { customElement, property } from "lit/decorators.js";
import { hc } from "hono/client";
import { deliveryRoute } from "../routes/_apis/products";

// TODO: 本番と開発と分けたい
const client = hc<typeof deliveryRoute>("http://localhost:8787/products/");

@customElement("survaq-delivery-schedule")
class SurvaqDeliverySchedule extends LitElement {
  @property() productId?: string;
  @property({ type: Boolean }) delayedOnly: boolean = false;
  @property({ type: Boolean }) hideWhenNoDelay: boolean = false;

  private _productTask = new Task(this, {
    task: async ([productId, delayedOnly]) => {
      if (!productId) throw new Error("productIdを指定してください。");

      const response = await client[":id"].delivery.$get({
        param: {
          id: productId,
        },
        query: {
          filter: String(delayedOnly),
        },
      });

      if (response.status === 404) {
        throw new Error("商品が存在しません。");
      }
      if (!response.ok) {
        throw new Error(
          `想定しないエラーが発生しました。status: ${response.status}`,
        );
      }
      return response.json();
    },
    args: () => [this.productId, this.delayedOnly] as const,
  });

  render() {
    return this._productTask.render({
      pending: () => html``,
      complete: (product) => {
        const hasDelayed = product.skus.some(({ delaying }) => delaying);
        return html`<div class="schedule_wrapper__NN_1_">
          ${hasDelayed &&
          html`
            <p class="schedule_message___KURN">
              <span>下記商品につきましては、</span>
              <span>${product.current.text}発送分の在庫が完売のため</span>
              <span>発送時期が異なります。</span>
            </p>
          `}
          <table class="schedule_table__4bbMs">
            <thead></thead>
            <tbody>
              ${product.skus.map(
                (sku) =>
                  html`<tr>
                    <th class="schedule_rowHead__IE4_6">
                      <span>${sku.name}</span>
                    </th>
                    <td>
                      <p class="schedule_icon__XmjaK">
                        ${!sku.delaying ? "◎" : "△"}
                      </p>
                      <span class="schedule_schedule__zcyxT">
                        ${sku.schedule.text}発送予定
                      </span>
                    </td>
                  </tr>`,
              )}
            </tbody>
          </table>
          <p class="schedule_annotation__77p3p">
            ◎：在庫あり｜△：残りわずか｜×：完売
          </p>
        </div>`;
      },
      error: (e) => html`<p>${e}</p>`,
    });
  }
}
