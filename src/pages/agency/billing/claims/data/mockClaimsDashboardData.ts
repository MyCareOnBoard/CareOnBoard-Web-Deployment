import type { ClaimReportPrefillSnapshot } from "../utils/claimReportPrefillUtils";
import type { DonutSegment } from "../../shared/types";

export type { DonutSegment };
export { DEFAULT_DATE_RANGE } from "../../shared/types";

export type OverviewStat = {
  id: string;
  value: string;
  label: string;
  count: number;
};

export type RecentClaim = {
  id: string;
  client: string;
  clientId?: string;
  clientAvatarUrl?: string;
  staffId: string;
  serviceCode: string;
  paNumber: string;
  serviceDate: string;
  durationStart: string;
  durationEnd: string;
  totalHours: string;
  rate: string;
  reportPrefill?: ClaimReportPrefillSnapshot;
};
export const OVERVIEW_STATS: OverviewStat[] = [
  { id: "submitted", value: "$124,820", label: "Claim submitted", count: 86 },
  { id: "pending", value: "$11,230", label: "Pending claims", count: 10 },
  { id: "paid", value: "$78,650", label: "Paid claims", count: 72 },
  { id: "rejected", value: "$2,870", label: "Rejected claims", count: 4 },
  { id: "at-risk", value: "$1,420", label: "Claims at risk", count: 3 },
];

export const CLAIMS_BY_STATUS_TOTAL = 172;

export const CLAIMS_BY_STATUS: DonutSegment[] = [
  { label: "Paid claims", value: 72, color: "#3b82f6", description: "Claims successfully paid" },
  { label: "Pending claims", value: 10, color: "#f97316", description: "Claims awaiting processing" },
  { label: "Rejected claims", value: 4, color: "#ef4444", description: "Claims rejected by payer" },
  { label: "Other clients", value: 86, color: "#22c55e", description: "Remaining client claims" },
];

export const REJECTION_TOTAL = 4;

export const TOP_REJECTION_REASONS: DonutSegment[] = [
  { label: "Missing EVV", value: 2, color: "#ef4444", description: "Electronic visit verification missing" },
  { label: "Invalid authorization", value: 1, color: "#f97316", description: "Authorization number invalid or expired" },
  { label: "Missing diagnostic patient", value: 1, color: "#3b82f6", description: "Diagnostic patient information missing" },
];
