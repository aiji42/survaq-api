import { ShopifyOrder } from "./shopify";
import { makeSchedule } from "./makeSchedule";
import {
  ContentMailJSON,
  EmailJSON,
  PersonalizationJSON,
  TemplateMailJSON,
} from "../types/sendgrid";
import { JSONSerializableObject } from "../types/utils";

export class MailSender {
  constructor(private readonly env: { SENDGRID_API_KEY: string }) {}

  private async request(mailData: ContentMailJSON | TemplateMailJSON) {
    const headers = new Headers({
      Authorization: `Bearer ${this.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    });
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers,
      body: JSON.stringify(mailData),
    });
    if (!res.ok) throw new Error(await res.text());
    return res;
  }

  protected async sendMailByTemplate({
    to,
    bcc,
    from,
    replyTo,
    templateId,
    templateData,
    bypassListManagement = false,
  }: {
    to: EmailJSON;
    bcc?: EmailJSON;
    from: Required<EmailJSON>;
    replyTo?: EmailJSON;
    templateId: string;
    templateData: JSONSerializableObject;
    bypassListManagement?: boolean;
  }) {
    const payload = {
      personalizations: [
        {
          to: [to],
          bcc: bcc ? [bcc] : undefined,
          dynamic_template_data: templateData,
        },
      ],
      from,
      reply_to: replyTo,
      template_id: templateId,
      mail_settings: {
        bypass_list_management: {
          enable: bypassListManagement,
        },
      },
    } satisfies TemplateMailJSON;

    return this.request(payload);
  }

  async sendMail({
    to,
    from,
    subject,
    contentBody,
    bcc,
    replyTo,
    bypassListManagement = false,
  }: {
    to: EmailJSON;
    from: Required<EmailJSON>;
    subject: string;
    contentBody: string;
    bcc?: EmailJSON;
    replyTo?: EmailJSON;
    bypassListManagement?: boolean;
  }) {
    const payload = {
      personalizations: [
        {
          to: [to],
          bcc: bcc ? [bcc] : undefined,
        },
      ],
      from,
      reply_to: replyTo,
      subject,
      content: [
        {
          type: "text/plain",
          value: contentBody,
        },
      ],
      mail_settings: {
        bypass_list_management: {
          enable: bypassListManagement,
        },
      },
    } satisfies ContentMailJSON;

    return this.request(payload);
  }

  protected async sendMailBulk({
    receivers,
    subject,
    contentBody,
    bcc,
    from,
    replyTo,
    bypassListManagement = false,
  }: {
    receivers: Array<{ email: string; substitutions: Record<string, string> }>;
    subject: string;
    contentBody: string;
    bcc?: EmailJSON;
    from: Required<EmailJSON>;
    replyTo?: EmailJSON;
    bypassListManagement?: boolean;
  }) {
    const payload = {
      personalizations: receivers.map<PersonalizationJSON>(({ email, substitutions }) => ({
        to: [{ email }],
        bcc: bcc ? [bcc] : undefined,
        substitutions,
      })),
      from,
      reply_to: replyTo,
      subject,
      content: [
        {
          type: "text/plain",
          value: contentBody,
        },
      ],
      mail_settings: {
        bypass_list_management: {
          enable: bypassListManagement,
        },
      },
    } satisfies ContentMailJSON;

    return this.request(payload);
  }
}

type NotifyDeliveryScheduleDynamicData = {
  customerName: string;
  deliverySchedule: string;
  orderId: string;
  lineItems: Array<{ title: string }>;
};

type NotifyCancelRequestReceivedDynamicData = {
  customerName: string;
  orderId: string;
};

type AskBankAccountDynamicData = {
  customerName: string;
  orderId: string;
};

export class ShopifyOrderMailSender extends MailSender {
  constructor(
    env: { SENDGRID_API_KEY: string },
    private readonly order: ShopifyOrder,
  ) {
    super(env);
  }

  get support() {
    return {
      email: "support@survaq.com",
      name: this.locale === "ja" ? "サバキューストアサポート" : "SurvaQ Store Support",
    };
  }

  get locale() {
    return this.order.locale;
  }

  get customerName() {
    return (
      this.order.customer.default_address?.name ??
      (this.locale === "ja" ? "お客" : "Valued Customer")
    );
  }

  get customerEmail() {
    return this.order.customer.email;
  }

  async notifyDeliverySchedule(_schedule: string) {
    const schedule = makeSchedule(_schedule, this.locale);
    // サバキューストア: 配送予定日通知メール(日本語|English)
    const templates = {
      ja: "d-431a80069cc74042bf9423f6ca0a8f8a",
      en: "d-f0189b1f76824e8db999d79a2dc40a61",
    };

    return this.sendMailByTemplate({
      to: { email: this.customerEmail },
      bcc: { email: "shipping@survaq.com" },
      from: this.support,
      templateId: templates[this.locale],
      templateData: {
        customerName: this.customerName,
        deliverySchedule: `${schedule.text}(${schedule.subText})`,
        orderId: this.order.code,
        lineItems: this.order.lineItems.map(({ name }) => ({ title: name })),
      } satisfies NotifyDeliveryScheduleDynamicData,
      bypassListManagement: true,
    });
  }

  async notifyCancelRequestReceived() {
    // サバキューストア: キャンセルリクエスト受付通知メール(日本語|English)
    const templates = {
      ja: "d-945cabf39e2b4e7886a50ec7b89ddd8e",
      en: "d-8436e96a60a842319dc85c3318ff993b",
    };

    return this.sendMailByTemplate({
      to: { email: this.customerEmail },
      // FIXME: BCC
      from: this.support,
      templateId: templates[this.locale],
      templateData: {
        customerName: this.customerName,
        orderId: this.order.code,
      } satisfies NotifyCancelRequestReceivedDynamicData,
      bypassListManagement: true,
    });
  }

  async sendAskBankAccountMail() {
    // サバキューストア: キャンセル時の返金先情報を問うメール(日本語のみ)
    const templateId = "d-c0f1410eee2d4d9ea39a75577e01008a";

    return this.sendMailByTemplate({
      to: { email: this.customerEmail },
      // FIXME: BCC確認
      bcc: { email: "support@survaq.com" },
      from: this.support,
      templateId,
      templateData: {
        customerName: this.customerName,
        orderId: this.order.code,
      } satisfies AskBankAccountDynamicData,
      bypassListManagement: true,
    });
  }
}

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
