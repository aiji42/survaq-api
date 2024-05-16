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
          <>
            <script type="module" src="/static/web-components.js" />
            <link type="text/css" rel="stylesheet" href="/static/style.css" />
          </>
        ) : (
          <>
            <script type="module" src="/src/web-components/index.ts" />
            <link type="text/css" rel="stylesheet" href="/src/globals.css" />
          </>
        )}
      </head>
      <body className="p-4">{children}</body>
    </html>
  );
};
