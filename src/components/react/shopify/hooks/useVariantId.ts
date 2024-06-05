import { useEffect, useState } from "react";

declare global {
  interface Window {
    ShopifyAnalytics: {
      meta: {
        selectedVariantId: string;
      };
    };
  }
}

export const useVariantId = (initialVariantId: string) => {
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
