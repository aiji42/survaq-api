import React from "react";
import { createRoot } from "react-dom/client";
import { RakutenAdsImportPage } from "../components/react/pages/RakutenAdsImportPage/RakutenAdsImportPage";

const rakutenAdsImportRoot = document.getElementById("rakuten-ads-import-root");
if (rakutenAdsImportRoot) {
  createRoot(rakutenAdsImportRoot).render(<RakutenAdsImportPage />);
}
