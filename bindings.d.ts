import { Kiribi } from "kiribi";
import { Cancel } from "./src/tasks";

export type Bindings = {
  DATABASE_URL: string;
  SHOPIFY_ACCESS_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  SENDGRID_API_KEY: string;
  HYPERDRIVE?: Hyperdrive;
  CACHE: KVNamespace;
  CMS_BUCKETS: R2Bucket;
  LOGILESS_CLIENT_ID: string;
  LOGILESS_CLIENT_SECRET: string;
  LOGILESS_REDIRECT_URI: string;

  // Kiribi
  KIRIBI_DB: D1Database;
  KIRIBI_QUEUE: Queue;
  KIRIBI: Service<Kiribi<{ Cancel: Cancel }>>;
};
