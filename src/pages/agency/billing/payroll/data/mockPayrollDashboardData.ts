import type { BillingOverviewStat } from "../../components/types";

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
  description?: string;
};

export type OvertimeAlert = {
  id: string;
  staffName: string;
  overtimeHours: string;
};

export type DuePayrollEntry = {
  id: string;
  staffName: string;
  staffId: string;
  hoursWorked: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  paymentDetails: string;
  paRate: string;
};

export const DEFAULT_DATE_RANGE = {
  startDate: "2026-04-07",
  endDate: "2026-04-10",
};

export const OVERVIEW_STATS: BillingOverviewStat[] = [
  { id: "total-due", value: "$24,870", label: "Total payroll due" },
  { id: "pending-hours", value: "160.50", label: "Hours pending approval" },
  { id: "overtime", value: "25.75", label: "Overtime hours" },
  { id: "missing-timesheet", value: "4", label: "Missing timesheet" },
  { id: "upcoming-payout", value: "May 31, 2024", label: "Upcoming payout" },
];

export const PAYROLL_SUMMARY_TOTAL = 52;

export const PAYROLL_SUMMARY_SEGMENTS: DonutSegment[] = [
  { label: "Paid", value: 42, color: "#22c55e" },
  { label: "Pending", value: 10, color: "#3b82f6" },
];

export const PAYROLL_SUMMARY_LEGEND: DonutSegment[] = [
  { label: "Paid", value: 42, color: "#22c55e" },
  { label: "Pending", value: 10, color: "#3b82f6" },
];

export const TOP_OVERTIME_ALERTS: OvertimeAlert[] = [
  { id: "1", staffName: "Leslie Alexander", overtimeHours: "8.5hrs" },
  { id: "2", staffName: "Adjoa Serwaa", overtimeHours: "18.68 Hrs" },
  { id: "3", staffName: "Wade Warren", overtimeHours: "12.25 Hrs" },
  { id: "4", staffName: "Darlene Robertson", overtimeHours: "6.40 Hrs" },
];

export const DUE_PAYROLL_ENTRIES: DuePayrollEntry[] = [
  {
    id: "1",
    staffName: "Cameron Williams",
    staffId: "43756",
    hoursWorked: "65.90 Hrs",
    dateRangeStart: "5/7/26",
    dateRangeEnd: "5/14/26",
    paymentDetails: "MasterCard | 3948",
    paRate: "$12.50/hr",
  },
  {
    id: "2",
    staffName: "Leslie Alexander",
    staffId: "38291",
    hoursWorked: "48.25 Hrs",
    dateRangeStart: "5/7/26",
    dateRangeEnd: "5/14/26",
    paymentDetails: "Visa | 8214",
    paRate: "$12.50/hr",
  },
  {
    id: "3",
    staffName: "Adjoa Serwaa",
    staffId: "51903",
    hoursWorked: "72.15 Hrs",
    dateRangeStart: "5/7/26",
    dateRangeEnd: "5/14/26",
    paymentDetails: "Direct Deposit",
    paRate: "$13.00/hr",
  },
  {
    id: "4",
    staffName: "Wade Warren",
    staffId: "29471",
    hoursWorked: "55.00 Hrs",
    dateRangeStart: "5/7/26",
    dateRangeEnd: "5/14/26",
    paymentDetails: "MasterCard | 6721",
    paRate: "$12.50/hr",
  },
  {
    id: "5",
    staffName: "Darlene Robertson",
    staffId: "64128",
    hoursWorked: "40.00 Hrs",
    dateRangeStart: "5/7/26",
    dateRangeEnd: "5/14/26",
    paymentDetails: "Visa | 1093",
    paRate: "$11.75/hr",
  },
];
