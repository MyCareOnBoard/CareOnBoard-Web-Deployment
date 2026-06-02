export type DateRangeValues = {
  startDate: string;
  endDate: string;
};

export const DEFAULT_DATE_RANGE: DateRangeValues = {
  startDate: "2026-04-07",
  endDate: "2026-04-10",
};

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
  description?: string;
};

export type OverviewStatWithTrend = {
  id: string;
  value: string;
  label: string;
  trend: number;
  positive: boolean;
};

export type RecentActivity = {
  id: string;
  date: string;
  module: string;
  description: string;
  amount: number;
  status: "pending" | "paid" | "rejected";
};
