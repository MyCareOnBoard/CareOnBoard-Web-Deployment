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
  /** Per-line billing coverage + which legs still need billing (see src/lib/coverage.ts). */
  coverage?: import("@/lib/coverage").Coverage;
  needsClaim?: boolean;
  needsInvoice?: boolean;
};
