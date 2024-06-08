import React from "react";
import { createRoot } from "react-dom/client";
import { RakutenPage } from "../components/react/pages/RakutenPage/RakutenPage";
import { StatusPage } from "../components/react/pages/StatusPage/StatusPage";
import { PortalPage } from "../components/react/pages/PortalPage/PortalPage";

declare global {
  interface Window {
    __BODY_PROPS__: any;
  }
}

const props = window.__BODY_PROPS__;

const indexRoute = document.getElementById("index");
if (indexRoute) {
  createRoot(indexRoute).render(<PortalPage {...props} />);
}

const statusRoute = document.getElementById("status");
if (statusRoute) {
  createRoot(statusRoute).render(<StatusPage {...props} />);
}

const rakutenRoot = document.getElementById("rakuten");
if (rakutenRoot) {
  createRoot(rakutenRoot).render(<RakutenPage {...props} />);
}
