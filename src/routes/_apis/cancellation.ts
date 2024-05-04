import { Hono } from "hono";
import { Bindings } from "../../../bindings";
import { Logiless } from "../../libs/logiless";
import { Shopify } from "../../libs/shopify";
import { DB } from "../../libs/db";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

type Env = {
  Bindings: Bindings;
};

const app = new Hono<Env>();

app.get("/cancelable", async (c) => {
  const id = c.req.query("id");
  if (!id) return c.text("Missing id", 400);

  const shopify = new Shopify(c.env);
  try {
    const cancelable = await shopify.getCancelable(id);
    if (!cancelable.isCancelable) return c.json(cancelable);
  } catch (e) {
    return c.text("Not found", 404);
  }

  const logiless = new Logiless(c.env);
  const code = (await shopify.getOrder(id)).name.replace(/^#/, "");

  try {
    const cancelable = await logiless.getCancelable(code);
    return c.json(cancelable);
  } catch (e) {
    return c.text("Not found", 404);
  }
});

app.post(
  "/cancel",
  zValidator("json", z.object({ id: z.string(), reason: z.string().trim().min(1) })),
  async (c) => {
    const { id, reason } = c.req.valid("json");

    const shopify = new Shopify(c.env);
    try {
      const cancelable = await shopify.getCancelable(id);
      if (!cancelable.isCancelable) return c.text(`Not cancelable (${cancelable.reason})`, 400);
    } catch (e) {
      return c.text("Not found", 404);
    }

    const logiless = new Logiless(c.env);
    const code = (await shopify.getOrder(id)).name.replace(/^#/, "");

    try {
      const cancelable = await logiless.getCancelable(code);
      if (!cancelable.isCancelable) return c.text(`Not cancelable (${cancelable.reason})`, 400);
    } catch (e) {
      return c.text("Not found", 404);
    }

    const db = new DB(c.env);
    const res = await db.useTransaction(async (tdb) => {
      const existingRequest = await tdb.getCancelRequest(code);
      if (existingRequest) return false;

      return tdb.createCancelRequest({
        orderCode: code,
        status: "Pending",
        store: "Shopify",
        reason,
      });
    });

    if (!res) return c.text("Already requested", 400);

    return c.json(res);
  },
);

app.delete("/cancel/:id", async (c) => {
  // localhostでのみ有効にする
  if (!c.req.url.startsWith("http://localhost")) return c.text("Not found", 404);

  const db = new DB(c.env);
  const id = c.req.param("id");

  await db.deleteCancelRequest(Number(id));

  return c.json({ message: "Cancel request deleted" });
});

export default app;
