import { FC } from "react";
import { DragZone } from "../../DropDown";
import { useCSV } from "./hooks/useCSV";
import { useUpload } from "./hooks/useUpload";
import { PortalContainer } from "../PortalContainer/PortalContainer";

export const SmartShoppingPage: FC = () => {
  const { data, errors, files, onUpload, onRemove } = useCSV();

  const importable = data.length > 0 && Object.values(errors).length == 0;

  const { isUploading, error: uploadError, upload, isSuccessful } = useUpload();

  return (
    <PortalContainer h1="スマートショッピング データインポート">
      <div className="space-y-4">
        <DragZone
          files={files.map((file) => ({ file, messages: errors[file.name] || [] }))}
          onUpload={onUpload}
          accepts={["text/csv"]}
          description="スマートショッピングのCSVファイルをアップロードしてください。"
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
          <table className="w-full text-sm text-left rtl:text-right text-gray-500">
            <thead className="text-gray-700 uppercase bg-gray-50">
              <tr className="whitespace-nowrap">
                <th className="py-1">日</th>
                <th className="py-1">アイテム ID</th>
                <th className="py-1">商品名</th>
                <th className="py-1">通貨コード</th>
                <th className="py-1">費用</th>
              </tr>
            </thead>
            <tbody>
              {data.sort().map((row, index) => (
                <tr key={index}>
                  <td className="py-1">{row.date}</td>
                  <td className="py-1">{row.merchantCenterId}</td>
                  <td className="py-1">{row.name}</td>
                  <td className="py-1">{row.currencyCode}</td>
                  <td className="py-1">{row.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PortalContainer>
  );
};
