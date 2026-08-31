import type { CheckPayFrequency, CheckPayrollProfileRead, CheckPayrollProfileWrite } from "@/lib/agency/agency-profile-payload";
export type { AgencyMode } from "@/store/redux/agencyModeSlice";

export type PayrollAudience = "agency" | "employee" | "superAdmin";
export type PayrollScope = { audience: PayrollAudience; actorUid: string; agencyId: string };
export type PayrollAction = "designate_signer" | "clear_signer" | "submit_company_implementation" | "retry_company_sync" | "refresh_company_reconciliation" | "create_pay_schedule" | "correct_pay_schedule";
export type EmployeePayrollAction = "start_provisioning" | "retry_employee_sync";
export type ManagedEmployeePrimaryAction = "set_employee_primary_workplace";
export type PayrollOperationState = "accepted" | "queued" | "running" | "retrying" | "awaiting_provider" | "succeeded" | "needs_attention" | "failed" | "dead";

export type EmployeePayrollScope = Omit<PayrollScope, "audience"> & {
  audience: "employee";
  employmentId: string;
};

export type PayStatementStatus = "processing" | "paid" | "needs_attention";

export type PayStatementLine = {
  label: string;
  hours: number | null;
  rateCents: number | null;
  amountCents: number;
};

export type PayStatement = {
  statementId: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: PayStatementStatus;
  grossPayCents: number | null;
  deductionsCents: number | null;
  netPayCents: number | null;
  earnings: PayStatementLine[];
  reimbursements: PayStatementLine[];
  taxes: PayStatementLine[];
  otherDeductions: PayStatementLine[];
  paymentMethod: "direct_deposit" | "manual" | "unknown";
  downloadAvailable: boolean;
};

export type PayStatementPage = {
  setupRequired: boolean;
  year: number;
  currency: "USD";
  summary: {
    yearToDateGrossCents: number | null;
    latestNetPayCents: number | null;
    latestPayDate: string | null;
    nextPayDate: string | null;
    nextPayStatus: PayStatementStatus | null;
  } | null;
  statements: PayStatement[];
  nextCursor: string | null;
};

export type ManagedEmployeePrimaryWorkplaceScope = Omit<PayrollScope, "audience"> & {
  audience: "agency";
  employmentId: string;
};

export type ManagedEmployeePrimaryCommandArgs = Omit<PayrollScope, "audience"> & {
  audience: "agency";
  employmentId: string;
  clientAssignmentId: string;
  projectionRevision: number;
  idempotencyKey: string;
};

export type AgencyPayrollBootstrapArgs = PayrollScope & {
  expectedProjectionRevision: number;
  checkPayrollProfile: CheckPayrollProfileWrite;
  signerDesignation?: {
    designatedSignerUserUid: string;
    designatedSignerIdentityVersion: string;
    authorityAttested: true;
  };
};

export type PayrollSignerCandidate = {
  userUid: string;
  fullName: string;
  email: string;
  title: string;
  identityVersion: string;
  designated: boolean;
};

export type AgencyPayrollSignerCandidatesArgs = PayrollScope & { q?: string };

export type AgencyPayrollSignerCandidates = {
  ownerCandidate: PayrollSignerCandidate | null;
  staffCandidates: PayrollSignerCandidate[];
};

