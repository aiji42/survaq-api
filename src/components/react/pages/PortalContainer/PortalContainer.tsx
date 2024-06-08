import { FC, ReactNode } from "react";

type PortalContainerProps = {
  children: ReactNode;
  h1: string;
};

export const PortalContainer: FC<PortalContainerProps> = ({ children, h1 }) => {
  return (
    <div className="text-slate-900 p-4">
      <h1 className="text-xl font-bold mb-8">{h1}</h1>
      {children}
    </div>
  );
};
