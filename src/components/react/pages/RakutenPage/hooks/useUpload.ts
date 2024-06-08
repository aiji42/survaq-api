import { hc } from "hono/client";
import { AdsImportRoute } from "../../../../../routes/_apis/rakuten";
import useSWRMutation from "swr/mutation";
import { State } from "./useCSVs";

const baseUrl = new URL("https://api.survaq.com/rakuten/");
if (import.meta.env.DEV) {
  baseUrl.protocol = "http:";
  baseUrl.hostname = "localhost";
  baseUrl.port = "8787";
}

const client = hc<AdsImportRoute>(baseUrl.toString());

export const useUpload = () => {
  const { isMutating, error, trigger, data } = useSWRMutation<
    boolean,
    Error,
    string,
    State["rows"]
  >("rakuten-ads-import", async (_, { arg }) => {
    const res = await client.ads.import.$post({ json: arg });
    if (!res.ok) throw new Error("インポートに失敗しました。");
    return true;
  });

  return { isUploading: isMutating, error, upload: trigger, isSuccessful: data };
};
