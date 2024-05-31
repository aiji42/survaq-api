import { Bindings } from "../../bindings";
import { KiribiPerformer } from "kiribi/performer";
import { SlackNotifier } from "../libs/slack";
import { MessageAttachment } from "slack-cloudflare-workers";

type Payload = {
  text: string;
  channel?: string;
  attachments?: MessageAttachment[];
};

export class NotifyToSlack extends KiribiPerformer<Payload, void, Bindings> {
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
  }

  async perform(data: Payload) {
    const slack = new SlackNotifier(this.env);

    // attachments が0件だと送られないので、空のattachmentsを追加しておく
    slack.append({}, data.channel);

    data.attachments?.forEach((attachment) => {
      slack.append(attachment, data.channel);
    });

    await slack.notify(data.text);
  }
}
