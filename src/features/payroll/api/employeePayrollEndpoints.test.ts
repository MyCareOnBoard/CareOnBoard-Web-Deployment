import { describe, expect, it } from "vitest";
import {
  employeePayrollCommandRequest,
  employeePayrollPaths,
  employeePayrollMutationTags,
  employeePayrollInvalidationTags,
  employeeOnboardSessionInvalidationTags,
  employeeOnboardSessionRequest,
} from "./employeePayrollEndpoints";
import { agencyPayrollPaths } from "./agencyPayrollEndpoints";
import { managerPrimaryWorkplaceCommandRequest, managerPrimaryWorkplaceInvalidationTags } from "./payrollCommands";
import { employeeSetupMutationTags } from "./cacheTags";

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
