import { useState, useCallback, FC, DragEvent, ChangeEvent } from "react";

export type DragZoneProps = {
  files: {
    file: File;
    messages?: string[];
  }[];
  onUpload: (files: File[]) => void;
  onRemove: (file: File) => void;
  accepts: string[];
  description?: string;
  disabled?: boolean;
};

export const DragZone: FC<DragZoneProps> = ({
  files,
  onUpload,
  onRemove,
  accepts,
  description = [],
  disabled,
}) => {
  // ドラッグ中の状態を管理する
  const [dragging, setDragging] = useState(false);

  // ドラッグイベントのハンドラ
  const handleDrag = useCallback(
    (event: DragEvent<HTMLLabelElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.type === "dragenter" || event.type === "dragover") {
        setDragging(true);
      } else if (event.type === "dragleave" || event.type === "drop") {
        setDragging(false);
      }
    },
    [disabled],
  );

  // ドロップイベントのハンドラ
  const handleDrop = useCallback(
    (event: DragEvent<HTMLLabelElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      setDragging(false);
      if (event.dataTransfer.files) {
        const prevFiles = files.map(({ file }) => file);
        onUpload(
          [...prevFiles, ...event.dataTransfer.files].filter((file) => accepts.includes(file.type)),
        );
        event.dataTransfer.clearData();
      }
    },
    [files, onUpload, disabled],
  );

  const changeHandler = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const prevFiles = files.map(({ file }) => file);
      onUpload([...prevFiles, ...(event.target.files ?? [])]);
      event.target.value = "";
    },
    [files, onUpload, disabled],
  );

  return (
    <div className="flex items-center justify-center w-full">
      <label
        htmlFor="dropzone-file"
        className={`flex flex-col items-center justify-center w-full min-h-48 border-2 ${dragging ? "border-blue-300" : "border-gray-300"} border-dashed rounded-lg ${disabled ? "cursor-not-allowed" : "cursor-pointer"} bg-gray-50 hover:bg-gray-100`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg
            className="w-8 h-8 mb-4 text-gray-5000"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 16"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
            />
          </svg>
          <p className="mb-2 text-sm text-gray-500 font-semibold">
            クリックかもしくはドラッグ&ドロップでファイル追加できます。
          </p>
          {description && <p className="text-xs text-gray-500">{description}</p>}
          <ul
            className="mt-4 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            {files.map(({ file, messages }, index) => (
              <li key={index} className="text-md text-gray-500 space-x-2 mb-2">
                <button onClick={() => onRemove?.(file)} className="underline hover:opacity-75">
                  削除
                </button>
                <span>{file.name}</span>
                {messages && messages?.length > 0 && (
                  <ul className="mt-1">
                    {messages.map((message, index) => (
                      <li key={index} className="text-sm font-bold text-red-500" role="alert">
                        {message}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
        <input
          id="dropzone-file"
          type="file"
          className="hidden"
          onChange={changeHandler}
          accept={accepts.join(",")}
          multiple
          disabled={disabled}
        />
      </label>
    </div>
  );
};
