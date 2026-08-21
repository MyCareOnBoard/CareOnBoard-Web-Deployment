import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadEmployeePayStatementPdf,
  employeePayrollApi,
  employeePayrollCommandRequest,
  employeePayrollPaths,
  employeePayrollMutationTags,
  employeePayrollInvalidationTags,
  employeeOnboardSessionInvalidationTags,
  employeeOnboardSessionRequest,
  employeeOnboardReconciliationRequest,
} from "./employeePayrollEndpoints";
import { agencyPayrollPaths } from "./agencyPayrollEndpoints";
import { managerPrimaryWorkplaceCommandRequest, managerPrimaryWorkplaceInvalidationTags } from "./payrollCommands";
import { employeeSetupMutationTags } from "./cacheTags";

const baseQuery = vi.hoisted(() => vi.fn());
const axiosGet = vi.hoisted(() => vi.fn());
vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: baseQuery }));
vi.mock("@/lib/axios", () => ({ default: { get: axiosGet } }));

describe("employee payroll wire contracts", () => {
  const employeeScope = {
    audience: "employee" as const,
    actorUid: "user-1",
    agencyId: "agency-1",
    employmentId: "employment-1",
  };

  it("uses canonical encoded employment paths without client identity in employee requests", () => {
    expect(employeePayrollPaths.setup("employment/a")).toEqual({
      url: "/checkPayrollEmployee/payroll/employees/employment%2Fa/setup",
      method: "GET",
      requiresAuth: true,
    });
    expect(employeePayrollPaths.onboardSession("employment/a").url).toBe(
      "/checkPayrollEmployeeOnboard/payroll/employees/employment%2Fa/onboard-session",
    );

    const command = employeePayrollCommandRequest({
      ...employeeScope,
      command: "start_provisioning",
      projectionRevision: 0,
      idempotencyKey: "employee-action-1",
    });
    expect(command).toMatchObject({
      headers: { "Idempotency-Key": "employee-action-1" },
      data: { command: "start_provisioning", expectedProjectionRevision: 0 },
    });
    expect(JSON.stringify(command)).not.toContain('"agencyId"');
    expect(JSON.stringify(command)).not.toContain('"user-1"');

    expect(employeeOnboardSessionRequest({ ...employeeScope, projectionRevision: 3 })).toEqual({
      url: "/checkPayrollEmployeeOnboard/payroll/employees/employment-1/onboard-session",
      method: "POST",
      requiresAuth: true,
      data: { expectedProjectionRevision: 3 },
    });
    expect(employeeOnboardSessionInvalidationTags()).toEqual([]);

    expect(employeeOnboardReconciliationRequest(employeeScope)).toEqual({
      url: "/checkPayrollEmployeeOnboard/payroll/employees/employment-1/onboard-reconciliation",
      method: "POST",
      requiresAuth: true,
      data: {},
    });
  });

  it("replays explicit employee action keys and invalidates only its setup identity", () => {
    const args = {
      ...employeeScope,
      command: "retry_employee_sync" as const,
      projectionRevision: 4,
      idempotencyKey: "employee-action-2",
    };
    const first = employeePayrollCommandRequest(args);
    const replay = employeePayrollCommandRequest(args);
    const nextAction = employeePayrollCommandRequest({ ...args, idempotencyKey: "employee-action-3" });

    expect(replay).toEqual(first);
    expect(nextAction).toEqual({ ...first, headers: { "Idempotency-Key": "employee-action-3" } });
    expect(employeePayrollMutationTags(args)).toEqual([
      { type: "EmployeeSetup", id: "employee:user-1:agency-1:employment-1" },
    ]);
    expect(employeePayrollInvalidationTags(undefined, args)).toEqual(employeePayrollMutationTags(args));
    expect(employeePayrollInvalidationTags({ status: 409 }, args)).toEqual([]);
  });

  it("serializes the closed optional personal profile without leaking scope data", () => {
    const request = employeePayrollCommandRequest({
      ...employeeScope,
      command: "start_provisioning",
      projectionRevision: 7,
      idempotencyKey: "employee-action-profile",
      profile: { legalName: "Ada Lovelace", email: null },
    });

    expect(request).toEqual({
      url: "/checkPayrollEmployee/payroll/employees/employment-1/commands",
      method: "POST",
      requiresAuth: true,
      headers: { "Idempotency-Key": "employee-action-profile" },
      data: {
        command: "start_provisioning",
        expectedProjectionRevision: 7,
        profile: { legalName: "Ada Lovelace", email: null },
      },
    });
    expect(JSON.stringify(request)).not.toMatch(/agencyId|actorUid|ssn|dateOfBirth|bank|tax/i);
  });
});

