import { hc } from "hono/client";
import { AdsImportRoute } from "../../../../../routes/_apis/imports";
import useSWRMutation from "swr/mutation";
import { State } from "./useCSV";

const baseUrl = new URL("https://api.survaq.com/imports/");
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
  >("smart-shopping-import", async (_, { arg }) => {
    const res = await client.ads["smart-shopping"].$post({ json: arg });
    if (!res.ok) throw new Error("インポートに失敗しました。");
    return true;
  });

  return { isUploading: isMutating, error, upload: trigger, isSuccessful: data };
};
