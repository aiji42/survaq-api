import { DB } from "../../db";
import { MailSender } from "../sendgrid/MailSender";
import { parse } from "csv-parse/browser/esm/sync";
import { chunks } from "../../utils";
import { Logger } from "../../logger";

type TransactionMailData = Exclude<Awaited<ReturnType<DB["getTransactionMail"]>>, undefined | null>;

export class TransactionMail {
  private db: DB;
  private bucket: R2Bucket;
  private mailer: TransactionMailSender;
  private _data: undefined | TransactionMailData;
  constructor(env: { DATABASE_URL: string; CMS_BUCKETS: R2Bucket; SENDGRID_API_KEY: string }) {
    this.db = new DB(env);
    this.bucket = env.CMS_BUCKETS;
    this.mailer = new TransactionMailSender(env);
  }

  async prepare(key: number) {
    const data = await this.db.getTransactionMail(key);
    if (!data) throw new Error("TransactionMail not found");
    this._data = data;
  }

  private get data() {
    if (!this._data) throw new Error("Execute prepare() before");
    return this._data;
  }

  get status() {
    return this.data.status;
  }

  get isPending() {
    return ["sendPending", "testPending"].includes(this.status);
  }

  get isProductionPending() {
    return this.status === "sendPending";
  }

  private get resource(): TransactionMailData["resource"] | TransactionMailData["testResource"] {
    if (this.status === "testPending") return this.data.testResource;
    if (this.status === "sendPending") return this.data.resource;
    throw new Error("You can only get resource when status is testPending or sendPending");
  }

  private async getCSVRecords(): Promise<{ email: string; [k: string]: string }[]> {
    const key = this.resource?.filename_disk;
    if (!key) throw new Error("csv key not found");
    const csvData = await this.bucket.get(key);
    if (!csvData) throw new Error("csv file not found");
    const parsed = parse(removeBOM(await csvData.text()), { columns: true });

    if (!Array.isArray(parsed)) throw new Error("csv parse error");
    if (!parsed.every((item) => !!item.email)) throw new Error("email not found in csv");

    return parsed;
  }

  async sendMail() {
    if (!this.isPending) throw new Error("TransactionMail is not pending");

    const logger = new Logger();
    let count = 0;
    const records = await this.getCSVRecords();
    const data = { ...this.data };

    try {
      for (const record of chunks(records, 1000)) {
        await this.mailer.send({ ...data, isTest: !this.isProductionPending }, record);
        count += record.length;
        logger.push(
          `mail sent to ${count}/${records.length} addresses`,
          this.isProductionPending ? "info" : "debug",
        );
      }

      data.status = this.isProductionPending ? "sent" : "preparing";
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logger.push(`mail sending failed: ${message}`, "error");

      data.status = "failed";
    }

    data.log = data.log ? `${data.log}\n${logger.toString()}` : logger.toString();

    await this.db.updateTransactionMail(this.data.id, {
      status: data.status,
      log: data.log,
    });
  }

  async cleanup() {
    const resource = this.resource;
    if (this.isProductionPending && resource) {
      await this.db.removeDirectusFiles(resource.id);
      await this.bucket.delete(resource.filename_disk!);
    }
  }
}

const removeBOM = (text: string) => {
  const bom = "\uFEFF";
  if (text.startsWith(bom)) return text.slice(bom.length);
  return text;
};

export class TransactionMailSender extends MailSender {
  constructor(env: { SENDGRID_API_KEY: string }) {
    super(env);
  }

  async send(
    {
      fromName,
      from,
      subject,
      body,
      isTest,
    }: { from: string; fromName: string; subject: string; body: string; isTest: boolean },
    receivers: Array<{ email: string; [key: string]: string }>,
  ) {
    // フェイルセーフで、テストを誤って実ユーザに送信しないよう送信上限を設ける
    if (isTest && receivers.length > 5) throw new Error("too many test receivers. limit is 5.");

    return this.sendMailBulk({
      receivers: receivers.map(({ email, ...substitutions }) => ({
        email,
        substitutions,
      })),
      subject: isTest ? `[TEST] ${subject}` : subject,
      contentBody: body,
      from: { email: from, name: fromName },
      bypassListManagement: true,
    });
  }
}
