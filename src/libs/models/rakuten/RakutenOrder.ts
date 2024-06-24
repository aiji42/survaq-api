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
export const ORDER_STATUS = {
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

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

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

/**
 * 変更理由
 * 0: キャンセル申請
 * 1: キャンセル確定
 * 2: キャンセル完了
 * 3: キャンセル取消
 * 4: 変更申請
 * 5: 変更確定
 * 6: 変更完了
 * 7: 変更取消
 * 8: 注文確認
 * 9: 再決済手続き
 */
export const CHANGE_REASON = {
  CANCEL_REQUEST: 0,
  CANCEL_CONFIRMATION: 1,
  CANCEL_COMPLETED: 2,
  CANCEL_CANCEL: 3,
  CHANGE_REQUEST: 4,
  CHANGE_CONFIRMATION: 5,
  CHANGE_COMPLETED: 6,
  CHANGE_CANCEL: 7,
  ORDER_CONFIRMATION: 8,
  RE_PAYMENT: 9,
} as const;

type ChangeReason = (typeof CHANGE_REASON)[keyof typeof CHANGE_REASON];

/**
 * 0: 減額
 * 1: 増額
 * 2: その他
 * 10: 支払方法変更
 * 11: 支払方法変更・減額
 * 12: 支払方法変更・増額
 */
export const CHANGE_TYPE_DETAIL = {
  DECREASE: 0,
  INCREASE: 1,
  OTHER: 2,
  CHANGE_PAYMENT_METHOD: 10,
  CHANGE_PAYMENT_METHOD_DECREASE: 11,
  CHANGE_PAYMENT_METHOD_INCREASE: 12,
} as const;

export type ChangeTypeDetail = (typeof CHANGE_TYPE_DETAIL)[keyof typeof CHANGE_TYPE_DETAIL];

/**
 * 1: キャンセル
 * 2: 受取後の返品
 * 3: 長期不在による受取拒否
 * 4: 未入金
 * 5: 代引決済の受取拒否
 * 6: お客様都合 - その他
 * 8: 欠品
 * 10: 店舗様都合 - その他
 * 13: 発送遅延
 * 14: 顧客・配送対応注意表示
 * 15: 返品(破損・品間違い)
 */
export const CHANCE_REASON_DETAIL = {
  CANCEL: 1,
  RETURN_AFTER_RECEIPT: 2,
  REFUSAL_OF_RECEIPT_DUE_TO_LONG_ABSENCE: 3,
  UNPAID: 4,
  REFUSAL_OF_RECEIPT_BY_CASH_ON_DELIVERY_PAYMENT: 5,
  CUSTOMER_CONVENIENCE_OTHER: 6,
  OUT_OF_STOCK: 8,
  STORE_CONVENIENCE_OTHER: 10,
  SHIPPING_DELAY: 13,
  CUSTOMER_DELIVERY_ATTENTION: 14,
  RETURN_DAMAGE_OR_WRONG_ITEM: 15,
} as const;

type ChangeReasonDetail = (typeof CHANCE_REASON_DETAIL)[keyof typeof CHANCE_REASON_DETAIL];

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

type PackageModel = {
  ItemModelList: ItemModel[];
};

export type SkuModel = {
  variantId: string; // 管理番号
  merchantDefinedSkuId: string | null; // システム連携用SKU番号
  skuInfo: string | null; // SKU情報
};

type TaxSummaryModel = {
  taxRate: number; // 税率
  reqPrice: number; // 請求金額
  reqPriceTax: number; // 請求額に対する税額
  totalPrice: number; // 合計金額 (商品金額 + 送料 + ラッピング料)
  paymentCharge: number; // 決済手数料
  couponPrice: number; // クーポン利用額
  point: number; // 利用ポイント数
};

export type ItemModel = {
  itemDetailId: number; // 商品明細ID
  itemName: string; // 商品名
  itemId: number; // 商品ID
  manageNumber: string; // 管理番号
  price: number; // 単価
  priceTaxIncl: number; // 商品毎税込価格
  taxRate: number; // 商品税率
  units: number; // 数量
  includePostageFlag: 0 | 1; // 送料込フラグ
  includeTaxFlag: 0 | 1; // 税込フラグ
  includeCashOnDeliveryPostageFlag: 0 | 1; // 代引き手数料込フラグ
  SkuModelList: SkuModel[];
};

type ChangeReasonModel = {
  changeId: number; // 変更ID
  changeType: ChangeReason | null; // 変更種別
  changeTypeDetail: ChangeTypeDetail | null; // 変更種別詳細
  changeReason: 0 | 1 | null; // 変更理由 (0: 店舗都合, 1: 顧客都合)
  changeReasonDetail: ChangeReasonDetail | null; // 変更理由詳細
  changeApplyDatetime: string | null; // 変更申請日時
  changeFixDatetime: string | null; // 変更確定日時
  changeCmplDatetime: string | null; // 変更完了日時
};

type OrdererModel = {
  familyName: string; // 姓
  firstName: string; // 名
  emailAddress: string; // メールアドレス
};

// https://webservice.rms.rakuten.co.jp/merchant-portal/view/ja/common/1-1_service_index/rakutenpayorderapi/getorder
export type OrderModel = {
  orderNumber: string;
  orderProgress: OrderStatus;
  orderDatetime: string; // 注文日時
  shopOrderCfmDatetime: string | null; //注文確認日時
  orderFixDatetime: string | null; // 注文確定日時
  shippingInstDatetime: string | null; // 発送指示日時
  shippingCmplRptDatetime: string | null; // 発送完了報告日時
  cancelDueDate: string | null; // キャンセル期限日
  goodsPrice: number; // 商品合計金額
  goodsTax: number; // 外税合計 (deprecated)
  postagePrice: number; // 送料合計
  deliveryPrice: number; // 代引合計
  paymentCharge: number; // 決済手数料
  totalPrice: number; // 合計金額 (商品金額 + 送料 + ラッピング料)
  requestPrice: number; // 請求金額 (商品金額 + 送料 + ラッピング料 + 決済手数料 + 注文者負担金 - クーポン利用総額 - ポイント利用額)
  couponAllTotalPrice: number; // クーポン利用総額
  PackageModelList: PackageModel[];
  TaxSummaryModelList: TaxSummaryModel[] | null;
  ChangeReasonModelList: ChangeReasonModel[] | null;
  OrdererModel: OrdererModel;
};

type RakutenOrderDetailResponse = {
  MessageModelList: (MessageModel & {
    orderNumber: string | null;
  })[];
  version: number;
  OrderModelList: OrderModel[] | null;
};

export class RakutenOrder extends RakutenClient {
  static searchEndpoint = "https://api.rms.rakuten.co.jp/es/2.0/order/searchOrder/";
  static detailEndpoint = "https://api.rms.rakuten.co.jp/es/2.0/order/getOrder/";

  // MEMO: https://webservice.rms.rakuten.co.jp/merchant-portal/view/ja/common/1-1_service_index/rakutenpayorderapi/searchorder
  async search(params: {
    statuses?: OrderStatus[];
    dateType: SearchDateType;
    begin: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    end: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 100, 100); // 仕様上は1000件まで指定可能だが、detailEndpointは100件までしか取得できないので100件に制限
    const startDatetime = params.begin.includes("T")
      ? `${params.begin}+0900`
      : `${params.begin}T00:00:00+0900`;
    const endDatetime = params.end.includes("T")
      ? `${params.end}+0900`
      : `${params.end}T23:59:59+0900`;

    const body = {
      orderProgressList: params.statuses,
      dateType: params.dateType,
      startDatetime,
      endDatetime,
      PaginationRequestModel: {
        requestRecordsAmount: limit,
        requestPage: page,
      },
    };

    const res = await this.jsonPost<RakutenOrderSearchResponse>(RakutenOrder.searchEndpoint, body);
    const error = res.MessageModelList.find((m) => m.messageType === "ERROR");
    if (error) throw new Error(`${error.messageCode}: ${error.message}`);

    const orderNumbers = res.orderNumberList ?? [];
    const hasNext = res.PaginationResponseModel?.totalPages
      ? page < res.PaginationResponseModel.totalPages
      : false;
    const pagination = {
      hasNext,
      page,
      totalCount: res.PaginationResponseModel?.totalRecordsAmount ?? 0,
      nextParams: hasNext ? { ...params, page: page + 1 } : undefined,
    };

    if (!orderNumbers.length) return { pagination, data: [] };

    const data = await this.getDetails(orderNumbers);
    return { pagination, data };
  }

  // 最大100件まで同時に取得可能
  async getDetails(orderNumbers: string[]) {
    const body = {
      orderNumberList: orderNumbers,
      version: 7,
    };

    const res = await this.jsonPost<RakutenOrderDetailResponse>(RakutenOrder.detailEndpoint, body);
    const error = res.MessageModelList.find((m) => m.messageType === "ERROR");
    if (error) throw new Error(`${error.messageCode}: ${error.message}`);

    return res.OrderModelList ?? [];
  }

  async getDetailsOne(orderNumber: string) {
    return this.getDetails([orderNumber]).then((res) => res[0]);
  }
}
