import {
  MessageAttachment,
  SlackApp,
  SlackEdgeAppEnv,
} from "slack-cloudflare-workers";
import { ShopifyOrder } from "../types/shopify";
import { ChatPostMessageRequest } from "slack-web-api-client/dist/client/request";

const CHANNEL = "notify-test";

export class Notifier {
  private readonly slack: SlackApp<SlackEdgeAppEnv>;
  private attachments: MessageAttachment[] = [];

  constructor(env: SlackEdgeAppEnv) {
    this.slack = new SlackApp({ env });
  }

  private append(attachments: MessageAttachment) {
    this.attachments.push(attachments);
  }

  public notify(text: string, option?: Partial<ChatPostMessageRequest>) {
    return this.slack.client.chat.postMessage({
      channel: option?.channel ?? CHANNEL,
      text: option?.text ?? text,
      mrkdwn: true,
      attachments: this.attachments,
    });
  }

  public appendErrorMessage(e: unknown) {
    if (!(e instanceof Error)) return;
    console.error(e);

    this.append({
      color: "danger",
      title: e.name,
      text: e.message,
      fields: [
        {
          title: "stack",
          value: e.stack ? codeBlock(e.stack) : "",
        },
      ],
    });
  }

  public appendNotConnectedSkuOrder(data: ShopifyOrder) {
    this.append({
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
    });
  }

  public async appendErrorResponse(res: Response) {
    if (res.ok) return;

    this.append({
      title: `${res.statusText}: ${res.status}`,
      color: "danger",
      pretext: inlineCode(res.url),
      fields: [
        {
          title: "response body",
          value: codeBlock(await res.text()),
        },
      ],
    });
  }
}

const codeBlock = (text: string) => "```" + text + "```";
const inlineCode = (text: string) => "`" + text + "`";
