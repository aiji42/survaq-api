import { ShopifyOrder } from "../types/shopify";

const API_VERSION = "2023-10";

export const getShopifyClient = (accessToken: string) => {
  const headers = new Headers({
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  });

  return {
    updateOrderNoteAttributes: (
      original: ShopifyOrder,
      newNoteAttribute: ShopifyOrder["note_attributes"],
    ) => {
      const merged = new Map(
        original.note_attributes
          .concat(newNoteAttribute)
          .map(({ name, value }) => [name, value]),
      );

      return fetch(
        `https://survaq.myshopify.com/admin/api/${API_VERSION}/orders/${original.id}.json`,
        {
          method: "PUT",
          body: JSON.stringify({
            order: {
              id: original.id,
              note_attributes: Array.from(merged, ([name, value]) => ({
                name,
                value,
              })),
            },
          }),
          headers,
        },
      );
    },
  };
};
