import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as agencyEndpoints from "./agencyPayrollEndpoints";
import { agencyCompanyOnboardSessionRequest, agencyPayrollApi, agencyPayrollPaths } from "./agencyPayrollEndpoints";
import { agencyPayrollCommandInvalidationTags, agencyPayrollCommandRequest, type PayrollCommandArgs } from "./payrollCommands";
import type { AgencyPayrollSetupProjection } from "../model/types";

const baseQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: baseQuery }));

const projection = (revision: number): AgencyPayrollSetupProjection => ({
  projectionRevision: revision,
  integration: { state: "configured", environment: "sandbox" },
  preflight: { values: {}, missingFieldCodes: [] },
  readiness: { status: "ready", blockers: [], nextAction: null },
  setup: { companyOnboardRevision: null, designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: true, officeWorkplaceLinked: true, enrollmentProfileLocked: true, signatoryLinked: false },
  schedulePrerequisite: { state: "complete", recoveryAction: null, timeZone: "America/Chicago", frequency: "weekly", payrollStartDate: "2026-08-24", firstPeriodEnd: "2026-09-06", firstPayday: "2026-09-11", secondPayday: null, compatibilityCode: null, compatibilityMessage: null, nextPeriodStart: "2026-08-31", nextPeriodEnd: "2026-09-06", nextPayday: "2026-09-11", nextApprovalDeadline: "2026-09-08T17:00:00.000Z", lastReconciledAt: "2026-08-30T12:00:00.000Z" },
  payrollActivation: { status: "ready", blocker: null },
  capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: false, canRetryCompanySync: false, canRefreshCompanyReconciliation: false },
});

