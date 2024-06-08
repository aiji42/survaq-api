import { CsvData, csvSchema } from "../schema";
import Papa from "papaparse";
import { useCallback, useMemo, useReducer, useState } from "react";

export type State = {
  rows: {
    key: string;
    date: string;
    itemId: string;
    clicks: number;
    impressions: number;
    cost: number;
    cpc: number;
    ctr: number;
  }[];
  errors: {
    [fileName: string]: string[];
  };
};

type Action =
  | {
      type: "SET_DATA";
      payload: {
        fileName: string;
        rows: CsvData;
      };
    }
  | {
      type: "SET_ERRORS";
      payload: {
        fileName: string;
        errors: string[];
      };
    }
  | {
      type: "RESET";
    };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_DATA":
      const newRows = action.payload.rows.map((row) => ({
        key: `${row.日付}-${row.商品管理番号}`,
        date: row.日付,
        itemId: row.商品管理番号,
        clicks: row["クリック数(合計)"],
        impressions: Math.round(row["クリック数(合計)"] / row["CTR(%)"]),
        cost: row["実績額(合計)"],
        cpc: row["CPC実績(合計)"],
        ctr: row["CTR(%)"],
      }));
      // keyが既存の行と重複している場合はエラーを返す
      const existingKeys = state.rows.map((row) => row.key);
      const keys = newRows.map((row) => row.key);
      console.log(existingKeys, keys);
      if (existingKeys.some((key) => keys.includes(key))) {
        return {
          ...state,
          errors: {
            ...state.errors,
            [action.payload.fileName]: ["他のファイルと重複する行があります"],
          },
        };
      }

      return {
        ...state,
        rows: [...state.rows, ...newRows].sort((a, b) => a.key.localeCompare(b.key)),
      };

    case "SET_ERRORS":
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.fileName]: action.payload.errors,
        },
      };

    case "RESET":
      return {
        rows: [],
        errors: {},
      };
  }
};

export const useCSVs = () => {
  const [data, dispatch] = useReducer(reducer, {
    rows: [],
    errors: {},
  });

  const [files, onUpload] = useState<File[]>([]);
  const onRemove = useCallback(
    (file: File) => {
      onUpload(files.filter((f) => f !== file));
    },
    [files],
  );

  useMemo(() => {
    dispatch({ type: "RESET" });
    files.forEach((file) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "Shift_JIS",
        // FIXME: skipFirstNLinesがリリースされたら置き換える
        beforeFirstChunk: (chunk) => [...chunk.split("\n").slice(6)].join("\n"),
        complete: (result) => {
          if (result.errors.length) {
            console.error(result.errors);
            dispatch({
              type: "SET_ERRORS",
              payload: {
                fileName: file.name,
                errors: ["取り込み可能な楽天の広告データのCSVファイルではありません。"],
              },
            });
            return;
          }

          const parsed = csvSchema.safeParse(result.data);
          if (parsed.error) {
            console.error(parsed.error);
            dispatch({
              type: "SET_ERRORS",
              payload: {
                fileName: file.name,
                errors: ["想定されている形式と異なるデータが含まれています。"],
              },
            });
            return;
          }

          dispatch({
            type: "SET_DATA",
            payload: {
              fileName: file.name,
              rows: parsed.data,
            },
          });
        },
      });
    });
  }, [files]);

  return { data: data.rows, errors: data.errors, files, onUpload, onRemove };
};
