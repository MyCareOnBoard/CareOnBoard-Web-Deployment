import { describe, expect, it, vi } from "vitest";
import * as agencyEndpoints from "./agencyPayrollEndpoints";
import { agencyPayrollPaths } from "./agencyPayrollEndpoints";
import { agencyPayrollCommandRequest } from "./payrollCommands";

describe("agency payroll wire contracts", () => {
  it("uses closed authenticated paths without scope identity in requests", () => {
    expect(agencyPayrollPaths.setup()).toEqual({ url: "/checkPayrollAgency/payroll/agency/setup", method: "GET", requiresAuth: true });
    expect(agencyPayrollPaths.overview()).toEqual({ url: "/checkPayrollAgency/payroll/agency/overview", method: "GET", requiresAuth: true });
    expect(agencyPayrollPaths.operation("op/a").url).toBe("/checkPayrollOperations/payroll/operations/op%2Fa");
    const bootstrap = (agencyPayrollPaths as Record<string, unknown>).bootstrap;
    expect(bootstrap).toBeTypeOf("function");
    if (typeof bootstrap !== "function") return;
    expect(bootstrap()).toEqual({ url: "/checkPayrollAgency/payroll/agency/setup", method: "PUT", requiresAuth: true });
  });
  it("sends only the frozen bootstrap body and invalidates the matching agency setup after success", () => {
    const args = {
      audience: "agency" as const,
      actorUid: "actor-1",
      agencyId: "agency-1",
      expectedProjectionRevision: 0,
      checkPayrollProfile: {
        legalName: "Able Care LLC",
        einChange: { mode: "replace" as const, value: "12-3456789" },
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
      },
    });
    expect(JSON.stringify(request(args))).not.toContain('"agencyId"');
    expect(invalidationTags(undefined, args)).toEqual([
      { type: "AgencySetup", id: "agency:actor-1:agency-1" },
      { type: "AgencyOverview", id: "agency:actor-1:agency-1" },
      { type: "Attention", id: "agency:actor-1:agency-1" },
      { type: "Compliance", id: "agency:actor-1:agency-1" },
    ]);
    expect(invalidationTags(new Error("no"), args)).toEqual([]);
  });
  it("sends only the closed command body and a fresh idempotency key", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValueOnce("00000000-0000-4000-8000-000000000001").mockReturnValueOnce("00000000-0000-4000-8000-000000000002");
    const args = { audience: "agency" as const, actorUid: "u", agencyId: "a", command: "designate_signer" as const, projectionRevision: 7, designatedSignerUserUid: "u", authorityAttested: true as const };
    const first = agencyPayrollCommandRequest(args); const second = agencyPayrollCommandRequest(args);
    expect(first.headers["Idempotency-Key"]).not.toBe(second.headers["Idempotency-Key"]);
    expect(first.data).toEqual({ command: "designate_signer", expectedProjectionRevision: 7, designatedSignerUserUid: "u", authorityAttested: true });
    expect(JSON.stringify(first)).not.toContain('"agencyId"');
  });
  it("does not add employee primary-workplace commands to company requests", () => {
    const request = agencyPayrollCommandRequest({ audience: "agency", actorUid: "u", agencyId: "a", command: "retry_company_sync", projectionRevision: 3 });
    expect(request.data).toEqual({ command: "retry_company_sync", expectedProjectionRevision: 3 });
  });
});