describe("agency payroll wire contracts", () => {
  beforeEach(() => baseQuery.mockReset());
  it("uses closed authenticated paths without scope identity in requests", () => {
    expect(agencyPayrollPaths.setup()).toEqual({ url: "/checkPayrollAgency/payroll/agency/setup", method: "GET", requiresAuth: true });
    expect(agencyPayrollPaths.overview()).toEqual({ url: "/checkPayrollAgency/payroll/agency/overview", method: "GET", requiresAuth: true });
    expect(agencyPayrollPaths.operation("op/a").url).toBe("/checkPayrollOperations/payroll/operations/op%2Fa");
    const bootstrap = (agencyPayrollPaths as Record<string, unknown>).bootstrap;
    expect(bootstrap).toBeTypeOf("function");
    if (typeof bootstrap !== "function") return;
    expect(bootstrap()).toEqual({ url: "/checkPayrollAgency/payroll/agency/setup", method: "PUT", requiresAuth: true });
    expect(agencyPayrollPaths.signerCandidates).toBeTypeOf("function");
    expect(agencyPayrollPaths.signerCandidates()).toEqual({ url: "/checkPayrollAgency/payroll/agency/signer-candidates", method: "GET", requiresAuth: true });
    expect((agencyPayrollPaths as Record<string, unknown>).schedule).toBeTypeOf("function");
  });
  it("creates a company Onboard session with only the stable company revision", () => {
    const request = agencyCompanyOnboardSessionRequest({ audience: "agency", actorUid: "actor-1", agencyId: "agency-1", expectedCompanyOnboardRevision: 19 });
    expect(request).toEqual({
      url: "/checkPayrollOnboard/payroll/agency/setup/onboard-session",
      method: "POST",
      requiresAuth: true,
      data: { expectedCompanyOnboardRevision: 19 },
    });
    expect(request.data).not.toHaveProperty("expectedProjectionRevision");
    expect(JSON.stringify(request)).not.toContain('"agencyId"');
    expect(JSON.stringify(request)).not.toContain('"actorUid"');
    expect(JSON.stringify(request)).not.toContain('"providerId"');
    expect(JSON.stringify(request)).not.toContain('"signer"');
  });
  it("sends the verified signer in the one frozen bootstrap body and leaves the setup cache out of invalidation", () => {
    const args = {
      audience: "agency" as const,
      actorUid: "actor-1",
      agencyId: "agency-1",
      expectedProjectionRevision: 0,
      checkPayrollProfile: {
        legalName: "Able Care LLC",
        einChange: { mode: "replace" as const, value: "12-3456789" },
      },
      signerDesignation: {
        designatedSignerUserUid: "signer-1",
        designatedSignerIdentityVersion: `check_signer_v1_${"b".repeat(64)}`,
        authorityAttested: true as const,
      },
    };
    const request = (agencyEndpoints as Record<string, unknown>).agencyPayrollBootstrapRequest;
    const invalidationTags = (agencyEndpoints as Record<string, unknown>).agencyPayrollBootstrapInvalidationTags;
    expect(request).toBeTypeOf("function");
    expect(invalidationTags).toBeTypeOf("function");
    if (typeof request !== "function" || typeof invalidationTags !== "function") return;
    expect(request(args)).toEqual({
      url: "/checkPayrollAgency/payroll/agency/setup",
      method: "PUT",
      requiresAuth: true,
      data: {
        expectedProjectionRevision: 0,
        checkPayrollProfile: {
          legalName: "Able Care LLC",
          einChange: { mode: "replace", value: "12-3456789" },
        },
        signerDesignation: {
          designatedSignerUserUid: "signer-1",
          designatedSignerIdentityVersion: `check_signer_v1_${"b".repeat(64)}`,
          authorityAttested: true,
        },
      },
    });
    expect(JSON.stringify(request(args))).not.toContain('"agencyId"');
    const scopeId = JSON.stringify(["agency", "actor-1", "agency-1", null]);
    expect(invalidationTags(undefined, args)).toEqual([
      { type: "Attention", id: scopeId },
      { type: "Compliance", id: scopeId },
    ]);
    expect(invalidationTags(new Error("no"), args)).toEqual([]);
  });

  it("keeps the setup cache tagged separately from the overview cache", () => {
    const setupTags = (agencyEndpoints as Record<string, unknown>).agencyPayrollSetupTags;
    expect(setupTags).toBeTypeOf("function");
    if (typeof setupTags !== "function") return;
    expect(setupTags({ audience: "agency", actorUid: "actor-1", agencyId: "agency-1" })).toEqual([
      { type: "AgencySetup", id: JSON.stringify(["agency", "actor-1", "agency-1", null]) },
    ]);
  });
  it("keys the lazy schedule GET by agency, actor, projection revision, and view", () => {
    const request = (agencyEndpoints as Record<string, unknown>).agencyPayrollScheduleRequest;
    const cacheKey = (agencyEndpoints as Record<string, unknown>).agencyPayrollScheduleCacheKey;
    expect(request).toBeTypeOf("function");
    expect(cacheKey).toBeTypeOf("function");
    if (typeof request !== "function" || typeof cacheKey !== "function") return;
    const args = { audience: "agency", agencyId: "agency-1", actorUid: "actor-1", projectionRevision: 4, view: "details" };
    expect(request(args)).toEqual({
      url: "/checkPayrollAgency/payroll/agency/setup/schedule",
      method: "GET",
      requiresAuth: true,
      params: { view: "details" },
    });
    expect(JSON.stringify(request(args))).not.toContain("agencyId");
    expect(new Set([
      cacheKey(args),
      cacheKey({ ...args, agencyId: "agency-2" }),
      cacheKey({ ...args, actorUid: "actor-2" }),
      cacheKey({ ...args, projectionRevision: 5 }),
      cacheKey({ ...args, view: "options" }),
    ]).size).toBe(5);
    expect((agencyPayrollApi.endpoints as Record<string, unknown>).getAgencyPayrollSchedule).toBeDefined();
  });
  it("replaces only the successful bootstrap scope without immediately refetching setup", async () => {
    const store = configureStore({
      reducer: { [agencyPayrollApi.reducerPath]: agencyPayrollApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(agencyPayrollApi.middleware),
    });
    const matchingScope = { audience: "agency" as const, actorUid: "actor-a", agencyId: "agency-a" };
    const otherScope = { audience: "agency" as const, actorUid: "actor-b", agencyId: "agency-b" };
    const initial = projection(1);
    const authoritative = projection(2);
    await store.dispatch(agencyPayrollApi.util.upsertQueryData("getAgencyPayrollSetup", matchingScope, initial));
    await store.dispatch(agencyPayrollApi.util.upsertQueryData("getAgencyPayrollSetup", otherScope, projection(7)));
    baseQuery.mockResolvedValueOnce({ data: authoritative });

    await store.dispatch(agencyPayrollApi.endpoints.bootstrapAgencyPayrollSetup.initiate({
      ...matchingScope,
      expectedProjectionRevision: 1,
      checkPayrollProfile: {},
    })).unwrap();

    expect(agencyPayrollApi.endpoints.getAgencyPayrollSetup.select(matchingScope)(store.getState()).data).toEqual(authoritative);
    expect(agencyPayrollApi.endpoints.getAgencyPayrollSetup.select(otherScope)(store.getState()).data).toEqual(projection(7));
    expect(baseQuery).toHaveBeenCalledTimes(1);
  });
  it("sends only the closed designation body with the caller's stable idempotency key", () => {
    const args = { audience: "agency" as const, actorUid: "u", agencyId: "a", command: "designate_signer" as const, projectionRevision: 7, designatedSignerUserUid: "u", designatedSignerIdentityVersion: `check_signer_v1_${"a".repeat(64)}`, authorityAttested: true as const, idempotencyKey: "00000000-0000-4000-8000-000000000001" } satisfies PayrollCommandArgs;
    const first = agencyPayrollCommandRequest(args); const second = agencyPayrollCommandRequest(args);
    expect(first.headers["Idempotency-Key"]).toBe(args.idempotencyKey);
    expect(second.headers["Idempotency-Key"]).toBe(args.idempotencyKey);
    expect(first.data).toEqual({ command: "designate_signer", expectedProjectionRevision: 7, designatedSignerUserUid: "u", designatedSignerIdentityVersion: args.designatedSignerIdentityVersion, authorityAttested: true });
    expect(JSON.stringify(first)).not.toContain('"agencyId"');
  });
  it("does not add employee primary-workplace commands to company requests", () => {
    const request = agencyPayrollCommandRequest({ audience: "agency", actorUid: "u", agencyId: "a", command: "retry_company_sync", projectionRevision: 3, idempotencyKey: "00000000-0000-4000-8000-000000000001" });
    expect(request.data).toEqual({ command: "retry_company_sync", expectedProjectionRevision: 3 });
  });

  it("sends exact create and correct pay schedule command bodies", () => {
    const common = { audience: "agency" as const, actorUid: "u", agencyId: "a", projectionRevision: 9, idempotencyKey: "00000000-0000-4000-8000-000000000001" as const };
    const create = agencyPayrollCommandRequest({
      ...common,
      command: "create_pay_schedule",
      schedule: { frequency: "weekly", payrollStartDate: "2026-08-17", firstPeriodEnd: "2026-08-28", firstPayday: "2026-09-04", secondPayday: "" },
    } as unknown as PayrollCommandArgs);
    const correct = agencyPayrollCommandRequest({ ...common, command: "correct_pay_schedule", selectedFirstPayday: "2026-09-11" } as unknown as PayrollCommandArgs);

    expect(create.data).toEqual({
      command: "create_pay_schedule",
      expectedProjectionRevision: 9,
      schedule: { frequency: "weekly", payrollStartDate: "2026-08-17", firstPeriodEnd: "2026-08-28", firstPayday: "2026-09-04", secondPayday: null },
    });
    expect(correct.data).toEqual({ command: "correct_pay_schedule", expectedProjectionRevision: 9, selectedFirstPayday: "2026-09-11" });
  });

  it("sends review submission through the closed company command body", () => {
    const request = agencyPayrollCommandRequest({
      audience: "agency",
      actorUid: "u",
      agencyId: "a",
      command: "submit_company_implementation",
      projectionRevision: 8,
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
    });

    expect(request.headers).toEqual({ "Idempotency-Key": "00000000-0000-4000-8000-000000000001" });
    expect(request.data).toEqual({ command: "submit_company_implementation", expectedProjectionRevision: 8 });
    expect(JSON.stringify(request.data)).not.toContain("agencyId");
  });

  it("invalidates company cache tags only for a successful command", () => {
    const args = { audience: "agency" as const, actorUid: "u", agencyId: "a", command: "submit_company_implementation" as const, projectionRevision: 8, idempotencyKey: "00000000-0000-4000-8000-000000000001" } satisfies PayrollCommandArgs;
    const scopeId = JSON.stringify(["agency", "u", "a", null]);
    expect(agencyPayrollCommandInvalidationTags(undefined, args)).toEqual([
      { type: "Attention", id: scopeId },
      { type: "Compliance", id: scopeId },
    ]);
    expect(agencyPayrollCommandInvalidationTags({ status: 409 }, args)).toEqual([]);
  });
});
