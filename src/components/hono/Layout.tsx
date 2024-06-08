/* @jsxImportSource hono/jsx */
import type { Child, FC } from "hono/jsx";

export const SandboxLayout: FC<{
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

export const PortalLayout: FC<{
  title: string;
  children?: Child;
  dev?: boolean;
  bodyProps: Record<string, any>;
  pageCode: string;
}> = ({ title, children, dev = false, bodyProps, pageCode }) => {
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
        {children}
      </head>
      <body className="max-w-6xl mx-auto">
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__BODY_PROPS__ = ${JSON.stringify(bodyProps)}`,
          }}
        />
        <div id={pageCode} />
      </body>
    </html>
  );
};
