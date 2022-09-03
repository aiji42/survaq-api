import fastify from "fastify";
import { createClient } from "microcms-js-sdk";
import { getFundingByBigQuery } from "../libs/getFundingByBigQuery";

const cmsClient = createClient({
  serviceDomain: "survaq-shopify",
  apiKey: process.env.MICROCMS_API_TOKEN,
});

const server = fastify({ logger: true });

server.get<{ Params: { id: string } }>("/products/:id", async (request) => {
  const id = request.params.id;
  const {
    contents: [product],
  } = await cmsClient.getList<ProductOnMicroCMS>({
    endpoint: "products",
    queries: {
      filters: "productIds[contains]" + id,
    },
  });
  const fundingBQ = await getFundingByBigQuery(id);

  return {
    closeOn: product?.foundation.closeOn,
    supporter: fundingBQ.supporter + (product?.foundation.supporter ?? 0),
    totalPrice: fundingBQ.totalPrice + (product?.foundation.totalPrice ?? 0),
  };
});

const start = async () => {
  try {
    await server.listen({
      host: "0.0.0.0",
      port: Number(process.env.PORT ?? 3000),
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
