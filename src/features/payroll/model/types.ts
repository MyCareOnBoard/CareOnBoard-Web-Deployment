export type PayrollAudience = "agency" | "employee" | "superAdmin";
export type PayrollScope = { audience: PayrollAudience; actorUid: string; agencyId: string };
export type PayrollAction = "designate_signer" | "clear_signer" | "retry_company_sync" | "refresh_company_reconciliation";
export type PayrollOperationState = "accepted" | "queued" | "running" | "retrying" | "awaiting_provider" | "succeeded" | "failed" | "dead";

export interface AgencyPayrollSetupProjection {
  projectionRevision: number;
  generatedAt?: string;
  clientRevalidateAfter?: string;
  readiness: { status: "needs_information" | "ready_to_sync" | "needs_attention" | "ready"; blockers: string[]; nextAction: string | null };
  setup: { designatedSignerPresent: boolean; companyLinked: boolean; officeWorkplaceLinked: boolean; payScheduleLinked: boolean; enrollmentProfileLocked: boolean };
  capabilities: { canView: boolean; canManage: boolean; canDesignateSigner: boolean; createCompanyOnboardSession: false };
}

export interface PayrollOperation { operationId: string; state: PayrollOperationState; resourceType: "company"; pollAfterMs?: number; }
