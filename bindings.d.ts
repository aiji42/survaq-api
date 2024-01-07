export type Bindings = {
  DATABASE_URL: string;
  SHOPIFY_ACCESS_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  HYPERDRIVE?: Hyperdrive;
  CACHE: KVNamespace;
};
