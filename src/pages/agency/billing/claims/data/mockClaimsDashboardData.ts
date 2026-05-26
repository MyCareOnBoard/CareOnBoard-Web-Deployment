export type OverviewStat = {
  id: string;
  value: string;
  label: string;
  count: number;
};

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
  description?: string;
};

export type RecentClaim = {
  id: string;
  client: string;
  clientAvatarUrl?: string;
  staffId: string;
  serviceCode: string;
  paNumber: string;
  serviceDate: string;
  durationStart: string;
  durationEnd: string;
  totalHours: string;
  rate: string;
};

export const DEFAULT_DATE_RANGE = {
  startDate: "2026-04-07",
  endDate: "2026-04-10",
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

export const RECENT_CLAIMS: RecentClaim[] = [
  {
    id: "1",
    client: "Cameron Williamson",
    clientAvatarUrl: "/placeholder-avatar.jpg",
    staffId: "43756",
    serviceCode: "LE1 4NR",
    paNumber: "HA9 9HF",
    serviceDate: "April 7, 2026",
    durationStart: "7:00 AM",
    durationEnd: "02:00 PM",
    totalHours: "7",
    rate: "$12.50/hr",
  },
  {
    id: "2",
    client: "Jerome Bell",
    staffId: "43789",
    serviceCode: "LE1 4NR",
    paNumber: "SW1A 1AA",
    serviceDate: "April 7, 2026",
    durationStart: "8:00 AM",
    durationEnd: "10:00 AM",
    totalHours: "2",
    rate: "$12.50/hr",
  },
  {
    id: "3",
    client: "Eleanor Pena",
    staffId: "43801",
    serviceCode: "LE2 3AB",
    paNumber: "EC1A 1BB",
    serviceDate: "April 8, 2026",
    durationStart: "9:00 AM",
    durationEnd: "10:30 AM",
    totalHours: "1.5",
    rate: "$12.50/hr",
  },
  {
    id: "4",
    client: "Robert Fox",
    staffId: "43812",
    serviceCode: "LE1 4NR",
    paNumber: "W1A 0AX",
    serviceDate: "April 8, 2026",
    durationStart: "7:30 AM",
    durationEnd: "11:30 AM",
    totalHours: "4",
    rate: "$12.50/hr",
  },
  {
    id: "5",
    client: "Leslie Alexander",
    staffId: "43825",
    serviceCode: "LE3 1CD",
    paNumber: "M1 1AE",
    serviceDate: "April 9, 2026",
    durationStart: "10:00 AM",
    durationEnd: "04:00 PM",
    totalHours: "6",
    rate: "$12.50/hr",
  },
  {
    id: "6",
    client: "Marvin McKinney",
    staffId: "43830",
    serviceCode: "LE1 4NR",
    paNumber: "B1 1BB",
    serviceDate: "April 10, 2026",
    durationStart: "6:00 AM",
    durationEnd: "12:00 PM",
    totalHours: "6",
    rate: "$12.50/hr",
  },
];
