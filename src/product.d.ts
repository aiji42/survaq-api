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

declare type ProductOnMicroCMS = {
  id: string;
  productIds: string;
  productCode: string;
  productName: string;
  variants?: Array<Variant>;
  skuLabel?: string;
  foundation: Foundation;
  rule: Rule;
};
