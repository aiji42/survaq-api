import { FC, useEffect } from "react";
import { useProductData } from "./hooks/useProductData";

type Props = {
  productId: string;
};

export const FuncReplaceScheduleText: FC<Props> = ({ productId }) => {
  const product = useProductData(productId);

  useEffect(() => {
    Array.from(document.querySelectorAll<HTMLSpanElement>(".delivery-schedule")).forEach((t) => {
      const short = !!t.dataset["short"];
      t.innerText = short
        ? product.schedule.text.replace(/(\d{4}|年)/g, "")
        : product.schedule.text;
    });
  }, []);

  return null;
};
