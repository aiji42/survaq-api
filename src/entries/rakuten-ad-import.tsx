import React from "react";
import { createRoot } from "react-dom/client";
import { RakutenAdsImportPage } from "../components/react/pages/RakutenAdsImportPage/RakutenAdsImportPage";

const domNode = document.getElementById("root")!;
const root = createRoot(domNode);
root.render(<RakutenAdsImportPage />);
