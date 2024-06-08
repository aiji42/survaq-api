/* @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { FC, Child } from "hono/jsx";
import { CMSChecker } from "../../tasks";
import { needLogin } from "../../libs/utils";
import { StatusPage } from "../../components/hono/StatusPage";

const app = new Hono<{ Bindings: { DEV?: string; CMSChecker: CMSChecker } }>();

app.use("*", needLogin);

app.get("/data", async (c) => {
  const res = await c.env.CMSChecker.validate();

  return c.html(
    <Layout title="商品管理システム 整合性チェック" dev={!!c.env.DEV}>
      <StatusPage {...res} />
    </Layout>,
  );
});

app.get("/rakuten/ad-import", async (c) => {
  return c.html(
    <Layout title="楽天広告データインポート" dev={!!c.env.DEV}>
      <div id="rakuten-ads-import-root" />
    </Layout>,
  );
});

export default app;

const Layout: FC<{
  title: string;
  children: Child;
  dev?: boolean;
  additionalHead?: Child;
}> = ({ title, children, dev = false, additionalHead }) => {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        {!dev ? (
          <>
            <link type="text/css" rel="stylesheet" href="/static/style.css" />
            <script type="module" src="/static/portal.js" />
          </>
        ) : (
          <>
            <link type="text/css" rel="stylesheet" href="/src/globals.css" />
            <script type="module" src="/src/entries/portal.tsx" />
          </>
        )}
        {additionalHead}
      </head>
      <body className="max-w-6xl mx-auto">{children}</body>
    </html>
  );
};
