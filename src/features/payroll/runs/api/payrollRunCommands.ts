import { checkPayrollApi } from "../../api/checkPayrollApi";
import {
  PAYROLL_RUN_WIDE_REVISION_TAG,
  payrollObligationTag,
  payrollRunEmployeeTag,
  payrollRunEventTag,
  payrollRunTag,
  payrollTag,
} from "../../api/cacheTags";
import type { PayrollOperation } from "../../model/types";
import type { AgencyPayrollRunScope } from "../model/types";

type FixedPayrollAdjustment = { basis: "fixed"; amountCents: number };
type HoursRatePayrollAdjustment = { basis: "hours_rate"; minutes: number; rateCentsPerHour: number };
type PayrollAdjustmentInput =
  | { category: "bonus" | "reimbursement"; calculation: FixedPayrollAdjustment }
  | {
    category: "prior_period_underpayment" | "other_earning_correction";
    calculation: FixedPayrollAdjustment | HoursRatePayrollAdjustment;
  };
type PayrollDeferralReason = "onboarding_incomplete" | "compensation_missing" | "source_unapproved" | "source_conflict" | "workplace_missing" | "other";

type PayrollRunCommandBase = AgencyPayrollRunScope & {
  runId: string;
  expectedProjectionRevision: number;
  idempotencyKey: string;
};
type RevisionBoundCommand = PayrollRunCommandBase & { expectedActiveRevisionId: string };

export type PayrollRunCommandArgs =
  | (RevisionBoundCommand & { command: "refresh_sources" | "request_preview" | "reopen_payroll" })
  | (PayrollRunCommandBase & { command: "refresh_reconciliation"; expectedActiveRevisionId?: never })
  | (RevisionBoundCommand & PayrollAdjustmentInput & {
    command: "add_adjustment";
    employeeId: string;
    reason: string;
  })
  | (RevisionBoundCommand & { command: "remove_adjustment"; employeeId: string; adjustmentId: string })
  | (RevisionBoundCommand & {
    command: "defer_employee";
    employeeId: string;
    reasonCategory: PayrollDeferralReason;
    explanation: string;
  })
  | (RevisionBoundCommand & { command: "restore_employee"; employeeId: string; obligationId: string })
  | (RevisionBoundCommand & {
    command: "approve_payroll";
    expectedPreviewRevisionId: string;
    expectedPreviewHash: string;
    approvalChallenge: string;
    acknowledgement: true;
  });

export type CreateOffCyclePayrollArgs = AgencyPayrollRunScope & {
  idempotencyKey: string;
  obligations: ReadonlyArray<{ obligationId: string; expectedVersion: number }>;
  requestedPayday: string;
};

const commandPayload = (args: PayrollRunCommandArgs) => {
  switch (args.command) {
    case "refresh_sources":
    case "request_preview":
    case "refresh_reconciliation":
    case "reopen_payroll":
      return {};
    case "add_adjustment":
      return {
        employeeId: args.employeeId,
        category: args.category,
        calculation: args.calculation.basis === "fixed"
          ? { basis: "fixed" as const, amountCents: args.calculation.amountCents }
          : {
            basis: "hours_rate" as const,
            minutes: args.calculation.minutes,
            rateCentsPerHour: args.calculation.rateCentsPerHour,
          },
        reason: args.reason,
      };
    case "remove_adjustment":
      return { employeeId: args.employeeId, adjustmentId: args.adjustmentId };
    case "defer_employee":
      return {
        employeeId: args.employeeId,
        reasonCategory: args.reasonCategory,
        explanation: args.explanation,
      };
    case "restore_employee":
      return { employeeId: args.employeeId, obligationId: args.obligationId };
    case "approve_payroll":
      return {
        expectedPreviewRevisionId: args.expectedPreviewRevisionId,
        expectedPreviewHash: args.expectedPreviewHash,
        approvalChallenge: args.approvalChallenge,
        acknowledgement: args.acknowledgement,
      };
  }
};

export const payrollRunCommandRequest = (args: PayrollRunCommandArgs) => ({
  url: `/checkPayrollAgency/payroll/agency/runs/${encodeURIComponent(args.runId)}/commands`,
  method: "POST" as const,
  requiresAuth: true,
  params: { mode: args.mode },
  headers: { "Idempotency-Key": args.idempotencyKey },
  data: {
    command: args.command,
    expectedProjectionRevision: args.expectedProjectionRevision,
    ...(args.command === "refresh_reconciliation"
      ? {}
      : { expectedActiveRevisionId: args.expectedActiveRevisionId }),
    payload: commandPayload(args),
  },
});

export const createOffCyclePayrollRequest = (args: CreateOffCyclePayrollArgs) => ({
  url: "/checkPayrollAgency/payroll/agency/off-cycle-runs",
  method: "POST" as const,
  requiresAuth: true,
  params: { mode: args.mode },
  headers: { "Idempotency-Key": args.idempotencyKey },
  data: {
    obligations: args.obligations.map(({ obligationId, expectedVersion }) => ({ obligationId, expectedVersion })),
    requestedPayday: args.requestedPayday,
  },
});

export const payrollRunCommandInvalidationTags = (
  result: PayrollOperation | undefined,
  error: unknown,
  args: PayrollRunCommandArgs,
) => {
  if (error || result?.state !== "succeeded") return [];
  const activeRevisionId = args.command === "refresh_reconciliation"
    ? PAYROLL_RUN_WIDE_REVISION_TAG
    : args.expectedActiveRevisionId;
  return [
    payrollRunTag(args, "current", "current"),
    payrollRunTag(args, args.runId, activeRevisionId),
    payrollRunEmployeeTag(args, args.runId, activeRevisionId),
    payrollTag("PayrollHistory", args),
    payrollRunEventTag(args, args.runId, activeRevisionId),
    ...(["defer_employee", "restore_employee"].includes(args.command)
      ? [payrollObligationTag(args)]
      : []),
  ];
};

export const createOffCyclePayrollInvalidationTags = (
  result: PayrollOperation | undefined,
  error: unknown,
  args: CreateOffCyclePayrollArgs,
) => error || result?.state !== "succeeded" ? [] : [
  payrollRunTag(args, "current", "current"),
  payrollTag("PayrollHistory", args),
  payrollObligationTag(args),
];

export const payrollRunCommandApi = checkPayrollApi.injectEndpoints({
  endpoints: (build) => ({
    runPayrollRunCommand: build.mutation<PayrollOperation, PayrollRunCommandArgs>({
      query: payrollRunCommandRequest,
      invalidatesTags: payrollRunCommandInvalidationTags,
    }),
    createOffCyclePayrollRun: build.mutation<PayrollOperation, CreateOffCyclePayrollArgs>({
      query: createOffCyclePayrollRequest,
      invalidatesTags: createOffCyclePayrollInvalidationTags,
    }),
  }),
});

export const {
  useRunPayrollRunCommandMutation,
  useCreateOffCyclePayrollRunMutation,
} = payrollRunCommandApi;
