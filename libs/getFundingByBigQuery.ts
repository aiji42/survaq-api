import { BigQuery } from "@google-cloud/bigquery";
import sql from "sqlstring";

const credentials = process.env.BIGQUERY_CREDENTIALS
  ? JSON.parse(process.env.BIGQUERY_CREDENTIALS)
  : undefined;

const bigQueryClient = new BigQuery({
  credentials,
  scopes: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/bigquery",
  ],
  projectId: credentials.project_id,
});

export const getFundingByBigQuery = async (
  productId: string
): Promise<{ supporter: number; totalPrice: number }> => {
  const [[bq]] = await bigQueryClient.query({
    query: sql.format(query, [Number(productId)]),
  });

  return {
    supporter: bq?.supporters ?? 0,
    totalPrice: bq?.price ?? 0,
  };
};

const query = `
  SELECT
    sum(original_total_price) AS price,
    count(distinct order_id) AS supporters
  FROM shopify.line_items li
  WHERE product_id = "gid://shopify/Product/?"
  GROUP BY product_id
`;
