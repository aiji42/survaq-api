/* @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { Layout } from "../../components/hono/Layout";
import { CMSChecker } from "../../tasks";
import { needLogin } from "../../libs/utils";
import { StatusPage } from "../../components/hono/StatusPage";

const app = new Hono<{ Bindings: { DEV?: string; CMSChecker: CMSChecker } }>();

app.use("*", needLogin);

app.get("/data", async (c) => {
  const res = await c.env.CMSChecker.validate();

  return c.html(
    <Layout isDev={!!c.env.DEV} title="商品管理システム 整合性チェック">
      <StatusPage {...res} />
    </Layout>,
  );
});

export default app;
