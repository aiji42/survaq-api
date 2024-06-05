import useSWRImmutable from "swr/immutable";
import { hc } from "hono/client";
import { ProductDetailsRoute } from "../../../../routes/_apis/products";

const baseUrl = new URL("https://api.survaq.com/products/");
if (import.meta.env.DEV) {
  baseUrl.protocol = "http:";
  baseUrl.hostname = "localhost";
  baseUrl.port = "8787";
}
const client = hc<ProductDetailsRoute>(baseUrl.toString(), {
  init: {
    headers: {
      "Accept-Language": document.documentElement.lang,
    },
  },
});

export const useProductData = (productId: string) => {
  const { data } = useSWRImmutable(
    productId,
    async (key) => {
      const res = await client[":id"].$get({ param: { id: key } });
      return res.json();
    },
    {
      suspense: true,
      errorRetryInterval: 3000,
      shouldRetryOnError: true,
    },
  );

  return data;
};

export type Product = ReturnType<typeof useProductData>;
