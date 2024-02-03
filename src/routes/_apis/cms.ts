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

    let resource: typeof data.testResource = null;
    let isTest = true;

    if (data.status === "testPending" && data.testResource) {
      resource = data.testResource;
    } else if (data.status === "sendPending" && data.resource?.filename_disk) {
      resource = data.resource;
      isTest = false;
    }

    if (!resource) return;

    try {
      const csvData = await env.CMS_BUCKETS.get(resource.filename_disk!);
      if (!csvData) throw new Error("csv file not found");

      let text = await csvData.text();
      // BOMを削除
      const bom = "\uFEFF";
      if (text.startsWith(bom)) text = text.slice(bom.length);

      const records: Array<{ email: string; [key: string]: string }> = csvParse(text, {
        columns: true,
      });

      const result = await sendTransactionMail(data, records);
      if (result.status !== 202) throw new Error(await result.text());

      await updateTransactionMail(key, {
        status: isTest ? "preparing" : "sent",
        log: `[${new Date().toISOString()}] ${isTest ? "test " : ""}mail sent to ${records.length} addresses\n${data.log ?? ""}`,
      });
      if (!isTest) {
        // 本番ならdirectusFileレコードを削除
        await removeDirectusFiles(resource.id);
        // R2からファイルを削除
        await env.CMS_BUCKETS.delete(resource.filename_disk!);
      }
    } catch (e) {
      if (e instanceof Error)
        await updateTransactionMail(key, {
          status: "failed",
          log: `[${new Date().toISOString()}] ${isTest ? "test " : ""}mail sending failed: ${e.message}\n${data.log ?? ""}`,
        });
    }
  });

  return c.text("webhook received");
});

export default app;
