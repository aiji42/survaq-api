import { Hono } from "hono";
import { cors } from "hono/cors";
import { Bindings } from "../bindings";
import { makeSchedule } from "../libs/makeSchedule";
import { makeVariants, Variants } from "../libs/makeVariants";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.type";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "/products/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "OPTIONS"],
    maxAge: 600,
  })
);

app.get("products/:id/funding", async (c) => {
  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

  const { data, error } = await client
    .from("ShopifyProducts")
    .select("ShopifyProductGroups(*)")
    .match({ productId: c.req.param("id") })
    .maybeSingle();

  if (error) return c.json(error, 500);
  if (!data) return c.notFound();
  if (Array.isArray(data.ShopifyProductGroups)) return c.json(error, 500);

  return c.json({
    totalPrice:
      (data.ShopifyProductGroups?.totalPrice ?? 0) +
      (data.ShopifyProductGroups?.realTotalPrice ?? 0),
    supporters:
      (data.ShopifyProductGroups?.supporters ?? 0) +
      (data.ShopifyProductGroups?.realSupporters ?? 0),
    closeOn: data.ShopifyProductGroups?.closeOn ?? null,
  });
});

app.get("/products/:id/supabase", async (c) => {
  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

  const { data, error } = await client
    .from("ShopifyProducts")
    .select(
      "*,ShopifyProductGroups(*),ShopifyVariants(*,ShopifyVariants_ShopifyCustomSKUs(ShopifyCustomSKUs(*)))"
    )
    .match({ productId: c.req.param("id") })
    .maybeSingle();

  if (error) return c.json(error, 500);
  if (!data) return c.notFound();
  if (!data.ShopifyProductGroups || Array.isArray(data.ShopifyProductGroups))
    return c.json(error, 500);

  const locale = c.req.headers.get("accept-language")?.startsWith("en")
    ? "en"
    : "ja";

  const variants = makeVariants(
    data,
    (data.ShopifyVariants ?? []) as Variants,
    locale
  );

  return c.json({
    variants,
    schedule: makeSchedule(data.ShopifyProductGroups.deliverySchedule, locale),
  });
});

app.get("/products/page-data/:code/supabase", async (c) => {
  const locale = c.req.headers.get("accept-language")?.startsWith("en")
    ? "en"
    : "ja";

  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

  const { data, error } = await client
    .from("ShopifyPages")
    .select(
      "*,logo:shopifypages_logo_foreign(filename_disk,width,height),favicon:shopifypages_favicon_foreign(filename_disk),ShopifyProducts(*,ShopifyProductGroups(*),ShopifyVariants(*,ShopifyVariants_ShopifyCustomSKUs(ShopifyCustomSKUs(*))))"
    )
    .match({ pathname: c.req.param("code") })
    .maybeSingle();

  if (error) return c.json(error, 500);
  if (!data) return c.notFound();

  const { ShopifyProducts, ...page } = data;

  if (!ShopifyProducts || Array.isArray(ShopifyProducts))
    return c.text("invalid ShopifyProducts", 500);

  if (
    ShopifyProducts.ShopifyVariants &&
    !Array.isArray(ShopifyProducts.ShopifyVariants)
  )
    return c.text("invalid ShopifyVariants", 500);

  if (
    !ShopifyProducts.ShopifyProductGroups ||
    Array.isArray(ShopifyProducts.ShopifyProductGroups)
  )
    return c.text("invalid ShopifyProductGroups", 500);

  return c.json({
    ...page,
    variants: makeVariants(
      ShopifyProducts,
      (ShopifyProducts.ShopifyVariants ?? []) as Variants,
      locale
    ),
    schedule: makeSchedule(
      ShopifyProducts.ShopifyProductGroups.deliverySchedule,
      locale
    ),
    productId: ShopifyProducts.productId,
  });
});

app.get("/products/page-data/by-domain/:domain/supabase", async (c) => {
  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

  const { data, error } = await client
    .from("ShopifyPages")
    .select("pathname")
    .match({ domain: c.req.param("domain") })
    .limit(1)
    .maybeSingle();

  if (error) return c.json(error, 500);
  if (!data) return c.notFound();

  return c.json({ pathname: data.pathname });
});

app.post("/products/sku/sync", async (c) => {
  const json = await c.req.json<{
    message: {};
    type: "new" | "edit" | "delete";
    contents: {
      new?: { publishValue: Exclude<Variant["skus"], undefined>[number] };
    };
  }>();
  const data = json.contents.new?.publishValue;

  if (!data) return c.json({});

  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

  console.log("upsert ShopifyCustomSKUs");
  const { error } = await client
    .from("ShopifyCustomSKUs")
    .upsert(
      {
        code: data.code,
        name: data.name,
        subName: data.subName,
        deliverySchedule: data.deliverySchedule ?? null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      {
        onConflict: "code",
        ignoreDuplicates: false,
      }
    )
    .select("id");

  if (error) console.error(error);
  if (error) return c.json(error, 500);

  return c.json({ message: "synced" });
});

app.post("/shopify/product", async (c) => {
  const data = await c.req.json<{ body_html?: string; handle?: string }>();

  const client = createSupabaseClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_KEY
  );

  if (data.handle && data.body_html) {
    const { error } = await client
      .from("ShopifyPages")
      .update({ body: data.body_html, updatedAt: new Date().toISOString() })
      .eq("productHandle", data.handle);

    if (error) console.error(error);
    return c.json({ message: error });
  }

  return c.json({ message: "synced" });
});

export default app;
