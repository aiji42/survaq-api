import { AmazonClient } from "./AmazonClient";
import { parse } from "csv-parse/browser/esm/sync";

type CreateReportResponse = {
  reportId: string;
};

type CheckReportResponse = {
  reportId: string;
  reportDocumentId: string;
  processingStatus: "IN_QUEUE" | "IN_PROGRESS" | "DONE" | "FATAL" | "CANCELLED";
};

type ReportDocument = {
  reportDocumentId: string;
  url: string;
  compressionAlgorithm?: string;
};

export class AmazonItem extends AmazonClient {
  static reportEndpoint = "https://sellingpartnerapi-fe.amazon.com/reports/2021-06-30/reports";
  static reportDocumentEndpoint =
    "https://sellingpartnerapi-fe.amazon.com/reports/2021-06-30/documents/{reportDocumentId}";

  async createItemsReport() {
    const url = new URL(AmazonItem.reportEndpoint);

    return await this.post<CreateReportResponse>(url, {
      reportType: "GET_MERCHANT_LISTINGS_ALL_DATA",
      marketplaceIds: [this.marketplaceId],
    });
  }

  async checkReport(reportId: string) {
    const url = new URL(`${AmazonItem.reportEndpoint}/${reportId}`);
    return await this.request<CheckReportResponse>(url);
  }

  async downloadReport<T>(reportId: string) {
    const { reportDocumentId, processingStatus } = await this.checkReport(reportId);
    if (processingStatus !== "DONE") throw new Error(`Report is not ready: ${processingStatus}`);

    const { url } = await this.request<ReportDocument>(
      new URL(AmazonItem.reportDocumentEndpoint.replace("{reportDocumentId}", reportDocumentId)),
    );
    const csv = await fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        const decoder = new TextDecoder("shift-jis");
        return decoder.decode(buffer);
      });

    // CSVをJSONに変換して返す
    return parse(csv, { columns: true, delimiter: `\t` }) as T;
  }
}
