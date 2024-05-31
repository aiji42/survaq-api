import { RakutenClient } from "./RakutenClient";

/**
 * 注文ステータス
 * https://webservice.rms.rakuten.co.jp/merchant-portal/view/ja/common/1-1_service_index/rakutenpayorderapi/searchorder
 * 100: 注文確認待ち
 * 200: 楽天処理中
 * 300: 発送待ち
 * 400: 変更確定待ち
 * 500: 発送済
 * 600: 支払手続き中
 * 700: 支払手続き済
 * 800: キャンセル確定待ち
 * 900: キャンセル確定
 */
const ORDER_STATUS = {
  WAITING_CONFIRMATION: 100,
  RAKUTEN_PROCESSING: 200,
  WAITING_SHIPMENT: 300,
  WAITING_CHANGE_CONFIRMATION: 400,
  SHIPPED: 500,
  PAYMENT_PROCESSING: 600,
  PAYMENT_PROCESSED: 700,
  WAITING_CANCEL_CONFIRMATION: 800,
  CANCEL_CONFIRMED: 900,
} as const;

type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/**
 * 期間検索種別
 * 1: 注文日
 * 2: 注文確認日
 * 3: 注文確定日
 * 4: 発送日
 * 5: 発送完了報告日
 * 6: 決済確定日
 */
export const SEARCH_DATE_TYPE = {
  ORDER_DATE: 1,
  ORDER_CONFIRMATION_DATE: 2,
  ORDER_FIX_DATE: 3,
  SHIPMENT_DATE: 4,
  SHIPMENT_REPORT_DATE: 5,
  PAYMENT_CONFIRMATION_DATE: 6,
} as const;

type SearchDateType = (typeof SEARCH_DATE_TYPE)[keyof typeof SEARCH_DATE_TYPE];

type MessageModel = {
  messageType: "INFO" | "ERROR" | "WARNING";
  messageCode: string; // https://webservice.rms.rakuten.co.jp/merchant-portal/view/ja/common/1-1_service_index/rakutenpayorderapi/rakutenpaymsgcodereference
  message: string;
};

type PaginationResponseModel = {
  totalRecordsAmount: number | null;
  totalPages: number | null;
  requestPage: number | null;
};

type RakutenOrderSearchResponse = {
  MessageModelList: MessageModel[];
  PaginationResponseModel: PaginationResponseModel | null;
  orderNumberList: string[] | null;
};

export class RakutenOrder extends RakutenClient {
  static searchEndpoint = "https://api.rms.rakuten.co.jp/es/2.0/order/searchOrder/";

  // MEMO: https://webservice.rms.rakuten.co.jp/merchant-portal/view/ja/common/1-1_service_index/rakutenpayorderapi/searchorder
  async search(params: {
    statuses?: OrderStatus[];
    dateType: SearchDateType;
    beginDate: string; // YYYY-MM-DD
    endDate: string; //  // YYYY-MM-DD
    page?: number;
  }) {
    const body = {
      orderProgressList: params.statuses,
      dateType: params.dateType,
      startDatetime: `${params.beginDate}T00:00:00+0900`,
      endDatetime: `${params.endDate}T23:59:59+0900`,
      PaginationRequestModel: {
        requestRecordsAmount: 100, // 1000件まで指定可能
        requestPage: params.page ?? 1,
      },
    };

    return this.jsonPost<RakutenOrderSearchResponse>(RakutenOrder.searchEndpoint, body);
  }
}
