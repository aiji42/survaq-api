import { afterAll, describe, expect, test } from "vitest";
import { getClient } from "../src/libs/db";

const getRandomElements = <T>(arr: T[], num: number): T[] => {
  let n = arr.length;
  const result = [...arr];
  for (let i = 0; i < num; i++) {
    const r = i + Math.floor(Math.random() * (n - i));
    // @ts-ignore
    [result[i], result[r]] = [result[r], result[i]];
  }
  return result.slice(0, num);
};

describe("e2e", async () => {
  const client = getClient(import.meta.env.VITE_DATABASE_URL);
  const pages = await client.getAllPages();
  const products = getRandomElements(
    (await (await fetch("http://0.0.0.0:8787/products")).json()) as {
      productId: string;
    }[],
    3,
  );

  afterAll(async () => {
    await client.cleanUp();
  });

  // キャッシュを回避するためにパラメータに付与
  const flag = new Date().toISOString();

  test("products list data path: /products", async () => {
    const production = await (
      await fetch(`https://api.survaq.com/products?${flag}`)
    ).json();
    const development = await (
      await fetch(`http://0.0.0.0:8787/products?${flag}`)
    ).json();

    expect(production).toStrictEqual(development);
  });

  test.each(products)(
    "product delivery schedule data path: /products/$productId/delivery",
    async ({ productId }) => {
      let production = await (
        await fetch(
          `https://api.survaq.com/products/${productId}/delivery?${flag}`,
        )
      ).json();
      let development = await (
        await fetch(
          `http://0.0.0.0:8787/products/${productId}/delivery?${flag}`,
        )
      ).json();

      expect(production).toStrictEqual(development);

      production = await (
        await fetch(
          `https://api.survaq.com/products/${productId}/delivery?${flag}`,
          {
            headers: { "accept-language": "en" },
          },
        )
      ).json();
      development = await (
        await fetch(
          `http://0.0.0.0:8787/products/${productId}/delivery?${flag}`,
          {
            headers: { "accept-language": "en" },
          },
        )
      ).json();

      expect(production).toStrictEqual(development);
    },
  );

  test.each(products)(
    "product delivery schedule data path: /products/$productId/delivery with filter query",
    async ({ productId }) => {
      let production = await (
        await fetch(
          `https://api.survaq.com/products/${productId}/delivery?filter=false&${flag}`,
        )
      ).json();
      let development = await (
        await fetch(
          `http://0.0.0.0:8787/products/${productId}/delivery?filter=false&${flag}`,
        )
      ).json();

      expect(production).toStrictEqual(development);

      // ...skip en
    },
  );

  test.each(products)(
    "product detail data path: /products/$productId/supabase",
    async ({ productId }) => {
      let production = await (
        await fetch(
          `https://api.survaq.com/products/${productId}/supabase?${flag}`,
        )
      ).json();
      let development = await (
        await fetch(
          `http://0.0.0.0:8787/products/${productId}/supabase?${flag}`,
        )
      ).json();

      expect(production).toStrictEqual(development);

      production = await (
        await fetch(
          `https://api.survaq.com/products/${productId}/supabase?${flag}`,
          {
            headers: { "accept-language": "en" },
          },
        )
      ).json();
      development = await (
        await fetch(
          `http://0.0.0.0:8787/products/${productId}/supabase?${flag}`,
          {
            headers: { "accept-language": "en" },
          },
        )
      ).json();

      expect(production).toStrictEqual(development);
    },
  );

  test.each(pages)(
    "page detail data path: /products/page-data/$pathname/supabase?",
    async ({ pathname }) => {
      let production = await (
        await fetch(
          `https://api.survaq.com/products/page-data/${pathname}/supabase?${flag}`,
        )
      ).json();
      let development = await (
        await fetch(
          `http://0.0.0.0:8787/products/page-data/${pathname}/supabase?${flag}`,
        )
      ).json();

      expect(production).toStrictEqual(development);

      production = await (
        await fetch(
          `https://api.survaq.com/products/page-data/${pathname}/supabase?${flag}`,
          {
            headers: { "accept-language": "en" },
          },
        )
      ).json();
      development = await (
        await fetch(
          `http://0.0.0.0:8787/products/page-data/${pathname}/supabase?${flag}`,
          {
            headers: { "accept-language": "en" },
          },
        )
      ).json();

      expect(production).toStrictEqual(development);
    },
  );

  test.each(pages)(
    "page pathname data for redirect: /products/page-data/by-domain/$domain/supabase",
    async ({ domain }) => {
      let production = await (
        await fetch(
          `https://api.survaq.com/products/page-data/by-domain/${domain}/supabase?${flag}`,
        )
      ).json();
      let development = await (
        await fetch(
          `http://0.0.0.0:8787/products/page-data/by-domain/${domain}/supabase?${flag}`,
        )
      ).json();

      expect(production).toStrictEqual(development);
    },
  );
});
