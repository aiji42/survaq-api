import { ShopifyOrder } from "../types/shopify";
import { Locale, makeSchedule } from "./makeSchedule";

type NotifyDeliveryScheduleDynamicData = {
  customerName: string;
  deliverySchedule: string;
  orderId: string;
  lineItems: Array<{ title: string }>;
};

export const getMailSender = ({ SENDGRID_API_KEY }: { SENDGRID_API_KEY: string }) => {
  // FIXME: メールテンプレートの言語の切り替え
  const headers: Headers = new Headers({
    Authorization: `Bearer ${SENDGRID_API_KEY}`,
    "Content-Type": "application/json",
  });
  const system = { email: "system@survaq.com" };
  const support = { email: "support@survaq.com", name: "サバキューストアサポート" };

  return {
    notifyDeliverySchedule: (data: ShopifyOrder, _schedule: string, locale: Locale) => {
      const schedule = makeSchedule(_schedule, locale);

      const body = {
        personalizations: [
          {
            // FIXME
            to: [{ email: "aiji42@gmail.com" }],
            bcc: [system],
            dynamic_template_data: {
              customerName: data.customer.default_address.name,
              deliverySchedule: `${schedule.text}(${schedule.subText})`,
              orderId: data.name,
              lineItems: data.line_items.map(({ name }) => ({ title: name })),
            } satisfies NotifyDeliveryScheduleDynamicData,
          },
        ],
        from: support,
        // サバキューストア: 配送予定日通知メール
        template_id: "d-431a80069cc74042bf9423f6ca0a8f8a",
      };

      return fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    },
  };
};
