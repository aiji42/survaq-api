/* @jsxImportSource hono/jsx */
import type { Child, FC } from "hono/jsx";

export type LayoutProps = {
  lang?: "ja" | "en";
  isDev?: boolean;
  title?: string;
};

export const Layout: FC<{
  lang?: "ja" | "en";
  isDev?: boolean;
  title?: string;
  children: Child;
}> = ({ children, lang = "ja", title = "sandbox", isDev = false }) => {
  return (
    <html lang={lang}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        {!isDev ? (
          <>
            <script type="module" src="/static/web-components.js" />
            <script type="module" src="/static/shopify-entry.js" />
            <link type="text/css" rel="stylesheet" href="/static/style.css" />
          </>
        ) : (
          <>
            <script type="module" src="/src/entries/web-components.ts" />
            <script type="module" src="/src/entries/shopify.tsx" />
            <link type="text/css" rel="stylesheet" href="/src/globals.css" />
          </>
        )}
      </head>
      <body className="max-w-4xl mx-auto">{children}</body>
    </html>
  );
};
