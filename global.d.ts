declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: "development" | "production" | "test";
    readonly MICROCMS_API_TOKEN: string;
    readonly BIGQUERY_CREDENTIALS?: string;
  }
}
