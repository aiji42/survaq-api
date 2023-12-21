import type { FC } from "hono/jsx";
import app from "../app";

const Layout: FC = ({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>sandbox</title>
        <script src="/static/web-component.js" />
      </head>
      <body>{children}</body>
    </html>
  );
};

export const Preview = () => {
  return (
    <Layout>
      <survaq-delivery-schedule />
    </Layout>
  );
};

app.get("/sandbox/wc-preview", (c) => {
  return c.html(<Preview />);
});
