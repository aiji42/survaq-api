import { createClient } from 'microcms-js-sdk'
import { Hono } from 'hono'
import { Bindings } from "../bindings";

const app = new Hono<{ Bindings: Bindings }>()

app.get('/products/:id', async (c) => {
  const id = c.req.param('id')
  let product = await c.env.PRODUCT.get<ProductOnMicroCMS>(id, 'json')
  if (product) return c.json(product)

  const cmsClient = createClient({
    serviceDomain: "survaq-shopify",
    apiKey: c.env.MICROCMS_API_TOKEN,
  });
  product = await cmsClient.getListDetail<ProductOnMicroCMS>({
    endpoint: "products",
    contentId: c.req.param('id'),
  })
  c.executionCtx.waitUntil(c.env.PRODUCT.put(id, JSON.stringify(product)))
  return c.json(product)
})

export default app
