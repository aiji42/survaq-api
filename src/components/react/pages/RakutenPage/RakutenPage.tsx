import { FC } from "react";
import { DragZone } from "../../DropDown";
import { useCSVs } from "./hooks/useCSVs";
import { useUpload } from "./hooks/useUpload";
import { PortalContainer } from "../PortalContainer/PortalContainer";

export const RakutenPage: FC = () => {
  const { data, errors, files, onUpload, onRemove } = useCSVs();

  const importable = data.length > 0 && Object.values(errors).length == 0;

  const { isUploading, error: uploadError, upload, isSuccessful } = useUpload();

  return (
    <PortalContainer h1="Rakuten Ads データインポート">
      <div className="space-y-4">
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
                    IMP{" "}
                    <span className="text-xs font-medium align-middle">(CTRとCLICKより計算)</span>
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
    </PortalContainer>
  );
};