describe("employee pay statements", () => {
  const employeeScope = {
    audience: "employee" as const,
    actorUid: "user-1",
    agencyId: "agency-1",
    employmentId: "employment/a",
  };
  const page = (statementIds: string[], nextCursor: string | null, summary = { yearToDateGrossCents: 120_000, latestNetPayCents: 90_000, latestPayDate: "2026-06-15", nextPayDate: null, nextPayStatus: null }) => ({
    setupRequired: false,
    year: 2026,
    currency: "USD" as const,
    summary,
    statements: statementIds.map((statementId) => ({
      statementId,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-14",
      payDate: "2026-06-20",
      status: "paid" as const,
      grossPayCents: 120_000,
      deductionsCents: 30_000,
      netPayCents: 90_000,
      earnings: [], reimbursements: [], taxes: [], otherDeductions: [],
      paymentMethod: "direct_deposit" as const,
      downloadAvailable: true,
    })),
    nextCursor,
  });

  beforeEach(() => {
    baseQuery.mockReset();
    axiosGet.mockReset();
  });

  it("sends the encoded self-service list request with only year and optional cursor", async () => {
    const store = configureStore({
      reducer: { [employeePayrollApi.reducerPath]: employeePayrollApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(employeePayrollApi.middleware),
    });
    baseQuery.mockResolvedValueOnce({ data: page(["statement-1"], "next-a") });

    await store.dispatch(employeePayrollApi.endpoints.getEmployeePayStatements.initiate({ ...employeeScope, year: 2026 })).unwrap();

    expect(baseQuery).toHaveBeenCalledWith({
      url: "/checkPayrollEmployee/payroll/employees/employment%2Fa/pay-statements",
      method: "GET",
      requiresAuth: true,
      params: { year: 2026 },
    }, expect.objectContaining({ endpoint: "getEmployeePayStatements", type: "query" }), undefined);
    expect(JSON.stringify(baseQuery.mock.calls[0][0])).not.toMatch(/agencyId|actorUid|provider/i);
  });

  it("caches by self scope and year, appending only unseen cursor results while retaining the first summary", async () => {
    const store = configureStore({
      reducer: { [employeePayrollApi.reducerPath]: employeePayrollApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(employeePayrollApi.middleware),
    });
    const first = page(["statement-1", "statement-2"], "next-a");
    baseQuery.mockResolvedValueOnce({ data: first }).mockResolvedValueOnce({ data: page(["statement-2", "statement-3"], null, null) });

    await store.dispatch(employeePayrollApi.endpoints.getEmployeePayStatements.initiate({ ...employeeScope, year: 2026 })).unwrap();
    await store.dispatch(employeePayrollApi.endpoints.getEmployeePayStatements.initiate({ ...employeeScope, year: 2026, cursor: "next-a" })).unwrap();

    const cached = employeePayrollApi.endpoints.getEmployeePayStatements.select({ ...employeeScope, year: 2026 })(store.getState()).data;
    expect(cached?.statements.map(({ statementId }) => statementId)).toEqual(["statement-1", "statement-2", "statement-3"]);
    expect(cached?.summary).toEqual(first.summary);
    expect(cached?.nextCursor).toBeNull();
    expect(Object.keys((store.getState() as { checkPayrollApi: { queries: Record<string, unknown> } }).checkPayrollApi.queries)).toHaveLength(1);
  });

  it("downloads the encoded statement PDF through the authenticated Axios blob helper", async () => {
    const pdf = new Blob(["pay statement"], { type: "application/pdf" });
    axiosGet.mockResolvedValueOnce({ data: pdf });

    await expect(downloadEmployeePayStatementPdf({ employmentId: "employment/a", statementId: "statement/a" })).resolves.toBe(pdf);
    expect(axiosGet).toHaveBeenCalledWith(
      "/checkPayrollEmployee/payroll/employees/employment%2Fa/pay-statements/statement%2Fa/pdf",
      { responseType: "blob" },
    );
  });
});

describe("manager primary-workplace wire contracts", () => {
  const managerScope = {
    audience: "agency" as const,
    actorUid: "manager-1",
    agencyId: "agency-1",
    employmentId: "employment/a",
  };

  it("uses the canonical employment path and closed attestation command", () => {
    expect(agencyPayrollPaths.managedPrimaryWorkplace(managerScope.employmentId)).toEqual({
      url: "/checkPayrollAgency/payroll/agency/employees/employment%2Fa/primary-workplace",
      method: "GET",
      requiresAuth: true,
    });
    const request = managerPrimaryWorkplaceCommandRequest({
      ...managerScope,
      clientAssignmentId: "assignment-1",
      projectionRevision: 7,
      idempotencyKey: "manager-action-1",
    });
    expect(request).toEqual({
      url: "/checkPayrollAgency/payroll/agency/commands",
      method: "POST",
      requiresAuth: true,
      headers: { "Idempotency-Key": "manager-action-1" },
      data: {
        command: "set_employee_primary_workplace",
        employeeId: "employment/a",
        clientAssignmentId: "assignment-1",
        attestation: { ordinaryPrimaryWorkLocation: true },
        expectedProjectionRevision: 7,
      },
    });
    expect(JSON.stringify(request)).not.toContain('"agencyId"');
    expect(JSON.stringify(request)).not.toContain('"manager-1"');
  });

  it("replays explicit manager action keys and invalidates only its matching setup identity", () => {
    const args = {
      ...managerScope,
      clientAssignmentId: "assignment-1",
      projectionRevision: 7,
      idempotencyKey: "manager-action-2",
    };
    const first = managerPrimaryWorkplaceCommandRequest(args);
    const replay = managerPrimaryWorkplaceCommandRequest(args);
    const nextAction = managerPrimaryWorkplaceCommandRequest({ ...args, idempotencyKey: "manager-action-3" });

    expect(replay).toEqual(first);
    expect(nextAction).toEqual({ ...first, headers: { "Idempotency-Key": "manager-action-3" } });
    expect(employeeSetupMutationTags(args)).toEqual([
      { type: "EmployeeSetup", id: "agency:manager-1:agency-1:employment/a" },
    ]);
    expect(managerPrimaryWorkplaceInvalidationTags(undefined, args)).toEqual(employeeSetupMutationTags(args));
    expect(managerPrimaryWorkplaceInvalidationTags({ status: 409 }, args)).toEqual([]);
  });
});
