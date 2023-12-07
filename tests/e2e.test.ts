import { describe, expect, test } from "vitest";
import { getAllPages, setClient } from "../src/db";

describe("e2e", async () => {
  test("products list data path: /products/supabase", async () => {
    const production = await (
      await fetch("https://api.survaq.com/products/supabase")
    ).json();
    const development = await (
      await fetch("http://0.0.0.0:8787/products/supabase")
    ).json();

    expect(production).toStrictEqual(development);
  });

  const products: { productId: string }[] = await (
    await fetch("https://api.survaq.com/products/supabase")
  ).json();

  test.each(products)(
    "product funding data path: /products/$productId/funding",
    async ({ productId }) => {
      const production = await (
        await fetch(`https://api.survaq.com/products/${productId}/funding`)
      ).json();
      const development = await (
        await fetch(`http://0.0.0.0:8787/products/${productId}/funding`)
      ).json();

      expect(production).toStrictEqual(development);
    }
  );

  test.each(products)(
    "product delivery schedule data path: /products/$productId/delivery",
    async ({ productId }) => {
      let production = await (
        await fetch(`https://api.survaq.com/products/${productId}/delivery`)
      ).json();
      let development = await (
        await fetch(`http://0.0.0.0:8787/products/${productId}/delivery`)
      ).json();

      expect(production).toStrictEqual(development);

      production = await (
        await fetch(`https://api.survaq.com/products/${productId}/delivery`, {
          headers: { "accept-language": "en" },
        })
      ).json();
      development = await (
        await fetch(`http://0.0.0.0:8787/products/${productId}/delivery`, {
          headers: { "accept-language": "en" },
        })
      ).json();

      expect(production).toStrictEqual(development);
    }
  );

  test.each(products)(
    "product detail data path: /products/$productId/supabase",
    async ({ productId }) => {
      let production = await (
        await fetch(`https://api.survaq.com/products/${productId}/supabase`)
      ).json();
      let development = await (
        await fetch(`http://0.0.0.0:8787/products/${productId}/supabase`)
      ).json();

      expect(production).toStrictEqual(development);

      production = await (
        await fetch(`https://api.survaq.com/products/${productId}/supabase`, {
          headers: { "accept-language": "en" },
        })
      ).json();
      development = await (
        await fetch(`http://0.0.0.0:8787/products/${productId}/supabase`, {
          headers: { "accept-language": "en" },
        })
      ).json();

      expect(production).toStrictEqual(development);
    }
  );

  setClient(import.meta.env.VITE_DATABASE_URL);
  const pages = await getAllPages();

  test.each(pages)(
    "page detail data path: /products/page-data/$pathname/supabase",
    async ({ pathname }) => {
      let production = await (
        await fetch(
          `https://api.survaq.com/products/page-data/${pathname}/supabase`
        )
      ).json();
      let development = await (
        await fetch(
          `http://0.0.0.0:8787/products/page-data/${pathname}/supabase`
        )
      ).json();

      expect(production).toStrictEqual(development);

      production = await (
        await fetch(
          `https://api.survaq.com/products/page-data/${pathname}/supabase`,
          {
            headers: { "accept-language": "en" },
          }
        )
      ).json();
      development = await (
        await fetch(
          `http://0.0.0.0:8787/products/page-data/${pathname}/supabase`,
          {
            headers: { "accept-language": "en" },
          }
        )
      ).json();

      expect(production).toStrictEqual(development);
    }
  );

  test.each(pages)(
    "page pathname data for redirect: /products/page-data/by-domain/$domain/supabase",
    async ({ domain }) => {
      let production = await (
        await fetch(
          `https://api.survaq.com/products/page-data/by-domain/${domain}/supabase`
        )
      ).json();
      let development = await (
        await fetch(
          `http://0.0.0.0:8787/products/page-data/by-domain/${domain}/supabase`
        )
      ).json();

      expect(production).toStrictEqual(development);
    }
  );
});