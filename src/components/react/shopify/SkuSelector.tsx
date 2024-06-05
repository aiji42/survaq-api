import React, { FC, useId } from "react";

type Props = {
  label: string;
  code: string;
  options: { code: string; name: string }[];
  onChange: (value: string) => void;
  index: number;
};

export const SkuSelector: FC<Props> = ({ label, code, onChange, options, index }) => {
  const id = useId();
  return (
    <p className="product-form__item">
      <label htmlFor={id}>{label}</label>
      <select
        value={code}
        className="product-form__input"
        id={id}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>
      <input
        type="hidden"
        name={`properties[${label}]`}
        value={options.find((o) => o.code === code)?.name ?? ""}
      />
      <input type="hidden" name={`properties[_sku[${index + 1}]]`} value={code} />
    </p>
  );
};
