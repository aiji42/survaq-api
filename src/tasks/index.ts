import { Kiribi } from "kiribi";
import { client } from "kiribi/client";
import { rest } from "kiribi/rest";
import { inlineCode, SlackNotifier } from "../libs/slack";
import { Bindings } from "../../bindings";
import { Cancel } from "./cancel";
export { Cancel } from "./cancel";

export default class extends Kiribi<{ Cancel: Cancel }, Bindings> {
  client = client;
  rest = rest;

  async onSuccess(binding: string, payload: any) {
    const slack = new SlackNotifier(this.env);
    slack.append({
      color: "good",
      title: "Job",
      text: binding,
      fields: [
        {
          title: "payload",
          value: inlineCode(JSON.stringify(payload)),
        },
      ],
    });
    await slack.notify(`Successfully`);
  }

  async onFailure(binding: string, payload: any, error: Error) {
    const slack = new SlackNotifier(this.env);
    slack.appendErrorMessage(error);

    await slack.notify(`Failed to process a job: ${binding}(${JSON.stringify(payload)})`);
  }
}
