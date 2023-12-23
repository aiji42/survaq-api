import { html } from "lit";
import { Task } from "@lit/task";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { hc } from "hono/client";
import { deliveryRoute } from "../routes/_apis/products";
import { BaseLitElement } from "./BaseLitElement";

// TODO: 本番と開発と分けたい
const client = hc<typeof deliveryRoute>("https://api.survaq.com/products/");

@customElement("survaq-delivery-schedule")
class SurvaqDeliverySchedule extends BaseLitElement {
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
        if (this.hideWhenNoDelay && !hasDelayed) return null;
        return html`<div class="pb-4">
          ${hasDelayed
            ? html`
                <p
                  class="text-slate-700 text-center text-sm font-bold block p-1 my-1 mx-0 border-y-4 border-double border-gray-400"
                >
                  <span class="inline-block">下記商品につきましては、</span>
                  <span class="inline-block">
                    ${product.current.text.slice(5)}発送分の在庫が完売のため
                  </span>
                  <span class="inline-block">発送時期が異なります。</span>
                </p>
              `
            : null}
          <table class="w-full">
            <thead></thead>
            <tbody>
              ${product.skus.map(
                (sku, index) =>
                  html`<tr>
                    <th
                      class="bg-neutral-400 p-2 text-white text-xs border-y border-white min-w-38 sm:w-52 w-40"
                    >
                      <span>${unsafeHTML(sku.name)}</span>
                    </th>
                    <td
                      class="p-1 text-center font-bold text-slate-700 border-y border-neutral-400 pt-1 pb-2"
                    >
                      <p class="text-2xl text-red-500 m-0">
                        ${!sku.delaying ? "◎" : "△"}
                      </p>
                      <p class="text-xs leading-none">
                        ${sku.schedule.text.slice(5)}発送予定
                      </p>
                    </td>
                  </tr>`,
              )}
            </tbody>
          </table>
          ${product.skus.length > 0
            ? html`<p class="my-1 text-center text-xs text-slate-700">
                ◎：在庫あり｜△：残りわずか｜×：完売
              </p>`
            : null}
        </div>`;
      },
      error: (e) => html`<p>${e}</p>`,
    });
  }
}
