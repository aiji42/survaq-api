import React, { FC, useEffect, useReducer, useState } from "react";
import useSWR from "swr";
import { hc } from "hono/client";
import { ProductDetailsRoute } from "../../routes/_apis/products";
import { SkuSelector } from "./SkuSelector";

const baseUrl = new URL("https://api.survaq.com/products/");
if (import.meta.env.DEV) {
  baseUrl.protocol = "http:";
  baseUrl.hostname = "localhost";
  baseUrl.port = "8787";
}
const client = hc<ProductDetailsRoute>(baseUrl.toString());

type Props = {
  productId: string;
  initialVariantId: string;
};

const useProductData = (productId: string) => {
  const { data } = useSWR(productId, async (key) => {
    const res = await client[":id"].$get({ param: { id: key } });
    return res.json();
  });

  return data;
};

type Product = Exclude<ReturnType<typeof useProductData>, null | undefined>;

declare global {
  interface Window {
    ShopifyAnalytics: {
      meta: {
        selectedVariantId: string;
      };
    };
  }
}

const useVariantId = (initialVariantId: string) => {
  const [variantId, setVariantId] = useState<string>(initialVariantId);
  useEffect(() => {
    const handler = () => {
      setVariantId(window.ShopifyAnalytics.meta.selectedVariantId);
    };
    document.addEventListener("change", handler);
    return () => document.removeEventListener("change", handler);
  }, []);

  return variantId;
};

const getSKUsByGroupCode = (product: Product, code: string) => {
  return product.skuGroups[code] ?? [];
};

type Actions =
  | { type: "selectedSKU"; payload: { index: number; value: string } }
  | { type: "changeVariant"; payload: { variantId: string } };

export const ShopifyAdditionalSelectors: FC<Props> = ({ productId, initialVariantId }) => {
  const product = useProductData(productId);
  const variantId = useVariantId(initialVariantId);
  const [selectedSkus, dispatch] = useReducer(
    (s: { selectedSkus: string[]; baseSkus: string[] }, action: Actions) => {
      if (action.type === "selectedSKU") {
        const selectedSkus = [...s.selectedSkus];
        selectedSkus[action.payload.index] = action.payload.value;
        return { ...s, selectedSkus };
      } else {
        const variant = product?.variants.find((v) => v.variantId === action.payload.variantId);
        if (!product || !variant) return s;
        const selectedSkus = variant.skuGroups.map(
          ({ skuGroupCode }) => getSKUsByGroupCode(product, skuGroupCode)[0]!,
        );
        return { selectedSkus, baseSkus: variant.skus };
      }
    },
    {
      selectedSkus: [],
      baseSkus: [],
    },
  );
  useEffect(() => {
    dispatch({ type: "changeVariant", payload: { variantId } });
  }, [variantId]);

  if (!product || !variantId) return null;

  const variant = product.variants.find((v) => v.variantId === variantId);
  if (!variant || !variant.skuGroups.length) return null;

  return (
    <div>
      {variant.skuGroups.map(({ skuGroupCode, label }, index) => {
        const options = getSKUsByGroupCode(product, skuGroupCode).map<{
          code: string;
          name: string;
        }>((code) => ({
          code,
          name: product.skus[code]!.name,
        }));
        return (
          <SkuSelector
            label={label}
            code={options[0]?.code ?? ""}
            options={options}
            onChange={(value) => dispatch({ type: "selectedSKU", payload: { index, value } })}
            index={index}
            key={index}
          />
        );
      })}
    </div>
  );
};
