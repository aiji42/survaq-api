/* @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { Layout } from "../../components/hono/Layout";
import { ShopifyOrderSyncBQ } from "../../libs/models/shopify/ShopifyOrderSyncBQ";
import { Bindings } from "../../../bindings";
import { InventoryOperator } from "../../libs/models/cms/Inventory";
import { DB } from "../../libs/db";
import { BigQuery } from "cfw-bq";
import { BQ_PROJECT_ID } from "../../constants";
import { RakutenOrder, SEARCH_DATE_TYPE } from "../../libs/models/rakuten/RakutenOrder";
import { AmazonOrder } from "../../libs/models/amazon/AmazonOrder";
import { needLogin } from "../../libs/utils";
import { AmazonAdsClient } from "../../libs/models/amazon/AmazonAdsClient";
import { Product } from "../../libs/models/cms/Product";
import { HTTPException } from "hono/http-exception";

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", needLogin);

app.get("/delivery-schedules", (c) => {
  return c.html(
    <Layout isDev={!!c.env.DEV}>
      <survaq-delivery-schedule productId="8719571812557" />
      <survaq-delivery-schedule productId="8719571812557" delayedOnly />
      <survaq-delivery-schedule productId="7266231288013" />
      <survaq-delivery-schedule productId="7266231288013" delayedOnly />
      <survaq-delivery-schedule productId="8719571812557a" />
    </Layout>,
  );
});

app.get("/delivery-schedules/:id", (c) => {
  const id = c.req.param("id");
  return c.html(
    <Layout isDev={!!c.env.DEV}>
      <survaq-delivery-schedule productId={id} />
      <survaq-delivery-schedule productId={id} delayedOnly />
    </Layout>,
  );
});

app.get("/orders/:id", (c) => {
  const id = c.req.param("id");
  return c.html(
    <Layout isDev={!!c.env.DEV}>
      <div className="border rounded-md w-full p-4 my-3">
        <survaq-delivery-schedule-order orderId={id} />
      </div>
      <div className="border rounded-md w-full p-4 my-3">
        <survaq-order-cancel orderId={id} />
      </div>
    </Layout>,
  );
});

app.get("/shopify/:id", async (c) => {
  const id = c.req.param("id");
  const order = new ShopifyOrderSyncBQ(c.env);
  await order.prepare(id);

  return c.json({
    order: order.createBQOrdersTableData(),
    lineItems: order.createBQLineItemsTableData(),
    orderSKUs: order.createBQOrderSKUsTableData(),
  });
});

app.get("/inventory/:code", async (c) => {
  const code = c.req.param("code");
  const db = new DB(c.env);
  const bq = new BigQuery(JSON.parse(c.env.GCP_SERVICE_ACCOUNT), BQ_PROJECT_ID);
  const waitingShipmentQuantity = await InventoryOperator.fetchWaitingShipmentQuantity(bq, code);

  const res = await db.useTransaction(async (transactedDB) => {
    const sku = await InventoryOperator.fetchSku(transactedDB, code);
    const inventory = new InventoryOperator(sku, waitingShipmentQuantity, c.env);
    const updateQuery = await inventory.update(transactedDB);
    return { sku, updateQuery };
  });

  return c.json(res);
});

app.get("/rakuten", async (c) => {
  const rakutenOrder = new RakutenOrder(c.env.RMS_SERVICE_SECRET, c.env.RMS_LICENSE_KEY);

  const orders = await rakutenOrder.search({
    dateType: SEARCH_DATE_TYPE.ORDER_DATE,
    beginDate: "2024-05-20",
    endDate: "2024-06-01",
    limit: 10,
  });

  return c.json(orders);
});

app.get("/amazon", async (c) => {
  const amazon = new AmazonOrder(
    c.env.SP_API_CLIENT_ID,
    c.env.SP_API_CLIENT_SECRET,
    c.env.SP_API_REFRESH_TOKEN,
  );

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

app.get("amazon/ads", async (c) => {
  const amazon = new AmazonAdsClient(c.env);
  return c.json(await amazon.getAccounts());
});

app.get("/shopify/product/:id", async (c) => {
  const id = c.req.param("id");
  const db = new DB(c.env);
  const product = await new Product(db, "ja").getProductByShopifyId(id);
  if (!product) throw new HTTPException(404);

  const variantId = c.req.query("variantId") ?? product.variants[0]!.variantId;

  return c.html(
    <Layout isDev={!!c.env.DEV}>
      <div className="delivery-schedule"></div>
      <div className="delivery-schedule" data-short="true"></div>
      <select name="variant" id="variant" defaultValue={variantId}>
        {product.variants.map((variant) => (
          <option value={variant.variantId}>{variant.variantName}</option>
        ))}
      </select>
      <script
        dangerouslySetInnerHTML={{
          __html: `
        window.ShopifyAnalytics ||= { meta: { selectedVariantId: null } };
        document.getElementById("variant").addEventListener("change", (e) => {
          window.ShopifyAnalytics.meta.selectedVariantId = e.target.value;
          const url = new URL(window.location.href);
          url.searchParams.set("variantId", e.target.value);
          history.pushState({}, '', url);
        });
        document.dispatchEvent(new Event("change"));
      `,
        }}
      />
      <div id="additionalProperties"></div>
      <script
        dangerouslySetInnerHTML={{
          __html: `addEventListener("load", () => { customScriptSurvaq("${id}", "${variantId}") })`,
        }}
      />
    </Layout>,
  );
});

export default app;
