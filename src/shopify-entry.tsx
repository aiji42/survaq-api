import React from "react";
import { createRoot } from "react-dom/client";
import { ShopifyAdditionalSelectors } from "./components/react/ShopifyAdditionalSelectors";

const main = (productId: string, initialVariantId: string) => {
  const domNode = document.getElementById("additionalProperties");
  if (domNode) {
    const root = createRoot(domNode);
    root.render(
      <ShopifyAdditionalSelectors productId={productId} initialVariantId={initialVariantId} />,
    );
  }
};

// @ts-ignore
window.customScriptSurvaq = main;
