import type { AgencyMode, PayrollScope } from "../../model/types";

export type AgencyPayrollRunScope = Omit<PayrollScope, "audience"> & {
  audience: "agency";
  mode: AgencyMode;
};

export type PayrollWorkflowState =
  | "preparing"
  | "review"
  | "previewing"
  | "ready_to_approve"
  | "approved"
  | "closed"
  | "needs_attention"
  | "nothing_to_pay";

export type PayrollProviderStatus =
  | "none"
  | "draft"
  | "pending"
  | "processing"
  | "paid"
  | "partially_paid"
  | "failed";

export type PayrollRunType = "regular" | "off_cycle";
export type PayrollPreviewStatus = "none" | "pending" | "succeeded" | "failed";
export type PayrollEmploymentType = "field" | "staff";
export type PayrollEmployeeDisposition = "included" | "zero_due" | "blocked" | "deferred";
export type PayrollProviderItemState = "pending" | "none";
export type PayrollEmployeeFilter = "all" | "blocked" | "included" | "zero_due" | "deferred";
export type PayrollEmployeeSort = "name_asc" | "gross_desc";

export type PayrollRunCommandName =
  | "refresh_sources"
  | "add_adjustment"
  | "remove_adjustment"
  | "defer_employee"
  | "restore_employee"
  | "request_preview"
  | "approve_payroll"
  | "reopen_payroll"
  | "refresh_reconciliation";

export type PayrollOperationState =
  | "accepted"
  | "queued"
  | "running"
  | "retrying"
  | "awaiting_provider"
  | "succeeded"
  | "failed"
  | "dead";

export type PayrollCommandDisabledReason =
  | "permission_required"
  | "operation_in_progress"
  | "capability_disabled"
  | "projection_incomplete"
  | "run_not_editable"
  | "preview_not_ready"
  | "approval_not_ready"
  | "reopen_not_available";

export type PayrollRunIdentity =
  | { kind: "empty"; runId: null; activeRevisionId: null; revisionNumber: null }
  | { kind: "run"; runId: string; activeRevisionId: string; revisionNumber: number };

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type PayrollTotals = {
  grossEarningsCents: number;
  reimbursementCents: number;
  adjustmentCents: number;
  totalDueCents: number;
};

export type PayrollPreviewTotals = {
  grossCents: number;
  reimbursementsCents: number;
  employeeTaxesCents: number;
  employeeDeductionsCents: number;
  employerTaxesCents: number;
  employerContributionsCents: number;
  netPayCents: number;
  expectedCashRequirementCents: number;
};

export type PayrollPreview = {
  status: PayrollPreviewStatus;
  revisionId: string | null;
  hash: string | null;
  observedAt: string | null;
  totals: PayrollPreviewTotals | null;
};

export type PayrollRun = {
  runId: string;
  mode: AgencyMode;
  runType: PayrollRunType;
  periodStart: string;
  periodEnd: string;
  payday: string;
  approvalDeadline: string | null;
  reopenDeadline: string | null;
  timezone: string;
  workflowState: PayrollWorkflowState;
  providerStatus: PayrollProviderStatus;
  projectionRevision: number;
  revisionNumber: number;
  activeRevisionId: string;
  stale: boolean;
  employeeCount: number;
  includedCount: number;
  deferredCount: number;
  zeroDueCount: number;
  blockerCount: number;
  warningCount: number;
  blockerCodes: string[];
  warningCodes: string[];
  totals: PayrollTotals;
  preview: PayrollPreview;
  asOf: string | null;
};

export type PayrollCommandCapability =
  | { enabled: true; reasonCode: null }
  | { enabled: false; reasonCode: PayrollCommandDisabledReason };

export type PayrollCommandCapabilities = Record<PayrollRunCommandName, PayrollCommandCapability>;

export type PayrollRunCapabilities = {
  commands: PayrollCommandCapabilities;
};

export type PayrollRunPrerequisites = {
  revisionReady: boolean;
  dispositionsComplete: boolean;
  noBlockers: boolean;
  providerSynchronized: boolean;
  previewReady: boolean;
};

export type PayrollActiveOperation = {
  operationId: string;
  command: PayrollRunCommandName;
  state: PayrollOperationState;
  pollAfterMs: number | null;
};

export type EmptyCurrentPayrollProjection = {
  kind: "empty";
  runId: null;
  activeRevisionId: null;
  revisionNumber: null;
  run: null;
  emptyReason: "no_active_period";
};

export type PayrollRunProjection = {
  kind: "run";
  runId: string;
  activeRevisionId: string;
  revisionNumber: number;
  run: PayrollRun;
  capabilities: PayrollRunCapabilities;
  prerequisites: PayrollRunPrerequisites;
  activeOperation?: PayrollActiveOperation;
  approvalChallenge?: string;
  approvalChallengeExpiresAt?: string;
};

export type CurrentPayrollRunResponse = EmptyCurrentPayrollProjection | PayrollRunProjection;

export type PayrollEmployeeSummary = {
  employeeId: string;
  activeRevisionId: string;
  revisionId: string;
  employmentType: PayrollEmploymentType;
  displayName: string;
  disposition: PayrollEmployeeDisposition;
  grossEarningsCents: number;
  reimbursementCents: number;
  adjustmentCents: number;
  totalDueCents: number;
  regularHours: number;
  overtimeHours: number;
  sourceCount: number;
  sourceCounts: Record<string, number>;
  hasBlockers: boolean;
  blockerCodes: string[];
  warningCodes: string[];
  obligationId: string | null;
  providerItemState: PayrollProviderItemState;
};

export type PayrollEmployeePage = Extract<PayrollRunIdentity, { kind: "run" }>
  & CursorPage<PayrollEmployeeSummary>;

export type CurrentPayrollRunEmployeePage = PayrollEmployeePage;

export type CurrentPayrollEmployeePage =
  | EmptyCurrentPayrollProjection
  | CurrentPayrollRunEmployeePage;

export type PayrollRunActionState =
  | PayrollCommandCapability
  | { enabled: false; reasonCode: "no_active_run" };
