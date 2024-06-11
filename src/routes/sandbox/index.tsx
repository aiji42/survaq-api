/* @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { SandboxLayout } from "../../components/hono/Layout";
import { Bindings } from "../../../bindings";
import { DB } from "../../libs/db";
import { AmazonOrder } from "../../libs/models/amazon/AmazonOrder";
import { needLogin } from "../../libs/utils";
import { Product } from "../../libs/models/cms/Product";
import { HTTPException } from "hono/http-exception";

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", needLogin);

app.get("/delivery-schedules", (c) => {
  return c.html(
    <SandboxLayout isDev={!!c.env.DEV}>
      <survaq-delivery-schedule productId="8719571812557" />
      <survaq-delivery-schedule productId="8719571812557" delayedOnly />
      <survaq-delivery-schedule productId="7266231288013" />
      <survaq-delivery-schedule productId="7266231288013" delayedOnly />
      <survaq-delivery-schedule productId="8719571812557a" />
    </SandboxLayout>,
  );
});

app.get("/delivery-schedules/:id", (c) => {
  const id = c.req.param("id");
  return c.html(
    <SandboxLayout isDev={!!c.env.DEV}>
      <survaq-delivery-schedule productId={id} />
      <survaq-delivery-schedule productId={id} delayedOnly />
    </SandboxLayout>,
  );
});

app.get("/orders/:id", (c) => {
  const id = c.req.param("id");
  return c.html(
    <SandboxLayout isDev={!!c.env.DEV}>
      <div className="border rounded-md w-full p-4 my-3">
        <survaq-delivery-schedule-order orderId={id} />
      </div>
      <div className="border rounded-md w-full p-4 my-3">
        <survaq-order-cancel orderId={id} />
      </div>
    </SandboxLayout>,
  );
});

app.get("/amazon", async (c) => {
  const amazon = new AmazonOrder(c.env);

  const { data } = await amazon.getOrders({
    limit: 10,
    createdAfter: "2024-05-20",
  });
  const items = await amazon.getOrderItemsBulk(data.map((order) => order.AmazonOrderId));

  return c.json(
    data.map((order) => ({
      ...order,
      items: items.find(([id, items]) => id === order.AmazonOrderId)?.[1] ?? [],
    })),
  );
});

app.get("/shopify/product/:id", async (c) => {
  const id = c.req.param("id");
  const db = new DB(c.env);
  const product = await new Product(db, "ja").getProductByShopifyId(id);
  if (!product) throw new HTTPException(404);

  const variantId = c.req.query("variantId") ?? product.variants[0]!.variantId;
  const lang = c.req.query("lang") === "en" ? "en" : "ja";

  return c.html(
    <SandboxLayout isDev={!!c.env.DEV} lang={lang}>
      <div className="delivery-schedule"></div>
      <div className="delivery-schedule" data-short="true"></div>
      <form id="form">
        <select name="variant" id="variant" defaultValue={variantId}>
          {product.variants.map((variant) => (
            <option value={variant.variantId}>{variant.variantName}</option>
          ))}
        </select>
        <div id="additionalProperties"></div>
      </form>
      <pre id="preview" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
        window.ShopifyAnalytics ||= { meta: { selectedVariantId: '${variantId}' } };
        document.getElementById("variant").addEventListener("change", (e) => {
          window.ShopifyAnalytics.meta.selectedVariantId = e.target.value;
          const url = new URL(window.location.href);
          url.searchParams.set("variantId", e.target.value);
          history.pushState({}, '', url);
        });
      `,
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
          const form = document.getElementById("form");
          const preview = () => {
            const preview = document.getElementById("preview");
            const values = Object.fromEntries(new FormData(form).entries().flatMap(([k, v]) => (k.includes('properties') ? [[k.replace('properties[', '').replace(']', ''), v]] : [])));
            const json = JSON.stringify(values, null, 2)
            if (preview.innerText !== json) preview.innerText = json;
          }
          setInterval(preview, 50);
          
          addEventListener("load", () => { customScriptSurvaq("${id}", "${variantId}"); });
          `,
        }}
      />
    </SandboxLayout>,
  );
});

export default app;
