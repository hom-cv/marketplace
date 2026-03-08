import type { ReactNode } from "react";
import shared from "@/styles/listPage.module.css";

interface DetailItemProps {
  label: string;
  children: ReactNode;
}

export function DetailItem({ label, children }: DetailItemProps) {
  return (
    <div>
      <p className={shared.detailLabel}>{label}</p>
      <p className={shared.detailValue}>{children}</p>
    </div>
  );
}
