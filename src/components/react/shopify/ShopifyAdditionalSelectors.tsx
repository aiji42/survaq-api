import React, { FC, useMemo, useReducer } from "react";
import { SkuSelector } from "./SkuSelector";
import { Product, useProductData } from "./hooks/useProductData";
import { useVariantId } from "./hooks/useVariantId";
import { latest } from "../../../libs/makeSchedule";
import { ScheduleCaution } from "./ScheduleCaution";

type Props = {
  productId: string;
  initialVariantId: string;
};

export const ShopifyAdditionalSelectors: FC<Props> = ({ productId, initialVariantId }) => {
  const product = useProductData(productId);
  const variantId = useVariantId(initialVariantId);

  const [{ selectedSkus, baseSkus }, dispatch] = useReducer(
    makeReducer(product),
    initialReducer(product, variantId),
  );

  useMemo(() => dispatch({ type: "changeVariant", payload: { variantId } }), [variantId]);

  const variant = getVariantByVariantId(product, variantId);

  const schedule = latest([
    product.schedule,
    variant.schedule,
    ...selectedSkus.map((code) => getSkuByCode(product, code).schedule),
  ]);

  return (
    <div>
      {variant.skuGroups.map(({ skuGroupCode, label }, index) => {
        const options = getSKUsByGroupCode(product, skuGroupCode).map<{
          code: string;
          name: string;
        }>((code) => ({
          code,
          name: getSkuByCode(product, code).name,
        }));
        return (
          <SkuSelector
            label={label}
            code={selectedSkus[index] ?? ""}
            options={options}
            onChange={(value) => dispatch({ type: "selectedSKU", payload: { index, value } })}
            key={index}
          />
        );
      })}
      <input
        name="properties[_skus]"
        type="hidden"
        value={JSON.stringify([...selectedSkus, ...baseSkus])}
      />
      {[...selectedSkus, ...baseSkus].map((sku, index) => (
        <input key={index} name={`properties[_sku${index + 1}]`} type="hidden" value={sku} />
      ))}
      {schedule &&
        schedule.text !== product.schedule.text &&
        document.documentElement.lang === "ja" && (
          <ScheduleCaution
            message={
              <>
                &quot;配送予定：{schedule.text.replace(/(\d{4}|年)/g, "")}
                &quot;の商品が含まれております。
                <br />
                ※2点以上ご注文の場合、全て揃った時点でまとめて発送
              </>
            }
          />
        )}
    </div>
  );
};

const getSKUsByGroupCode = (product: Product, code: string) => {
  return product.skuGroups[code] ?? [];
};

const getVariantByVariantId = (product: Product, variantId: string) => {
  const variant = product.variants.find((v) => v.variantId === variantId);
  if (!variant) throw new Error("variant not found");
  return variant;
};

const getSkuByCode = (product: Product, code: string) => {
  const sku = product.skus[code];
  if (!sku) throw new Error("sku not found");
  return sku;
};

type Actions =
  | { type: "selectedSKU"; payload: { index: number; value: string } }
  | { type: "changeVariant"; payload: { variantId: string } };

type State = { selectedSkus: string[]; baseSkus: string[] };

const initialReducer = (product: Product, variantId: string): State => {
  const variant = getVariantByVariantId(product, variantId);
  return {
    selectedSkus: variant.skuGroups.flatMap(({ skuGroupCode }) => {
      const skus = getSKUsByGroupCode(product, skuGroupCode);
      return skus[0] ?? [];
    }),
    baseSkus: variant.skus,
  };
};

const makeReducer = (product: Product) => (state: State, action: Actions) => {
  if (action.type === "selectedSKU") {
    const selectedSkus = [...state.selectedSkus];
    selectedSkus[action.payload.index] = action.payload.value;
    return { ...state, selectedSkus };
  } else {
    const variant = getVariantByVariantId(product, action.payload.variantId);
    const selectedSkus = variant.skuGroups.flatMap(({ skuGroupCode }, index) => {
      const skus = getSKUsByGroupCode(product, skuGroupCode);
      const selectedCode = state.selectedSkus[index];
      // すでに選択されているSKUが新しいバリアントのSKUに含まれている場合はそのSKUを維持する
      if (selectedCode && skus.includes(selectedCode)) return selectedCode;
      return skus[0] ?? [];
    });
    return { selectedSkus, baseSkus: variant.skus };
  }
};
