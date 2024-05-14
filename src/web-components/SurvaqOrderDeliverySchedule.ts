import { html } from "lit";
import { Task } from "@lit/task";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { BaseLitElement } from "./BaseLitElement";
import { ScheduleRoute } from "../routes/_apis/schedule";
import { hc } from "hono/client";

@customElement("survaq-delivery-schedule-order")
class SurvaqDeliverySchedule extends BaseLitElement {
  @property({ type: Number }) orderId?: number;

  private _orderDeliveryScheduleTask = new Task(this, {
    task: async ([orderId], { signal }) => {
      if (!orderId) throw new Error("orderIdを指定してください。");
      const baseUrl = new URL("https://api.survaq.com/schedule/");
      if (import.meta.env.DEV) {
        baseUrl.protocol = "http:";
        baseUrl.hostname = "localhost";
        baseUrl.port = "8787";
      }

      const client = hc<ScheduleRoute>(baseUrl.toString(), { init: { signal } });
      const res = await client[":id"].$get({ param: { id: String(orderId) } });

      if (res.status === 404) return null;
      return res.json();
    },
    args: () => [this.orderId] as const,
  });

  render() {
    return this._orderDeliveryScheduleTask.render({
      pending: () => html``,
      error: () => html``,
      complete: (schedule) => {
        // TODO: English
        if (!schedule) return html``;
        return html`<div class="border rounded-md w-full p-4 text-gray-800 leading-loose my-3">
          <div class="text-lg">発送予定日</div>
          <div>${schedule.text}(${schedule.subText})</div>
          <div class="text-xs text-gray-700">
            商品の発送が完了いたしましたら、配送業者の追跡番号をメールでご連絡差し上げます。
          </div>
          <div class="text-xs text-gray-700">
            予定日は生産状況、海運状況、通関状況等により前後する可能性がございます。予めご了承くださいませ。
          </div>
        </div>`;
      },
    });
  }
}
