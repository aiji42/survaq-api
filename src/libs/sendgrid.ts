import { ShopifyOrder } from "../types/shopify";
import { DeliveryScheduleCustomAttrs } from "./shopify";

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
  const support = { email: "support@survaq.com" };

  return {
    notifyDeliverySchedule: (data: ShopifyOrder, schedule: DeliveryScheduleCustomAttrs) => {
      const deliverySchedule = schedule.notifications[0]?.value;
      if (!deliverySchedule) throw Error();

      const body = {
        personalizations: [
          {
            // FIXME
            to: [{ email: "uejima.aiji@survaq.com" }],
            bcc: [system],
            dynamic_template_data: {
              customerName: `${data.customer.first_name} ${data.customer.last_name}`,
              deliverySchedule,
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
