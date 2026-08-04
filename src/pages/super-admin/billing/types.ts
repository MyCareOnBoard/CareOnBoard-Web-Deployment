export type BillingWorkspaceScope =
  | { kind: "network" }
  | { kind: "agency"; agencyId: string };

export type AgencyAware<T> = T & { agencyId: string; agencyName: string };

export type NetworkBillingJsonValue =
  | null
  | boolean
  | number
  | string
  | NetworkBillingJsonValue[]
  | { [key: string]: NetworkBillingJsonValue };

export type NetworkBillingPublicScope = {
  kind: "global" | "assigned";
  agencyCount: number;
};

export type NetworkBillingPage<T> = {
  rows: T[];
  total: number | null;
  nextCursor: string | null;
  hasMore: boolean;
  loadedCount?: number;
  totalsExact?: boolean;
  partialData?: { reason: string; exactTotalsAvailable: boolean } | null;
};

export type NetworkBillingAmount = { count: number; amount: number };
export type NetworkBillingNullableAmount = NetworkBillingAmount | null;

type NetworkBillingRowBase = AgencyAware<{ id: string }>;

export type NetworkBillingSavedClaimRow = NetworkBillingRowBase & {
  kind: "claim" | "invoice";
  sourceType?: never;
  amount: number;
  status?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  serviceCode?: string | null;
  createdAt?: NetworkBillingJsonValue;
  claimNumber?: string | null;
  invoiceNumber?: string | null;
  emailStatus?: string | null;
  payerName?: string | null;
  payerEmail?: string | null;
  serviceDate?: string | null;
  shiftCount?: number;
  rideCount?: number;
  emailedTo?: string | null;
  emailedAt?: NetworkBillingJsonValue;
  rejectionReason?: string | null;
};

type NetworkBillingReadyClaimBase = NetworkBillingRowBase & {
  kind?: never;
  sourceId: string;
  serviceCode: string;
  needsClaim: boolean;
  needsInvoice: boolean;
  coverage?: string | null;
  splitMode?: string | null;
  splitValue?: NetworkBillingJsonValue;
  claimId?: string | null;
  outOfPocketInvoiceId?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  clientAvatarUrl?: string | null;
  staffId?: string | null;
  staffName?: string | null;
  sortDate?: string | null;
  weekRange?: string | null;
};

export type NetworkBillingReadyShiftRow = NetworkBillingReadyClaimBase & {
  sourceType: "shift";
  paNumber?: string | null;
  shiftDate?: string | null;
  clockedInAt?: NetworkBillingJsonValue;
  clockedOutAt?: NetworkBillingJsonValue;
  startTime?: NetworkBillingJsonValue;
  endTime?: NetworkBillingJsonValue;
  clientRate?: string | null;
  clientPayType?: string | null;
};

export type NetworkBillingReadyRideRow = NetworkBillingReadyClaimBase & {
  sourceType: "ride";
  completedAt?: NetworkBillingJsonValue;
  scheduledStartTime?: NetworkBillingJsonValue;
  actualDistance?: number | null;
  isManual?: boolean;
  clientAgreedRate?: number | null;
};

export type NetworkBillingClaimRow =
  | NetworkBillingSavedClaimRow
  | NetworkBillingReadyShiftRow
  | NetworkBillingReadyRideRow;

type NetworkBillingPayrollBase = NetworkBillingRowBase & {
  staffKey: string;
  staffName?: string | null;
  grossAmount: number | null;
  totalHours: number | null;
  mode: "ddd" | "hha" | null;
  employeeId?: string | null;
};

export type NetworkBillingPayrollSavedRow = NetworkBillingPayrollBase & {
  kind: "payrollInvoice";
  sourceType?: never;
  invoiceNumber?: string | null;
  status?: "pending" | "paid" | null;
  employeeName?: string | null;
  periodStart?: NetworkBillingJsonValue;
  periodEnd?: NetworkBillingJsonValue;
  shiftCount?: number;
  createdAt?: NetworkBillingJsonValue;
  paidAt?: NetworkBillingJsonValue;
};

export type NetworkBillingPayrollDueRow = NetworkBillingPayrollBase & {
  kind?: never;
  sourceType: "shift" | "ride";
  sourceId: string;
  totalsExact: boolean;
};

export type NetworkBillingPayrollRow =
  | NetworkBillingPayrollSavedRow
  | NetworkBillingPayrollDueRow;

export type NetworkBillingPayPreview = {
  billingType: "hourly" | "monthly";
  billingRate: number;
  totalHours: number;
  grossAmount: number;
};

