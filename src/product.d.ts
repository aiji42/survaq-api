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
    deliverySchedule: string;
  }>;
};

declare type Variant = {
  fieldId: string;
  productId?: string;
  variantId: string;
  variantName: string;
  skus: { code: string; name: string; subName: string }[];
  skuSelectable: number;
};

declare type PageData = {
  title?: string;
  description?: string;
  customHead?: string;
  logo?: Image;
  favicon?: Image;
  body?: string;
  customBody?: string;
  productId?: string;
  domain?: string;
  ogpImageUrl?: string;
  ogpShortTitle?: string;
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
};
