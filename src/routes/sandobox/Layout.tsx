import type { Child, FC } from "hono/jsx";

export const Layout: FC<{ lang?: "ja" | "en"; children: Child }> = ({ children, lang = "ja" }) => {
  return (
    <html lang={lang}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>sandbox</title>
        <script type="module" src="/src/web-components/index.ts" />
      </head>
      <body>{children}</body>
    </html>
  );
};
