import { html } from "lit";
import { Task } from "@lit/task";
import { customElement, property, state } from "lit/decorators.js";
import { BaseLitElement } from "./BaseLitElement";
import { CancellationRoute } from "../routes/_apis/cancellation";
import { hc } from "hono/client";

const initialFormState = {
  reason: { isValid: true, error: "" },
  submitting: false,
  requested: false,
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
          if (["Closed", "Canceled", "AlreadyRequested"].includes(status.reason)) {
            return html`<div class="border rounded-md w-full p-4 text-gray-800 leading-loose my-3">
              <div class="text-lg">
                ${status.reason === "AlreadyRequested"
                  ? "キャンセル対応中です。しばらくお待ちください。"
                  : "こちらの注文はキャンセルされました。"}
              </div>
            </div>`;
          }
          // Working, Pending, Shipped
          return html``;
        }
        return html`<div class="border rounded-md w-full p-4 text-gray-800 leading-loose my-3">
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
                    aria-invalid=${this.formState.reason.isValid ? "false" : "true"}
                    ?disabled=${this.submitting || this.requested}
                    aria-describedby="reason-error"
                  ></textarea>
                  <div class="text-red-600 text-sm text-center" id="reason-error">
                    ${this.formState.reason.error}
                  </div>
                </div>
              </fieldset>
              <div class="flex flex-col gap-1">
                <button
                  class=${"mx-auto py-2 px-4 text-lg block rounded-md text-white disabled:cursor-not-allowed " +
                  (this.requested
                    ? "bg-transparent border border-rose-700 text-rose-700"
                    : "bg-rose-700 text-white ") +
                  (this.submitting ? "animate-pulse " : "")}
                  type="submit"
                  ?disabled=${this.submitting || this.requested}
                >
                  ${this.submitting
                    ? "キャンセルリクエスト送信中"
                    : this.requested
                      ? "キャンセルリクエスト送信済"
                      : "注文をキャンセルする"}
                </button>
                <div class="text-red-600 text-sm text-center" id="form-error">
                  ${this.formState.error}
                </div>
              </div>
            </form>
          </details>
        </div>`;
      },
    });
  }

  private onChanceReason() {
    this.formState.reason.isValid = true;
    this.formState.reason.error = "";
    this.requestUpdate();
  }

  private async submit(e: Event) {
    e.preventDefault();
    this.resetFormState();

    const form = e.target as HTMLFormElement;
    const values = this.validate(form);

    if (this.isValid) await this.postCancelRequest(values);
  }

  private validate(form: HTMLFormElement) {
    const reason = form.elements.namedItem("reason") as HTMLTextAreaElement;
    if (reason.value.trim().length < 20) {
      this.formState.reason.isValid = false;
      this.formState.reason.error = "20文字以上で入力してください。";
    } else if (reason.value.trim().length > 200) {
      this.formState.reason.isValid = false;
      this.formState.reason.error = "200文字以内で入力してください。";
    }
    this.requestUpdate();

    return { reason: reason.value };
  }

  private get isValid() {
    return this.formState.reason.isValid;
  }

  private async postCancelRequest({ reason }: { reason: string }) {
    this.submitting = true;
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // たまにエラー発生させる
      if (Math.random() > 0.5) throw new Error("");
      this.formState.requested = true;
    } catch (e) {
      this.formState.error = "エラーが発生しました。";
    } finally {
      this.submitting = false;
    }

    this.requestUpdate();
  }

  private resetFormState() {
    this.formState = Object.assign({}, initialFormState);
    this.requestUpdate();
  }

  private set submitting(value: boolean) {
    this.formState.submitting = value;
    this.requestUpdate();
  }

  private get submitting() {
    return this.formState.submitting;
  }

  private get requested() {
    return this.formState.requested;
  }
}
