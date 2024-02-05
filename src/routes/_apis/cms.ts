import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { getClient, makeQueries } from "../../libs/db";
import { parse as csvParse } from "csv-parse/browser/esm/sync";
import { getMailSender } from "../../libs/sendgrid";

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

// TODO: リファクタリング
app.post("transaction-mail", async (c) => {
  const { client } = getClient(c.env);
  const { sendTransactionMail } = getMailSender(c.env);
  const env = c.env;

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

    try {
      const csvData = await env.CMS_BUCKETS.get(resource.filename_disk!);
      if (!csvData) throw new Error("csv file not found");

      const records = csvParse(removeBOM(await csvData.text()), { columns: true });
      // TODO: テストなら件名に[test]をつける
      const result = await sendTransactionMail(data, records);
      if (result.status !== 202) throw new Error(await result.text());

      const status = isProd ? "sent" : "preparing";
      const log = `${isProd ? "" : "test "}mail sent to ${records.length} addresses`;
      await updateTransactionMail(key, { status, log: appendLog(data.log, log) });

      if (!isProd) return;

      // 本番ならファイルを削除
      await removeDirectusFiles(resource.id);
      await env.CMS_BUCKETS.delete(resource.filename_disk!);
    } catch (e) {
      const log = `${isProd ? "" : "test "}mail sending failed: ${e instanceof Error ? e.message : String(e)}`;
      await updateTransactionMail(key, { status: "failed", log: appendLog(data.log, log) });
    }
  });

  return c.text("webhook received");
});

const removeBOM = (text: string) => {
  const bom = "\uFEFF";
  if (text.startsWith(bom)) return text.slice(bom.length);
  return text;
};

const appendLog = (orgLog: string | null, newLog: string) => {
  const split = (orgLog ?? "").split("\n");
  split.unshift(`[${new Date().toISOString()}] ${newLog}`);
  return split.join("\n");
};

export default app;
