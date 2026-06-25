export type RecentClaim = {
  id: string;
  client: string;
  clientId?: string;
  clientAvatarUrl?: string;
  staffId: string;
  staffName?: string;
  serviceCode: string;
  paNumber: string;
  serviceDate: string;
  serviceDateSortKey?: string;
  durationStart: string;
  durationEnd: string;
  totalHours: string;
  rate: string;
  sourceType?: "shift" | "ride";
  sourceId?: string;
  weekRange?: string | null;
  /** Out-of-pocket clients bill an invoice instead of a state claim. */
  billingDirection?: "claims" | "out-of-pocket";
};
