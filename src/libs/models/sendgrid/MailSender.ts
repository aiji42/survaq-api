import { ShopifyOrder } from "../shopify/ShopifyOrder";
import { makeSchedule } from "../../makeSchedule";
import {
  ContentMailJSON,
  EmailJSON,
  PersonalizationJSON,
  TemplateMailJSON,
} from "../../../types/sendgrid";
import { JSONSerializableObject } from "../../../types/utils";

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
  lineItems: Array<{ title: string }>;
};

type NotifyCancelCompletedMailDynamicData = {
  customerName: string;
  orderId: string;
  lineItems: Array<{ title: string }>;
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
      bcc: { email: "request@survaq.com" },
      from: this.support,
      templateId: templates[this.locale],
      templateData: {
        customerName: this.customerName,
        orderId: this.order.code,
        lineItems: this.order.lineItems.map(({ name }) => ({ title: name })),
      } satisfies NotifyCancelRequestReceivedDynamicData,
      bypassListManagement: true,
    });
  }

  async sendCancelCompletedMail(isRequiringCashRefunds: boolean) {
    let templateId: string = "";
    if (isRequiringCashRefunds) {
      // サバキューストア: キャンセル完了+返金先を問うメール(日本語のみ)
      templateId = "d-c0f1410eee2d4d9ea39a75577e01008a";
    } else {
      // サバキューストア: キャンセル完了メール(日本語|English)
      templateId =
        this.locale === "ja"
          ? "d-0af33758e30643e4b1a37c8739e42ba1"
          : "d-31a9daae534943be8c899536f231cd56";
    }

    return this.sendMailByTemplate({
      to: { email: this.customerEmail },
      bcc: { email: "request@survaq.com" },
      from: this.support,
      templateId,
      templateData: {
        customerName: this.customerName,
        orderId: this.order.code,
        lineItems: this.order.lineItems.map(({ name }) => ({ title: name })),
      } satisfies NotifyCancelCompletedMailDynamicData,
      bypassListManagement: true,
    });
  }
}
