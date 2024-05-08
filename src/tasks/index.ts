import { Kiribi } from "kiribi";
import { client } from "kiribi/client";
import { rest } from "kiribi/rest";
import { SlackNotifier } from "../libs/slack";
import { Bindings } from "../../bindings";
import { Cancel } from "./cancel";
export { Cancel } from "./cancel";

export default class extends Kiribi<{ Cancel: Cancel }, Bindings> {
  client = client;
  rest = rest;

  async onSuccess(binding: string, payload: any) {
    const slack = new SlackNotifier(this.env);

    await slack.notify(`Successfully processed a job: ${binding}(${JSON.stringify(payload)})`);
  }

  async onFailure(binding: string, payload: any, error: Error) {
    const slack = new SlackNotifier(this.env);
    slack.appendErrorMessage(error);

    await slack.notify(`Failed to process a job: ${binding}(${JSON.stringify(payload)})`);
  }
}
