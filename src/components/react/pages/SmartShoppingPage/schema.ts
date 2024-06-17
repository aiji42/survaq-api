import { z } from "zod";

export const csvRowSchema = z.object({
  日: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  "アイテム ID": z.string(),
  商品名: z.string(),
  通貨コード: z.string(),
  費用: z.string().regex(/^\d+$/).transform(Number),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

export const csvSchema = z.array(csvRowSchema);

export type CsvData = z.infer<typeof csvSchema>;
