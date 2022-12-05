declare type DeliverySchedule = `20${2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}${
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9}-${
  | "01"
  | "02"
  | "03"
  | "04"
  | "05"
  | "06"
  | "07"
  | "08"
  | "09"
  | "10"
  | "11"
  | "12"}-${"early" | "middle" | "late"}`;

declare type Foundation = {
  fieldId: string;
  totalPrice: number;
  closeOn: string;
  supporter?: number;
};

declare type Rule = {
  fieldId: string;
  customSchedules: Array<{
    beginOn: string;
    endOn: string;
    deliverySchedule: DeliverySchedule;
  }>;
};

declare type Variant = {
  fieldId: string;
  productId?: string;
  variantId: string;
  variantName: string;
  skus: {
    code: string;
    name: string;
    subName: string;
    deliverySchedule?: DeliverySchedule;
  }[];
  skuSelectable: number;
  deliverySchedule?: DeliverySchedule;
};

declare type PageData = {
  title?: string;
  description?: string;
  customHead?: string;
  logo?: Image;
  favicon?: Image;
  productHandle?: string;
  customBody?: string;
  productId?: string;
  domain?: string;
  ogpImageUrl?: string;
  ogpShortTitle?: string;
  buyButton: string;
};

declare type Image = {
  url: string;
  height: number;
  width: number;
};

declare type ProductOnMicroCMS = {
  id: string;
  productIds: string;
  productCode: string;
  productName: string;
  variants?: Array<Variant>;
  skuLabel?: string;
  foundation: Foundation;
  rule: Rule;
  pageData?: PageData;
  pageDataSub?: PageData;
};
