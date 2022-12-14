import { BigQuery } from "@google-cloud/bigquery";
import sql from "sqlstring";

const credentials = process.env.BIGQUERY_CREDENTIALS
  ? JSON.parse(process.env.BIGQUERY_CREDENTIALS)
  : undefined;

const bigQueryClient = new BigQuery({
  credentials,
});

export const getFundingByBigQuery = async (
  productGroupId: string
): Promise<{ supporter: number; totalPrice: number }> => {
  const [[bq]] = await bigQueryClient.query({
    query: sql.format(query, [productGroupId]),
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
  LEFT JOIN shopify.products p
    ON li.product_id = p.id
  WHERE productGroupId = ?
`;
