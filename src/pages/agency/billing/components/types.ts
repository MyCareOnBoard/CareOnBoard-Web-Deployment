import type { ComponentType, ReactNode } from "react";

export type BillingDateRangeValues = {
  startDate: string;
  endDate: string;
};

export type BillingOverviewStat = {
  id: string;
  value: string;
  label: string;
  count?: number;
  icon?: ComponentType<{ className?: string }>;
  /** Shown next to the value (a trend or status pill). */
  extra?: ReactNode;
  /** One line under the tile. */
  footnote?: ReactNode;
};
