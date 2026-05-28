import type { DonutSegment, OverviewStatWithTrend, RecentActivity } from "../../shared/types";

export const OVERVIEW_STATS: OverviewStatWithTrend[] = [
  {
    id: "total-revenue",
    value: "$124,800",
    label: "Total revenue",
    trend: 10.5,
    positive: true,
  },
  {
    id: "claims-submitted",
    value: "86",
    label: "Claims submitted",
    trend: 2,
    positive: true,
  },
  {
    id: "paid-claims",
    value: "72",
    label: "Paid claims",
    trend: 10.5,
    positive: false,
  },
  {
    id: "rejected-claims",
    value: "4",
    label: "Rejected claims",
    trend: 10.5,
    positive: true,
  },
  {
    id: "claims-at-risk",
    value: "$18,540",
    label: "Claims at risk",
    trend: 10.5,
    positive: true,
  },
];

export const CLAIMS_BY_STATUS_TOTAL = 172;

export const CLAIMS_BY_STATUS_CHART_SEGMENTS: DonutSegment[] = [
  { label: "Other clients", value: 86, color: "#22c55e" },
  { label: "Pending claims", value: 10, color: "#f97316" },
  { label: "Paid claims", value: 72, color: "#3b82f6" },
  { label: "Rejected claims", value: 4, color: "#ef4444" },
];

export const CLAIMS_BY_STATUS_LEGEND: DonutSegment[] = [
  { label: "Paid claims", value: 72, color: "#3b82f6" },
  { label: "Rejected claims", value: 4, color: "#ef4444" },
  { label: "Pending claims", value: 10, color: "#f97316" },
];

export const PAYROLL_SUMMARY_TOTAL = 52;

export const PAYROLL_SUMMARY_SEGMENTS: DonutSegment[] = [
  { label: "Paid", value: 32, color: "#22c55e" },
  { label: "Pending", value: 10, color: "#3b82f6" },
  { label: "Overtime", value: 10, color: "#f97316" },
];

export const RECENT_ACTIVITY: RecentActivity[] = [
  {
    id: "1",
    date: "February 11, 2014",
    module: "Claim",
    description: "Claim for cameron submitted",
    amount: 123098,
  },
  {
    id: "2",
    date: "April 28, 2016",
    module: "Payroll",
    description: "Payroll for Fred fafa has been approved",
    amount: 566776,
  },
  {
    id: "3",
    date: "May 12, 2019",
    module: "Claim",
    description: "Claim 2234323 rejected",
    amount: 678987,
  },
  {
    id: "4",
    date: "November 7, 2017",
    module: "Claim",
    description: "Claim for will bane submitted",
    amount: 123456,
  },
];
