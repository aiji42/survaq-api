import { FC } from "react";
import { DragZone } from "../../DropDown";
import { State, useCSVs } from "./hooks/useCSVs";
import useSWRMutation from "swr/mutation";
import { hc } from "hono/client";
import { AdsImportRoute } from "../../../../routes/_apis/rakuten";

const baseUrl = new URL("https://api.survaq.com/rakuten/");
if (import.meta.env.DEV) {
  baseUrl.protocol = "http:";
  baseUrl.hostname = "localhost";
  baseUrl.port = "8787";
}
const client = hc<AdsImportRoute>(baseUrl.toString());

const useUpload = () => {
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

export const RakutenAdsImportPage: FC = () => {
  const { data, errors, files, onUpload, onRemove } = useCSVs();

  const importable = data.length > 0 && Object.values(errors).length == 0;

  const { isUploading, error: uploadError, upload, isSuccessful } = useUpload();

  return (
    <div className="p-2 space-y-4">
      <h1 className="text-xl font-bold">楽天広告データインポート</h1>
      <DragZone
        files={files.map((file) => ({ file, messages: errors[file.name] || [] }))}
        onUpload={onUpload}
        accepts={["text/csv"]}
        description="楽天広告のCSVファイルをアップロードしてください。"
        onRemove={onRemove}
        disabled={isUploading || isSuccessful}
      />
      <div className="space-y-1">
        <button
          disabled={!importable || isUploading || isSuccessful}
          onClick={() => upload(data)}
          className="w-full py-2 text-white bg-blue-500 rounded-md font-bold hover:opacity-75 disabled:opacity-50 relative"
        >
          {isUploading && (
            <div className="flex justify-center absolute left-2" aria-label="インポート中">
              <div className="animate-spin size-6 border-4 border-black rounded-full border-t-transparent" />
            </div>
          )}
          {isSuccessful ? "インポート完了" : "インポート"}
        </button>
        {uploadError && (
          <p className="text-red-500 text-sm text-center font-bold" role="alert">
            {uploadError.message}
          </p>
        )}
      </div>
      {data.length > 0 && (
        <div className="max-h-96 overflow-scroll">
          <table className="w-full text-sm text-left rtl:text-right text-gray-500">
            <thead className="text-gray-700 uppercase bg-gray-50 sticky top-0">
              <tr className="whitespace-nowrap">
                <th className="py-1">日付</th>
                <th className="py-1">商品</th>
                <th className="py-1">CLICK</th>
                <th className="py-1">
                  IMP <span className="text-xs font-medium align-middle">(CTRとCLICKより計算)</span>
                </th>
                <th className="py-1">Cost</th>
                <th className="py-1">
                  CPC<span className="text-xs font-medium align-middle">(￥)</span>
                </th>
                <th className="py-1">CTR</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.key}>
                  <td className="py-1">{row.date}</td>
                  <td className="py-1">{row.itemId}</td>
                  <td className="py-1">{row.clicks}</td>
                  <td className="py-1">{row.impressions}</td>
                  <td className="py-1">{row.cost}</td>
                  <td className="py-1">{row.cpc}</td>
                  <td className="py-1">{row.ctr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
