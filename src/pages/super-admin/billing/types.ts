export type BillingWorkspaceScope =
  | { kind: "network" }
  | { kind: "agency"; agencyId: string };

export type AgencyAware<T> = T & { agencyId: string; agencyName: string };

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
  createdAt?: unknown;
};

export type NetworkBillingReadyClaimRow = NetworkBillingRowBase & {
  kind?: never;
  sourceType: "shift" | "ride";
  sourceId: string;
  serviceCode: string;
  needsClaim: boolean;
  needsInvoice: boolean;
  clientId?: string | null;
  clientName?: string | null;
  staffId?: string | null;
  staffName?: string | null;
};

export type NetworkBillingClaimRow =
  | NetworkBillingSavedClaimRow
  | NetworkBillingReadyClaimRow;

export type NetworkBillingPayrollSavedRow = NetworkBillingRowBase & {
  kind: "payrollInvoice";
  sourceType?: never;
  staffKey: string;
  grossAmount: number | null;
  totalHours: number | null;
  mode: "ddd" | "hha" | null;
};

export type NetworkBillingPayrollDueRow = NetworkBillingRowBase & {
  kind?: never;
  sourceType: "shift" | "ride";
  sourceId: string;
  staffKey: string;
  grossAmount: number | null;
  totalHours: number | null;
  mode: "ddd" | "hha" | null;
};

export type NetworkBillingPayrollRow =
  | NetworkBillingPayrollSavedRow
  | NetworkBillingPayrollDueRow;

export type NetworkBillingTimesheetRow = NetworkBillingRowBase & {
  staffKey: string;
  status: "pending" | "approved" | "rejected";
  mode: "ddd" | "hha" | null;
  staffUid: string | null;
  staffName: string | null;
  periodStart: unknown | null;
  periodEnd: unknown | null;
  payPreview: Record<string, unknown> | null;
};

export type NetworkBillingExpenseRow = NetworkBillingRowBase & {
  staffKey: string;
  status: "pending" | "approved" | "rejected";
  mode: "ddd" | "hha" | null;
  amount: number;
  employeeId?: string | null;
};

export type NetworkBillingActivityRow = NetworkBillingRowBase & {
  kind: "claim" | "payroll" | "expense";
  amount: number;
  status: string | null;
  date: unknown | null;
};

export type NetworkBillingOverview = {
  scope: NetworkBillingPublicScope;
  periods: Record<string, unknown>;
  current: Record<"claims" | "payroll" | "expenses", NetworkBillingNullableAmount>;
  previous: Record<"claims" | "payroll" | "expenses", NetworkBillingNullableAmount>;
  recentActivity: NetworkBillingActivityRow[];
  partialErrors?: Record<string, string>;
  meta: { totalsExact: boolean; branchCount: number };
};

export type NetworkBillingOption = AgencyAware<{
  id: string;
  name: string;
  kind: "client" | "staff";
}>;

export type NetworkBillingPageResponse<T> = {
  scope: NetworkBillingPublicScope;
  page: NetworkBillingPage<T>;
  summary?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};
