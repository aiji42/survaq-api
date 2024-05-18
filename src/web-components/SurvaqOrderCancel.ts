import { html } from "lit";
import { Task } from "@lit/task";
import { customElement, property, state, queryAssignedNodes } from "lit/decorators.js";
import { BaseLitElement } from "./BaseLitElement";
import { CancellationRoute } from "../routes/_apis/cancellation";
import { hc } from "hono/client";

const initialFormState = {
  submitting: false,
  completed: false,
  error: "",
};

@customElement("survaq-order-cancel")
class SurvaqOrderCancel extends BaseLitElement {
  @property({ type: Number }) orderId?: number;
  @state() private formState = Object.assign({}, initialFormState);

  private _orderDeliveryScheduleTask = new Task(this, {
    task: async ([orderId], { signal }) => {
      if (!orderId) throw new Error("orderIdを指定してください。");
      const baseUrl = new URL("https://api.survaq.com/cancellation/");
      if (import.meta.env.DEV) {
        baseUrl.protocol = "http:";
        baseUrl.hostname = "localhost";
        baseUrl.port = "8787";
      }

      const client = hc<CancellationRoute>(baseUrl.toString(), { init: { signal } });
      const res = await client.cancelable[":id"].$get({ param: { id: String(orderId) } });

      if (res.status === 404) return null;
      return res.json();
    },
    args: () => [this.orderId] as const,
  });

  render() {
    return this._orderDeliveryScheduleTask.render({
      pending: () => html``,
      error: () => html``,
      complete: (status) => {
        // TODO: English
        if (!status) return html``;
        if (!status.isCancelable) {
          if (status.reason === "Closed") {
            return html`<div class="text-lg w-full text-gray-800 leading-loose">
              この注文はクローズされました。
            </div>`;
          }
          if (status.reason === "Canceled") {
            return html`<div class="text-lg w-full text-gray-800 leading-loose">
              この注文はキャンセルされました。
            </div>`;
          }
          if (status.reason === "AlreadyRequested") {
            return html`<div class="text-lg w-full text-gray-800 leading-loose">
              キャンセル対応中です。しばらくお待ちください。
            </div>`;
          }
          if (["Working", "Shipped"].includes(status.reason)) {
            return html`<div class="text-lg w-full text-gray-800 leading-loose">
              出荷作業中あるいは出荷済みのため、キャンセルできません。
            </div>`;
          }
          // Shipped
          return html``;
        }
        return html`<div class="w-full text-gray-800 leading-loose">
          <details class="[&_svg]:open:-rotate-180">
            <summary class="text-lg cursor-pointer flex justify-between items-center">
              キャンセルについて
              <div>
                <svg
                  class="rotate-0 transform text-vela-cyan"
                  fill="none"
                  height="20"
                  width="20"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </summary>
            <div>ここに色々注意を書くよ</div>
            <form
              class="flex gap-4 flex-col m-0"
              @submit=${this.submit}
              aria-describedby="form-error"
            >
              <fieldset>
                <legend>
                  キャンセル理由
                  <span class="text-sm text-gray-700">(20文字以上で入力してください)</span>
                </legend>
                <div class="flex flex-col gap-1">
                  <textarea
                    name="reason"
                    class="w-full border border-gray-300 rounded-md px-2 leading-normal"
                    rows="10"
                    @input=${this.onChanceReason}
                    ?disabled=${this.submitting || this.completed}
                  ></textarea>
                </div>
              </fieldset>
              <div class="flex flex-col gap-1">
                <button
                  ?disabled=${this.submitting || this.completed}
                  class=${"mx-auto py-2 px-4 text-lg block rounded-md disabled:cursor-not-allowed " +
                  (this.completed
                    ? "bg-transparent border border-rose-700 text-rose-700 "
                    : "bg-rose-700 text-white ") +
                  (this.submitting ? "animate-pulse " : "")}
                  type="submit"
                >
                  ${this.submitting
                    ? "キャンセル申請中"
                    : this.completed
                      ? "キャンセル申請済"
                      : "注文をキャンセルする"}
                </button>
                <div class="text-red-600 text-sm text-center" id="form-error">${this.error}</div>
              </div>
            </form>
          </details>
        </div>`;
      },
    });
  }

  private onChanceReason(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    target.setCustomValidity("");
    target.reportValidity();
  }

  private async submit(e: Event) {
    e.preventDefault();
    this.error = "";

    const form = e.target as HTMLFormElement;
    this.validate(form);

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries()) as { reason: string };

    if (form.checkValidity()) await this.postCancelRequest(data);
  }

  private validate(form: HTMLFormElement) {
    const reason = form.elements.namedItem("reason") as HTMLTextAreaElement;
    // スペース(全角を含む)や改行などを除いて文字数をカウント
    const length = reason.value.replace(/\s/g, "").length;
    if (length < 20) {
      reason.setCustomValidity("20文字以上で入力してください。");
    } else if (reason.value.trim().length > 200) {
      reason.setCustomValidity("200文字以内で入力してください。");
    } else {
      reason.setCustomValidity("");
    }
    reason.reportValidity();
  }

  private async postCancelRequest({ reason }: { reason: string }) {
    this.submitting = true;

    try {
      const baseUrl = new URL("https://api.survaq.com/cancellation/");
      if (import.meta.env.DEV) {
        baseUrl.protocol = "http:";
        baseUrl.hostname = "localhost";
        baseUrl.port = "8787";
      }
      const client = hc<CancellationRoute>(baseUrl.toString());
      if (!this.orderId) throw new Error("orderIdを指定してください。");
      await client.cancel.$post({ json: { id: String(this.orderId), reason } });

      this.completed = true;
    } catch (e) {
      this.error = "エラーが発生しました。";
    }

    this.submitting = false;
  }

  private set submitting(value: boolean) {
    this.formState.submitting = value;
    this.requestUpdate();
  }

  private get submitting() {
    return this.formState.submitting;
  }

  private set completed(value: boolean) {
    this.formState.completed = value;
    this.requestUpdate();
  }

  private get completed() {
    return this.formState.completed;
  }

  private set error(value: string) {
    this.formState.error = value;
    this.requestUpdate();
  }

  private get error() {
    return this.formState.error;
  }
}
