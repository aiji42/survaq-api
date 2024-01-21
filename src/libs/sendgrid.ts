import { ShopifyOrder } from "../types/shopify";
import { makeSchedule } from "./makeSchedule";

type NotifyDeliveryScheduleDynamicData = {
  customerName: string;
  deliverySchedule: string;
  orderId: string;
  lineItems: Array<{ title: string }>;
};

export const getMailSender = ({ SENDGRID_API_KEY }: { SENDGRID_API_KEY: string }) => {
  const headers: Headers = new Headers({
    Authorization: `Bearer ${SENDGRID_API_KEY}`,
    "Content-Type": "application/json",
  });
  const system = { email: "system@survaq.com" };

  return {
    notifyDeliverySchedule: (data: ShopifyOrder, _schedule: string) => {
      const locale = data.customer_locale.startsWith("ja") ? "ja" : "en";
      const support = {
        email: "support@survaq.com",
        name: locale === "ja" ? "サバキューストアサポート" : "SurvaQ Store Support",
      };
      const schedule = makeSchedule(_schedule, locale);
      // サバキューストア: 配送予定日通知メール(日本語|English)
      const templates = {
        ja: "d-431a80069cc74042bf9423f6ca0a8f8a",
        en: "d-f0189b1f76824e8db999d79a2dc40a61",
      };

      const body = {
        personalizations: [
          {
            // FIXME
            to: [system],
            // bcc: [system],
            dynamic_template_data: {
              customerName: data.customer.default_address.name,
              deliverySchedule: `${schedule.text}(${schedule.subText})`,
              orderId: data.name,
              lineItems: data.line_items.map(({ name }) => ({ title: name })),
            } satisfies NotifyDeliveryScheduleDynamicData,
          },
        ],
        from: support,
        template_id: templates[locale],
      };

      return fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    },
  };
};
