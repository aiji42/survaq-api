import { Kiribi } from "kiribi";
import { client } from "kiribi/client";
import { rest } from "kiribi/rest";
import { inlineCode, SlackNotifier } from "../libs/slack";
import { Bindings } from "../../bindings";
import { Cancel } from "./Cancel";
export { Cancel } from "./Cancel";
import { ProductSync } from "./ProductSync";
export { ProductSync } from "./ProductSync";

type Performers = { Cancel: Cancel; ProductSync: ProductSync };
type BindingKeys = keyof Performers;

export default class extends Kiribi<Performers, Bindings> {
  client = client;
  rest = rest;

  async scheduled() {
    // Sweep jobs older than 3 days with statuses COMPLETED, CANCELLED
    await this.sweep({ olderThan: 1000 * 60 * 60 * 24 * 3 });
  }

  async onSuccess(binding: BindingKeys, payload: any) {
    if (binding === "ProductSync") return;
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

  async onFailure(binding: BindingKeys, payload: any, error: Error) {
    const slack = new SlackNotifier(this.env);
    slack.appendErrorMessage(error);
    slack.append({
      color: "danger",
      title: "Job",
      text: binding,
      fields: [
        {
          title: "payload",
          value: inlineCode(JSON.stringify(payload)),
        },
      ],
    });

    await slack.notify(`Failed`);
  }
}