export type NetworkBillingTimesheetRow = NetworkBillingRowBase & {
  staffKey: string;
  status: "pending" | "approved" | "rejected";
  mode: "ddd" | "hha" | null;
  staffUid: string | null;
  staffName: string | null;
  periodStart: NetworkBillingJsonValue;
  periodEnd: NetworkBillingJsonValue;
  payrollInvoiceId?: string | null;
  createdAt?: NetworkBillingJsonValue;
  payPreview: NetworkBillingPayPreview | null;
};

export type NetworkBillingExpenseRow = NetworkBillingRowBase & {
  staffKey: string;
  status: "pending" | "approved" | "rejected";
  mode: "ddd" | "hha" | null;
  amount: number;
  employeeId?: string | null;
  employeeUid?: string | null;
  employeeName?: string;
  category?: string | null;
  date?: string | null;
  submittedAt?: NetworkBillingJsonValue;
  reviewedAt?: NetworkBillingJsonValue;
  payrollInvoiceId?: string | null;
};

export type NetworkBillingActivityRow = NetworkBillingRowBase & {
  kind: "claim" | "payroll" | "expense";
  amount: number;
  status: string | null;
  date: NetworkBillingJsonValue;
};

export type NetworkBillingClaimsSummary = {
  overview: Record<"submitted" | "pending" | "paid" | "rejected" | "atRisk", NetworkBillingAmount>;
  claimsByStatus: {
    total: number;
    segments: Array<{ status: "pending" | "paid" | "rejected"; count: number }>;
  };
  rejectionReasons: { total: number; segments: Array<{ reason: string; count: number }> };
  meta: { atRiskDays: number; evaluatedAt: string };
};

export type NetworkBillingPayrollDueSummary = {
  overview: {
    totalDue: { amount: number | null; count: number; exact: boolean };
    staffCount: { count: number };
    pendingHours: { hours: number };
    overtimeHours: { hours: number };
    missingTimesheets: { count: number };
  };
  coverage: {
    expectedAgencyCount: number;
    readyAgencyCount: number;
    pendingAgencyCount: number;
    staleAgencyCount: number;
    failedAgencyCount: number;
  };
  freshness: { oldestComputedAt: string | null; newestComputedAt: string | null };
  meta: { evaluatedAt: string; calculationVersion: 1; totalsExact: boolean };
};

export type NetworkBillingPayrollSavedSummary = {
  overview: { savedInvoices: { count: number; exact: boolean } };
  meta: { evaluatedAt: string; totalsExact: boolean };
};

export type NetworkBillingPayrollSummary =
  | NetworkBillingPayrollDueSummary
  | NetworkBillingPayrollSavedSummary;

export type NetworkBillingExpensesSummary = {
  overview: Record<"submitted" | "awaitingReview" | "approved" | "declined", NetworkBillingAmount>;
  expensesByStatus: {
    total: number;
    segments: Array<{ status: "pending" | "approved" | "rejected"; count: number }>;
  };
  meta: { evaluatedAt: string; totalsExact: boolean; branchCount: number };
};

export type NetworkBillingPeriod = { start: string; end: string };
export type NetworkBillingPartialErrorKey =
  | "current.claims"
  | "previous.claims"
  | "current.payroll"
  | "previous.payroll"
  | "current.expenses"
  | "previous.expenses"
  | "activity";

export type NetworkBillingOverview = {
  scope: NetworkBillingPublicScope;
  periods: { current: NetworkBillingPeriod; previous: NetworkBillingPeriod };
  current: Record<"claims" | "payroll" | "expenses", NetworkBillingNullableAmount>;
  previous: Record<"claims" | "payroll" | "expenses", NetworkBillingNullableAmount>;
  recentActivity: NetworkBillingActivityRow[];
  partialErrors?: Partial<Record<NetworkBillingPartialErrorKey, string>>;
  meta: { totalsExact: boolean; branchCount: number };
};

export type NetworkBillingOption = AgencyAware<{
  id: string;
  name: string;
  kind: "client" | "staff";
}>;

export type NetworkBillingPageResponse<T, TSummary = never> = {
  scope: NetworkBillingPublicScope;
  page: NetworkBillingPage<T>;
} & ([TSummary] extends [never] ? { summary?: never } : { summary: TSummary });

export type NetworkBillingExpensesPageResponse<T, TSummary = never> =
  NetworkBillingPageResponse<T, TSummary> & { meta: { branchCount: number } };
