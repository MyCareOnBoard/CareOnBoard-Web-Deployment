import { describe, expect, it, vi } from "vitest";
import {
  PAYROLL_RUN_WIDE_REVISION_TAG,
  payrollRunEmployeeTag,
  payrollRunEventTag,
  payrollRunTag,
} from "../../api/cacheTags";
import type { PayrollOperation } from "../../model/types";
import {
  createOffCyclePayrollRequest,
  createOffCyclePayrollInvalidationTags,
  payrollRunCommandApi,
  payrollRunCommandInvalidationTags,
  payrollRunCommandRequest,
  type PayrollRunCommandArgs,
} from "./payrollRunCommands";

const baseQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: baseQuery }));

const base = {
  audience: "agency" as const,
  actorUid: "actor-1",
  agencyId: "agency-1",
  runId: "run/a",
  expectedProjectionRevision: 17,
  expectedActiveRevisionId: "revision-a",
  idempotencyKey: "00000000-0000-4000-8000-000000000001",
};

describe("payroll run command transport", () => {
  it("registers the run-command and off-cycle mutations", () => {
    expect(payrollRunCommandApi.endpoints.runPayrollRunCommand).toBeDefined();
    expect(payrollRunCommandApi.endpoints.createOffCyclePayrollRun).toBeDefined();
  });

  it.each([
    ["refresh_sources", {}],
    ["request_preview", {}],
    ["reopen_payroll", {}],
  ] as const)("shapes the revision-bound %s command", (command, payload) => {
    const request = payrollRunCommandRequest({ ...base, command });
    expect(request).toEqual({
      url: "/checkPayrollAgency/payroll/agency/runs/run%2Fa/commands",
      method: "POST",
      requiresAuth: true,
      headers: { "Idempotency-Key": base.idempotencyKey },
      data: {
        command,
        expectedProjectionRevision: 17,
        expectedActiveRevisionId: "revision-a",
        payload,
      },
    });
  });

  it("keeps reconciliation projection-bound but omits payroll-revision authority", () => {
    const request = payrollRunCommandRequest({
      audience: "agency",
      actorUid: "actor-1",
      agencyId: "agency-1",
      runId: "run-a",
      command: "refresh_reconciliation",
      expectedProjectionRevision: 17,
      idempotencyKey: base.idempotencyKey,
    });
    expect(request.data).toEqual({
      command: "refresh_reconciliation",
      expectedProjectionRevision: 17,
      payload: {},
    });
    expect(request.data).not.toHaveProperty("expectedActiveRevisionId");
  });

  it("puts approval revision, preview, challenge, and acknowledgement fields in their strict locations", () => {
    const request = payrollRunCommandRequest({
      ...base,
      command: "approve_payroll",
      expectedPreviewRevisionId: "preview-a",
      expectedPreviewHash: "a".repeat(64),
      approvalChallenge: "opaque-challenge",
      acknowledgement: true,
    });
    expect(request.data).toEqual({
      command: "approve_payroll",
      expectedProjectionRevision: 17,
      expectedActiveRevisionId: "revision-a",
      payload: {
        expectedPreviewRevisionId: "preview-a",
        expectedPreviewHash: "a".repeat(64),
        approvalChallenge: "opaque-challenge",
        acknowledgement: true,
      },
    });
  });

  it("shapes typed employee commands without leaking caller, agency, provider, or display revision fields", () => {
    const commands: PayrollRunCommandArgs[] = [
      {
        ...base,
        command: "add_adjustment",
        employeeId: "employee-a",
        category: "prior_period_underpayment",
        calculation: { basis: "hours_rate", minutes: 75, rateCentsPerHour: 2300 },
        reason: "Correct prior period underpayment.",
      },
      { ...base, command: "remove_adjustment", employeeId: "employee-a", adjustmentId: "adjustment-a" },
      {
        ...base,
        command: "defer_employee",
        employeeId: "employee-a",
        reasonCategory: "source_conflict",
        explanation: "Source approval needs correction.",
      },
      { ...base, command: "restore_employee", employeeId: "employee-a", obligationId: "obligation-a" },
    ];
    const requests = commands.map((command) => payrollRunCommandRequest({
      ...command,
      revisionNumber: 99,
      providerPayrollId: "provider-private",
      environment: "production",
    } as unknown as PayrollRunCommandArgs));

    expect(requests.map(({ data }) => data.payload)).toEqual([
      {
        employeeId: "employee-a",
        category: "prior_period_underpayment",
        calculation: { basis: "hours_rate", minutes: 75, rateCentsPerHour: 2300 },
        reason: "Correct prior period underpayment.",
      },
      { employeeId: "employee-a", adjustmentId: "adjustment-a" },
      {
        employeeId: "employee-a",
        reasonCategory: "source_conflict",
        explanation: "Source approval needs correction.",
      },
      { employeeId: "employee-a", obligationId: "obligation-a" },
    ]);
    expect(JSON.stringify(requests)).not.toMatch(/actorUid|agencyId|providerPayrollId|environment|revisionNumber/);
  });

  it("rebuilds the nested adjustment calculation from its closed fields", () => {
    const request = payrollRunCommandRequest({
      ...base,
      command: "add_adjustment",
      employeeId: "employee-a",
      category: "bonus",
      calculation: {
        basis: "fixed",
        amountCents: 12500,
        providerPayrollId: "provider-private",
      },
      reason: "Quarterly attendance bonus.",
    } as unknown as PayrollRunCommandArgs);

    expect(request.data.payload).toEqual({
      employeeId: "employee-a",
      category: "bonus",
      calculation: { basis: "fixed", amountCents: 12500 },
      reason: "Quarterly attendance bonus.",
    });
  });

  it("reuses the caller's one UUID for retries of the same intent", () => {
    const args = { ...base, command: "request_preview" as const };
    expect(payrollRunCommandRequest(args).headers).toEqual({ "Idempotency-Key": base.idempotencyKey });
    expect(payrollRunCommandRequest(args).headers).toEqual({ "Idempotency-Key": base.idempotencyKey });
  });

  it("creates an off-cycle request from only obligation versions, payday, and the intent key", () => {
    const request = createOffCyclePayrollRequest({
      audience: "agency",
      actorUid: "actor-1",
      agencyId: "agency-1",
      idempotencyKey: base.idempotencyKey,
      obligations: [
        { obligationId: "obligation-b", expectedVersion: 2 },
        { obligationId: "obligation-a", expectedVersion: 1 },
      ],
      requestedPayday: "2026-09-04",
    });
    expect(request).toEqual({
      url: "/checkPayrollAgency/payroll/agency/off-cycle-runs",
      method: "POST",
      requiresAuth: true,
      headers: { "Idempotency-Key": base.idempotencyKey },
      data: {
        obligations: [
          { obligationId: "obligation-b", expectedVersion: 2 },
          { obligationId: "obligation-a", expectedVersion: 1 },
        ],
        requestedPayday: "2026-09-04",
      },
    });
    expect(JSON.stringify(request)).not.toMatch(/actorUid|agencyId|provider|environment/);
  });

  it("does not invalidate authoritative projections for a rejected or merely accepted operation", () => {
    const args = { ...base, command: "request_preview" as const };
    const accepted = {
      operationId: "operation-a",
      state: "queued",
      resourceType: "payroll_run",
      pollAfterMs: 1000,
    } satisfies PayrollOperation;
    expect(payrollRunCommandInvalidationTags(undefined, { status: 409 }, args)).toEqual([]);
    expect(payrollRunCommandInvalidationTags(accepted, undefined, args)).toEqual([]);
  });

  it("invalidates every affected terminal projection without broad obligation churn", () => {
    const succeeded = {
      operationId: "operation-a",
      state: "succeeded",
      resourceType: "payroll_run",
      pollAfterMs: null,
    } satisfies PayrollOperation;
    const ordinary = payrollRunCommandInvalidationTags(
      succeeded,
      undefined,
      { ...base, command: "request_preview" },
    );
    expect(ordinary.map((tag) => tag.type)).toEqual([
      "PayrollRun",
      "PayrollRun",
      "PayrollRunEmployee",
      "PayrollHistory",
      "PayrollRunEvent",
    ]);

    const deferral = payrollRunCommandInvalidationTags(
      succeeded,
      undefined,
      {
        ...base,
        command: "defer_employee",
        employeeId: "employee-a",
        reasonCategory: "other",
        explanation: "Payroll requires manual follow-up.",
      },
    );
    expect(deferral.map((tag) => tag.type)).toEqual([
      "PayrollRun",
      "PayrollRun",
      "PayrollRunEmployee",
      "PayrollHistory",
      "PayrollRunEvent",
      "PayrollObligation",
    ]);
  });

  it("invalidates only current, history, and obligations after off-cycle success", () => {
    const succeeded = {
      operationId: "operation-a",
      state: "succeeded",
      resourceType: "payroll_run",
      pollAfterMs: null,
    } satisfies PayrollOperation;
    const args = {
      audience: "agency" as const,
      actorUid: "actor-1",
      agencyId: "agency-1",
      idempotencyKey: base.idempotencyKey,
      obligations: [{ obligationId: "obligation-a", expectedVersion: 1 }],
      requestedPayday: "2026-09-04",
    };
    expect(createOffCyclePayrollInvalidationTags(succeeded, undefined, args).map((tag) => tag.type)).toEqual([
      "PayrollRun",
      "PayrollHistory",
      "PayrollObligation",
    ]);
  });

  it("uses run-wide invalidation only when reconciliation has no revision authority", () => {
    const succeeded = {
      operationId: "operation-a",
      state: "succeeded",
      resourceType: "payroll_run",
      pollAfterMs: null,
    } satisfies PayrollOperation;
    const reconciliationArgs = {
      audience: "agency" as const,
      actorUid: "actor-1",
      agencyId: "agency-1",
      runId: "run-a",
      command: "refresh_reconciliation" as const,
      expectedProjectionRevision: 17,
      idempotencyKey: base.idempotencyKey,
    };
    const reconciliation = payrollRunCommandInvalidationTags(
      succeeded,
      undefined,
      reconciliationArgs,
    );
    expect(reconciliation).toEqual(expect.arrayContaining([
      payrollRunTag(reconciliationArgs, "run-a", PAYROLL_RUN_WIDE_REVISION_TAG),
      payrollRunEmployeeTag(reconciliationArgs, "run-a", PAYROLL_RUN_WIDE_REVISION_TAG),
      payrollRunEventTag(reconciliationArgs, "run-a", PAYROLL_RUN_WIDE_REVISION_TAG),
    ]));

    const revisionBound = payrollRunCommandInvalidationTags(
      succeeded,
      undefined,
      { ...base, command: "request_preview" },
    );
    expect(revisionBound).not.toContainEqual(
      payrollRunTag(base, base.runId, PAYROLL_RUN_WIDE_REVISION_TAG),
    );
  });
});
