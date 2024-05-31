import { MessageAttachment, SlackApp, SlackEdgeAppEnv } from "slack-cloudflare-workers";
import { ChatPostMessageRequest } from "slack-web-api-client/dist/client/request";
import { SLACK_CHANNEL } from "../constants";

export class SlackNotifier {
  private readonly slack: SlackApp<SlackEdgeAppEnv>;
  private attachments: Map<string, MessageAttachment[]> = new Map([[SLACK_CHANNEL.DEBUG, []]]);

  constructor(env: SlackEdgeAppEnv) {
    this.slack = new SlackApp({ env });
  }

  append(attachment: MessageAttachment, channel = SLACK_CHANNEL.DEBUG) {
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

    this.append(SlackNotifier.makeErrorAttachment(e), channel);
  }

  static makeErrorAttachment(e: Error): MessageAttachment {
    return {
      color: "danger",
      title: e.name,
      text: e.message,
      fields: [
        {
          title: "stack",
          value: e.stack ? codeBlock(e.stack) : "",
        },
      ],
    };
  }
}

export const codeBlock = (text: string) => "```" + text + "```";
export const inlineCode = (text: string) => "`" + text + "`";
