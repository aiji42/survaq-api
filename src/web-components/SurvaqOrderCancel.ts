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

const REASON_MAX_LENGTH = 200;
const REASON_MIN_LENGTH = 20;

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
        if (!status) return html``;
        if (!status.isCancelable) {
          if (status.reason === "Closed") {
            return html`<div class="text-lg w-full text-gray-800 leading-loose">
              ${messages.closed[this.lang]}
            </div>`;
          }
          if (status.reason === "Canceled") {
            return html`<div class="text-lg w-full text-gray-800 leading-loose">
              ${messages.cancelled[this.lang]}
            </div>`;
          }
          if (status.reason === "AlreadyRequested") {
            return html`<div class="text-lg w-full text-gray-800 leading-loose">
              ${messages.cancelProcessing[this.lang]}
            </div>`;
          }
          if (["Working", "Shipped"].includes(status.reason)) {
            return html`<div class="text-lg w-full text-gray-800 leading-loose">
              ${messages.working[this.lang]}
            </div>`;
          }
          // Pending
          return html``;
        }
        return html`<div class="w-full text-gray-800 leading-loose">
          <details class="[&_svg]:open:-rotate-180">
            <summary class="text-lg cursor-pointer flex justify-between items-center">
              ${messages.title[this.lang]}
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
                  ${messages.reason[this.lang]}
                  <span class="text-sm text-gray-700"
                    >(${messages.validate.reason[this.lang](REASON_MIN_LENGTH)})</span
                  >
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
                    ? messages.button.submitting[this.lang]
                    : this.completed
                      ? messages.button.completed[this.lang]
                      : messages.button.submit[this.lang]}
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
    if (length < REASON_MIN_LENGTH) {
      reason.setCustomValidity(messages.validate.reason[this.lang](REASON_MIN_LENGTH));
    } else if (reason.value.trim().length > REASON_MAX_LENGTH) {
      reason.setCustomValidity(messages.validate.maxLength[this.lang](REASON_MAX_LENGTH));
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
      this.error = messages.unknownError[this.lang];
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

  get lang() {
    return document.documentElement.lang === "ja" ? "ja" : "en";
  }
}

const messages = {
  closed: {
    ja: "この注文はクローズされました。",
    en: "This order has been closed.",
  },
  cancelled: {
    ja: "この注文はキャンセルされました。",
    en: "This order has been cancelled.",
  },
  cancelProcessing: {
    ja: "キャンセル対応中です。しばらくお待ちください。",
    en: "Cancellation is in progress. Please wait for a while.",
  },
  working: {
    ja: "出荷作業中あるいは出荷済みです。",
    en: "It is in the process of shipping or has already been shipped.",
  },
  title: {
    ja: "キャンセルについて",
    en: "About cancellation",
  },
  reason: {
    ja: "キャンセル理由",
    en: "Reason for cancellation",
  },
  button: {
    submitting: {
      ja: "キャンセル申請中",
      en: "Cancel request in progress",
    },
    completed: {
      ja: "キャンセル申請済",
      en: "Cancel request completed",
    },
    submit: {
      ja: "注文をキャンセルする",
      en: "Cancel order",
    },
  },
  validate: {
    reason: {
      ja: (len: number) => `${len}文字以上で入力してください。`,
      en: (len: number) => `Please enter ${len} characters or more.`,
    },
    maxLength: {
      ja: (len: number) => `${len}文字以内で入力してください。`,
      en: (len: number) => `Please enter within ${len} characters.`,
    },
  },
  unknownError: {
    ja: "エラーが発生しました。",
    en: "An error occurred.",
  },
};