export type PayrollSchedulePrerequisiteState = "waiting_for_company" | "setup_required" | "needs_attention" | "complete";
export type PayrollSchedulePrerequisiteProjection = {
  state: PayrollSchedulePrerequisiteState;
  recoveryAction: "create_pay_schedule" | "correct_pay_schedule" | null;
  timeZone: string | null;
  frequency: CheckPayFrequency | null;
  payrollStartDate: string | null;
  firstPeriodEnd: string | null;
  firstPayday: string | null;
  secondPayday: string | null;
  compatibilityCode: "approval_deadline_incompatible" | "pay_schedule_reconciliation_required" | null;
  compatibilityMessage: string | null;
  nextPeriodStart: string | null;
  nextPeriodEnd: string | null;
  nextPayday: string | null;
  nextApprovalDeadline: string | null;
  lastReconciledAt: string | null;
};
export type PayrollScheduleCurrent = { frequency: CheckPayFrequency | null; payrollStartDate: string | null; firstPeriodEnd: string | null; firstPayday: string | null; secondPayday: string | null };
export type PayrollSchedulePeriod = { periodStart: string | null; periodEnd: string | null; payday: string | null; approvalDeadline: string | null };
export type PayrollScheduleChoice = { firstPayday: string | null; approvalDeadline: string | null; recommended: boolean };
export type AgencyPayrollScheduleArgs = PayrollScope & { projectionRevision: number; view: "details" | "options" };
export type AgencyPayrollScheduleRead =
  | { view: "details"; projectionRevision: number; current: PayrollScheduleCurrent; periods: PayrollSchedulePeriod[] }
  | { view: "options"; projectionRevision: number; current: PayrollScheduleCurrent; choices: PayrollScheduleChoice[] };

export interface AgencyPayrollSetupProjection {
  projectionRevision: number;
  generatedAt?: string;
  activeOperation?: PayrollOperation;
  integration: { state: "not_configured" | "configured"; environment: "sandbox" | "production" };
  preflight: { values: CheckPayrollProfileRead; missingFieldCodes: string[] };
  readiness: { status: "needs_information" | "ready_to_sync" | "needs_attention" | "ready"; blockers: string[]; nextAction: string | null };
  setup: {
    companyOnboardRevision: number | null;
    designatedSignerPresent: boolean;
    signerCandidate: PayrollSignerCandidate | null;
    designatedSigner: PayrollSignerCandidate | null;
    companyLinked: boolean;
    officeWorkplaceLinked: boolean;
    enrollmentProfileLocked: boolean;
    signatoryLinked: boolean;
  };
  schedulePrerequisite: PayrollSchedulePrerequisiteProjection;
  payrollActivation: { status: "blocked" | "ready"; blocker: "company_not_ready" | "pay_schedule_required" | "pay_schedule_needs_attention" | null };
  capabilities: {
    canView: boolean;
    canManage: boolean;
    canCreateIntegration: boolean;
    canDesignateSigner: boolean;
    createCompanyOnboardSession: boolean;
    canSubmitCompanyImplementation: boolean;
    canRetryCompanySync: boolean;
    canRefreshCompanyReconciliation: boolean;
  };
}

export interface EmployeePayrollSetupProjection {
  employmentId: string;
  projectionRevision: number;
  agencyIntegration: { state: "missing" | "configured" };
  prerequisites: {
    values: { legalName: string | null; email?: string };
    missingFieldCodes: string[];
    invalidFieldCodes: string[];
  };
  setup: {
    state: "not_started" | "queued" | "waiting" | "blocked" | "awaiting_provider" | "needs_attention" | "ready";
    blockers: string[];
    onboardingStatus: "blocking" | "needs_attention" | "completed" | null;
    blockingStepCodes: string[];
    remainingStepCodes: string[];
  };
  primaryWorkplace: {
    selectedClientAssignmentId: string | null;
    options: Array<{ clientAssignmentId: string; clientLabel: string }>;
  };
  capabilities: {
    canStartProvisioning: boolean;
    canRetryEmployeeSync: boolean;
    createEmployeeOnboardSession: boolean;
  };
}

export interface ManagedEmployeePrimaryWorkplaceProjection {
  employeeId: string;
  projectionRevision: number;
  primaryWorkplace: EmployeePayrollSetupProjection["primaryWorkplace"];
}

export interface PayrollOperation {
  operationId: string;
  state: PayrollOperationState;
  resourceType: "company" | "employee" | "payroll_run";
  pollAfterMs: number | null;
  statusUrl?: string;
}
