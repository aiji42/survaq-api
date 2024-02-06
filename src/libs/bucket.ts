import { parse } from "csv-parse/browser/esm/sync";

export const getBucket = ({ CMS_BUCKETS }: { CMS_BUCKETS: R2Bucket }) => {
  return {
    getTransactionMailReceivers: async (
      key: string,
    ): Promise<{ email: string; [k: string]: string }[]> => {
      const csvData = await CMS_BUCKETS.get(key);
      if (!csvData) throw new Error("csv file not found");
      return parse(removeBOM(await csvData.text()), { columns: true });
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
