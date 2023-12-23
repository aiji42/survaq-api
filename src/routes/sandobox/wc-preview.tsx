import type { FC } from "hono/jsx";
import { Hono } from "hono";

const Layout: FC = ({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>sandbox</title>
        <script src="/static/web-components.js" />
      </head>
      <body>{children}</body>
    </html>
  );
};

const app = new Hono();

app.get("/wc-preview", (c) => {
  return c.html(
    <Layout>
      <survaq-delivery-schedule productId="8719571812557" />
      <survaq-delivery-schedule productId="8719571812557" filter />
      <survaq-delivery-schedule productId="8719571812557a" />
    </Layout>,
  );
});

export default app;
