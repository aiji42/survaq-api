import type { Child, FC } from "hono/jsx";

export const Layout: FC<{ lang?: "ja" | "en"; isDev?: boolean; children: Child }> = ({
  children,
  lang = "ja",
  isDev = false,
}) => {
  return (
    <html lang={lang}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>sandbox</title>
        {!isDev ? (
          <script type="module" src="/static/web-components.js" />
        ) : (
          <script type="module" src="/src/web-components/index.ts" />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
};
