/* @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { CMSChecker } from "../../tasks";
import { needLogin } from "../../libs/utils";
import { PortalLayout } from "../../components/hono/Layout";

const app = new Hono<{ Bindings: { DEV?: string; CMSChecker: CMSChecker } }>();

app.use("*", needLogin);

app.get("/", async (c) => {
  return c.html(
    <PortalLayout title="サバキューポータル" dev={!!c.env.DEV} bodyProps={{}} pageCode="index" />,
  );
});

app.get("/status", async (c) => {
  const res = await c.env.CMSChecker.validate();

  return c.html(
    <PortalLayout
      title="商品管理システム 整合性チェック | サバキュー"
      dev={!!c.env.DEV}
      bodyProps={res}
      pageCode="status"
    />,
  );
});

app.get("/rakuten", async (c) => {
  return c.html(
    <PortalLayout
      title="Rakuten Ads データインポート | サバキュー"
      dev={!!c.env.DEV}
      bodyProps={{}}
      pageCode="rakuten"
    />,
  );
});

app.get("/smart-shopping", async (c) => {
  return c.html(
    <PortalLayout
      title="スマートショッピング データインポート | サバキュー"
      dev={!!c.env.DEV}
      bodyProps={{}}
      pageCode="smart-shopping"
    />,
  );
});

export default app;
