const API_VERSION = "2023-10";

export const getShopifyClient = (accessToken: string) => {
  const headers = new Headers({
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  });

  return {
    updateOrderNoteAttributes: (
      id: number,
      noteAttribute: Array<{ name: string; value: string }>,
    ) => {
      return fetch(
        `https://survaq.myshopify.com/admin/api/${API_VERSION}/orders/${id}.json`,
        {
          method: "PUT",
          body: JSON.stringify({
            order: {
              id,
              note_attributes: noteAttribute,
            },
          }),
          headers,
        },
      );
    },
  };
};
