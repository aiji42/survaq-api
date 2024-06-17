import { CsvData, csvSchema } from "../schema";
import { useCallback, useMemo, useReducer, useState } from "react";
import { ImportableData } from "../../../../../libs/models/smart-shopping/SmartShoppingPerformanceSync";
import Papa from "papaparse";

export type State = {
  rows: ImportableData;
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
      const rows = action.payload.rows.map((row) => ({
        date: row["日"],
        merchantCenterId: row["アイテム ID"],
        name: row["商品名"],
        currencyCode: row["通貨コード"],
        cost: row["費用"],
      }));
      return {
        errors: {},
        rows,
      };
    case "SET_ERRORS":
      return {
        rows: [],
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

export const useCSV = () => {
  const [data, dispatch] = useReducer(reducer, {
    rows: [],
    errors: {},
  });

  const [files, onUpload] = useState<File[]>([]);

  const onRemove = useCallback(() => onUpload([]), []);

  useMemo(() => {
    dispatch({ type: "RESET" });
    const file = files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // encoding: "Shift_JIS",
      // FIXME: skipFirstNLinesがリリースされたら置き換える
      beforeFirstChunk: (chunk) => [...chunk.split("\n").slice(2)].join("\n"),
      complete: (result) => {
        if (result.errors.length) {
          console.error(result.errors);
          dispatch({
            type: "SET_ERRORS",
            payload: {
              fileName: file.name,
              errors: [
                "取り込み可能なスマートショッピングの広告データのCSVファイルではありません。",
              ],
            },
          });
          return;
        }

        const parsed = csvSchema.safeParse(result.data);
        console.log(parsed.error?.issues);
        if (parsed.error) {
          console.error(parsed.error);
          dispatch({
            type: "SET_ERRORS",
            payload: {
              fileName: file.name,
              errors: [
                "データが正しくありません。",
                ...parsed.error.issues.map(({ message }) => message),
              ],
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
  }, [files]);

  return { data: data.rows, errors: data.errors, files, onUpload, onRemove };
};
