import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as agencyEndpoints from "./agencyPayrollEndpoints";
import { agencyPayrollApi, agencyPayrollPaths } from "./agencyPayrollEndpoints";
import { agencyPayrollCommandRequest, type PayrollCommandArgs } from "./payrollCommands";
import type { AgencyPayrollSetupProjection } from "../model/types";

const baseQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: baseQuery }));

const projection = (revision: number): AgencyPayrollSetupProjection => ({
  projectionRevision: revision,
  integration: { state: "configured", environment: "sandbox" },
  preflight: { values: {}, missingFieldCodes: [] },
  readiness: { status: "ready", blockers: [], nextAction: null },
  setup: { designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: true, officeWorkplaceLinked: true, payScheduleLinked: true, enrollmentProfileLocked: true, signatoryLinked: false },
  capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false },
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
    expect(invalidationTags(undefined, args)).toEqual([
      { type: "AgencyOverview", id: "agency:actor-1:agency-1" },
      { type: "Attention", id: "agency:actor-1:agency-1" },
      { type: "Compliance", id: "agency:actor-1:agency-1" },
    ]);
    expect(invalidationTags(new Error("no"), args)).toEqual([]);
  });

  it("keeps the setup cache tagged separately from the overview cache", () => {
    const setupTags = (agencyEndpoints as Record<string, unknown>).agencyPayrollSetupTags;
    expect(setupTags).toBeTypeOf("function");
    if (typeof setupTags !== "function") return;
    expect(setupTags({ audience: "agency", actorUid: "actor-1", agencyId: "agency-1" })).toEqual([
      { type: "AgencySetup", id: "agency:actor-1:agency-1" },
    ]);
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
});
