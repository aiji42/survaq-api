import React, { FC, ReactNode } from "react";

type Props = {
  message: ReactNode;
};

export const ScheduleCaution: FC<Props> = ({ message }) => {
  return (
    <p className="product-form__description-message" role="status" aria-live="polite">
      {message}
    </p>
  );
};
