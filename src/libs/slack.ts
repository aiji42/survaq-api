import { MessageAttachment, SlackApp, SlackEdgeAppEnv } from "slack-cloudflare-workers";
import { ShopifyOrder } from "../types/shopify";
import { ChatPostMessageRequest } from "slack-web-api-client/dist/client/request";

const CHANNEL = "notify-test";

export class Notifier {
  private readonly slack: SlackApp<SlackEdgeAppEnv>;
  private attachments: Map<string, MessageAttachment[]> = new Map([[CHANNEL, []]]);

  constructor(env: SlackEdgeAppEnv) {
    this.slack = new SlackApp({ env });
  }

  private append(attachment: MessageAttachment, channel = CHANNEL) {
    const attachments = [...(this.attachments.get(channel) ?? []), attachment];
    this.attachments.set(channel, attachments);
  }

  public async notify(text: string, option?: Partial<ChatPostMessageRequest>) {
    return Promise.all(
      [...this.attachments.entries()].map(async ([channel, attachments]) => {
        if (attachments.length < 1) return;
        await this.slack.client.chat.postMessage({
          channel,
          text: option?.text ?? text,
          mrkdwn: true,
          attachments,
        });
        this.attachments.set(channel, []);
      }),
    );
  }

  public appendErrorMessage(e: unknown, channel?: string) {
    if (!(e instanceof Error)) return;
    console.error(e);

    this.append(
      {
        color: "danger",
        title: e.name,
        text: e.message,
        fields: [
          {
            title: "stack",
            value: e.stack ? codeBlock(e.stack) : "",
          },
        ],
      },
      channel,
    );
  }

  public appendNotConnectedSkuOrder(data: ShopifyOrder, channel?: string) {
    this.append(
      {
        title: `注文番号 ${data.name}`,
        title_link: `https://survaq.myshopify.com/admin/orders/${data.id}`,
        color: "warning",
        pretext: "SKU情報の無いオープンな注文が処理されています。",
        fields: [
          {
            title: "購入日時(UTC)",
            value: data.created_at,
          },
        ],
      },
      channel,
    );
  }

  public async appendErrorResponse(res: Response, channel?: string) {
    if (res.ok) return;

    this.append(
      {
        title: `${res.statusText}: ${res.status}`,
        color: "danger",
        pretext: inlineCode(res.url),
        fields: [
          {
            title: "response body",
            value: codeBlock(await res.text()),
          },
        ],
      },
      channel,
    );
  }
}

const codeBlock = (text: string) => "```" + text + "```";
const inlineCode = (text: string) => "`" + text + "`";
