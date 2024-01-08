import {
  MessageAttachment,
  SlackApp,
  SlackEdgeAppEnv,
} from "slack-cloudflare-workers";
import { ShopifyOrder } from "../types/shopify";

const CHANNEL = "notify-test";

export const makeNotifier = (env: SlackEdgeAppEnv, title: string) => {
  const slack = new SlackApp({ env });

  const notify = (attachments: MessageAttachment[]) => {
    return slack.client.chat.postMessage({
      channel: CHANNEL,
      text: title,
      mrkdwn: true,
      attachments,
    });
  };

  return {
    notify,

    notifyError: (e: unknown) => {
      if (!(e instanceof Error)) return;
      console.error(title, e);

      return notify([
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
      ]);
    },

    notifyNotConnectedSkuOrder: (data: ShopifyOrder) => {
      return notify([
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
      ]);
    },

    notifyErrorResponse: async (res: Response) => {
      if (res.ok) return;

      return notify([
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
      ]);
    },
  };
};

const codeBlock = (text: string) => "```" + text + "```";
const inlineCode = (text: string) => "`" + text + "`";
