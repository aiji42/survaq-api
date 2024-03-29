export type Bindings = {
  DATABASE_URL: string;
  SHOPIFY_ACCESS_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  SENDGRID_API_KEY: string;
  HYPERDRIVE?: Hyperdrive;
  CACHE: KVNamespace;
  CMS_BUCKETS: R2Bucket;
};
