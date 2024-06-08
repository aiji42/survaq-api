import { z } from "zod";

export const csvRowSchema = z.object({
  日付: z
    .string()
    .regex(/^\d{4}年\d{2}月\d{2}日～\d{4}年\d{2}月\d{2}日$/)
    .refine((value) => {
      // ～の前後が同じ日付であることを確認する(集計が各日であることを確認する)
      const [start, end] = value.split("～");
      return start === end;
    }, "日単位で集計されていなようです")
    .transform((value) => {
      const text = value.split("～")[0]!;
      const [year, month, day] = text.match(/\d+/g)!;
      return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
    }),
  商品管理番号: z.string(),
  "クリック数(合計)": z.string().regex(/^\d+$/).transform(Number),
  "CTR(%)": z
    .string()
    .regex(/^\d+\.\d+$/)
    .transform(Number),
  "実績額(合計)": z.string().regex(/^\d+$/).transform(Number),
  "CPC実績(合計)": z.string().regex(/^\d+$/).transform(Number),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

export const csvSchema = z.array(csvRowSchema);

export type CsvData = z.infer<typeof csvSchema>;
