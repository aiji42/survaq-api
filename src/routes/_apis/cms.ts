import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { DB } from "../../libs/db";
import { getMailSender } from "../../libs/sendgrid";
import { getBucket } from "../../libs/bucket";
import { chunks } from "../../libs/utils";

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
  const db = new DB(c.env);
  const { sendTransactionMail } = getMailSender(c.env);
  const { getTransactionMailReceivers, removeTransactionMailReceivers } = getBucket(c.env);

  const body = await c.req.json<WebhookBody>();
  const key = "key" in body ? body.key : Number(body.keys[0]);

  await db.useTransaction(async (tdb) => {
    const data = await tdb.getTransactionMail(key);
    if (!data || !["sendPending", "testPending"].includes(data.status)) return;

    const isProd = data.status === "sendPending";
    let nextLog = data.log;
    let nextStatus: "sent" | "preparing" | "failed" = isProd ? "sent" : "preparing";

    try {
      const resource = getResource(data);
      const records = await getTransactionMailReceivers(resource.filename_disk!);

      let count = 0;
      for (const record of chunks(records, 1000)) {
        await sendTransactionMail({ ...data, isTest: !isProd }, record);
        count += record.length;
        nextLog = appendLog(nextLog, `mail sent to ${count}/${records.length} addresses`, !isProd);
      }

      if (isProd) {
        await tdb.removeDirectusFiles(resource.id);
        await removeTransactionMailReceivers(resource.filename_disk!);
      }
    } catch (e) {
      nextStatus = "failed";
      const message = e instanceof Error ? e.message : String(e);
      nextLog = appendLog(nextLog, `mail sending failed: ${message}`, !isProd);
    }

    await tdb.updateTransactionMail(key, { status: nextStatus, log: nextLog });
  });

  return c.text("webhook received");
});

const getResource = (
  data: Exclude<Awaited<ReturnType<DB["getTransactionMail"]>>, undefined | null>,
): Exclude<
  | Exclude<Awaited<ReturnType<DB["getTransactionMail"]>>, undefined | null>["testResource"]
  | Exclude<Awaited<ReturnType<DB["getTransactionMail"]>>, undefined | null>["resource"],
  null
> => {
  if (data.status === "testPending" && data.testResource) return data.testResource;
  if (data.status === "sendPending" && data.resource) return data.resource;
  throw new Error("csv is not set on the record");
};

const appendLog = (orgLog: string | null, newLog: string, isTest: boolean) => {
  const split = (orgLog ?? "").split("\n");
  split.unshift(`[${new Date().toISOString()}]${isTest ? "[TEST]" : ""} ${newLog}`);
  return split.join("\n");
};

export default app;
