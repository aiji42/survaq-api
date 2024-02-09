import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { getClient, makeQueries } from "../../libs/db";
import { getMailSender } from "../../libs/sendgrid";
import { getBucket } from "../../libs/bucket";

type Env = { Bindings: Bindings };

const app = new Hono<Env>();

type WebhookBody =
  | {
      event: "items.create";
      collection: "TransactionMails";
      key: number;
    }
  | {
      event: "items.update";
      collection: "TransactionMails";
      keys: string[];
    };

app.post("transaction-mail", async (c) => {
  const { client } = getClient(c.env);
  const { sendTransactionMail } = getMailSender(c.env);
  const { getTransactionMailReceivers, removeTransactionMailReceivers } = getBucket(c.env);

  const body = await c.req.json<WebhookBody>();
  const key = "key" in body ? body.key : Number(body.keys[0]);

  await client.transaction(async (c) => {
    const { getTransactionMail, updateTransactionMail, removeDirectusFiles } = makeQueries(c);
    const data = await getTransactionMail(key);
    if (!data) return;

    const isProd = data.status === "sendPending";
    const resource =
      data.status === "testPending"
        ? data.testResource
        : data.status === "sendPending"
          ? data.resource
          : null;
    if (!resource) return;

    let log = data.log;
    let status: "sent" | "preparing" | "failed" = isProd ? "sent" : "preparing";

    try {
      const records = await getTransactionMailReceivers(resource.filename_disk!);
      let sentCount = 0;
      for (const record of chunks(records, 1000)) {
        await sendTransactionMail({ ...data, isTest: !isProd }, record);
        sentCount += record.length;
        log = appendLog(log, `mail sent to ${sentCount}/${records.length} addresses`, !isProd);
      }

      if (isProd) {
        await removeDirectusFiles(resource.id);
        await removeTransactionMailReceivers(resource.filename_disk!);
      }
    } catch (e) {
      status = "failed";
      const message = e instanceof Error ? e.message : String(e);
      log = appendLog(log, `mail sending failed: ${message}`, !isProd);
    }

    await updateTransactionMail(key, { status, log });
  });

  return c.text("webhook received");
});

const appendLog = (orgLog: string | null, newLog: string, isTest: boolean) => {
  const split = (orgLog ?? "").split("\n");
  split.unshift(`[${new Date().toISOString()}]${isTest ? "[TEST]" : ""} ${newLog}`);
  return split.join("\n");
};

const chunks = <T>(a: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(a.length / size) }, (_, i) => a.slice(i * size, i * size + size));

export default app;
