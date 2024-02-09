import { parse } from "csv-parse/browser/esm/sync";

export const getBucket = ({ CMS_BUCKETS }: { CMS_BUCKETS: R2Bucket }) => {
  return {
    getTransactionMailReceivers: async (
      key: string,
    ): Promise<{ email: string; [k: string]: string }[]> => {
      const csvData = await CMS_BUCKETS.get(key);
      if (!csvData) throw new Error("csv file not found");
      const parsed = parse(removeBOM(await csvData.text()), { columns: true });

      if (!Array.isArray(parsed)) throw new Error("csv parse error");
      if (!parsed.every((item) => !item.email)) throw new Error("email not found in csv");

      return parsed;
    },

    removeTransactionMailReceivers: (key: string) => {
      return CMS_BUCKETS.delete(key);
    },
  };
};

const removeBOM = (text: string) => {
  const bom = "\uFEFF";
  if (text.startsWith(bom)) return text.slice(bom.length);
  return text;
};
