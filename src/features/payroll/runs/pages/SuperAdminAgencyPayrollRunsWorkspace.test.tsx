import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CurrentPayrollEmployeePage, CurrentPayrollRunResponse } from "../model/types";

const api = vi.hoisted(() => ({ current: vi.fn(), employees: vi.fn() }));
vi.mock("../api/superAdminPayrollRunEndpoints", () => ({
  useLazyGetSuperAdminCurrentPayrollRunQuery: () => [api.current, {}],
  useLazyGetSuperAdminCurrentPayrollEmployeesQuery: () => [api.employees, {}],
}));

import { SuperAdminAgencyPayrollRunsWorkspace } from "./SuperAdminAgencyPayrollRunsWorkspace";

function request<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { unwrap: () => promise, abort: vi.fn(), resolve };
}

const run = {
  kind: "run",
  runId: "run-1",
  activeRevisionId: "revision-1",
  revisionNumber: 1,
  workspaceMode: "run",
  run: {
    runId: "run-1", runType: "regular", periodStart: "2026-07-20", periodEnd: "2026-08-02", payday: "2026-08-07",
    approvalDeadline: null, reopenDeadline: null, timezone: "America/New_York", workflowState: "ready_to_approve", providerStatus: "draft",
    projectionRevision: 1, revisionNumber: 1, activeRevisionId: "revision-1", stale: false, employeeCount: 1, includedCount: 1,
    deferredCount: 0, zeroDueCount: 0, blockerCount: 0, warningCount: 0, blockerCodes: [], warningCodes: [],
    totals: { grossEarningsCents: 100_00, reimbursementCents: 0, adjustmentCents: 0, totalDueCents: 100_00 },
    preview: { status: "succeeded", revisionId: "revision-1", hash: "a".repeat(64), observedAt: "2026-08-03T00:00:00.000Z", totals: { grossCents: 100_00, reimbursementsCents: 0, employeeTaxesCents: 0, employeeDeductionsCents: 0, employerTaxesCents: 0, employerContributionsCents: 0, netPayCents: 100_00, expectedCashRequirementCents: 100_00 } }, asOf: "2026-08-03T00:00:00.000Z",
  },
  capabilities: { replacementWorkspace: true, commands: { approve_payroll: { enabled: true, reasonCode: null } } },
  prerequisites: {},
} as unknown as CurrentPayrollRunResponse;

const employees = {
  kind: "run", runId: "run-1", activeRevisionId: "revision-1", revisionNumber: 1, workspaceMode: "run",
  capabilities: { replacementWorkspace: true }, nextCursor: null, hasMore: false,
  items: [{ employeeId: "employee-1", activeRevisionId: "revision-1", revisionId: "revision-1", employmentType: "staff", displayName: "Avery Nurse", disposition: "included", grossEarningsCents: 100_00, reimbursementCents: 0, adjustmentCents: 0, totalDueCents: 100_00, regularHours: 8, overtimeHours: 0, sourceCount: 1, sourceCounts: { timesheet: 1 }, hasBlockers: false, blockerCodes: [], warningCodes: [], obligationId: null, providerItemState: "pending" }],
} as CurrentPayrollEmployeePage;

describe("SuperAdminAgencyPayrollRunsWorkspace", () => {
  it("aborts both reads on agency change and remains read-only even if a server projection advertises approval", async () => {
    const atlasRun = request<CurrentPayrollRunResponse>();
    const atlasEmployees = request<CurrentPayrollEmployeePage>();
    const beaconRun = request<CurrentPayrollRunResponse>();
    const beaconEmployees = request<CurrentPayrollEmployeePage>();
    api.current.mockReturnValueOnce(atlasRun).mockReturnValueOnce(beaconRun);
    api.employees.mockReturnValueOnce(atlasEmployees).mockReturnValueOnce(beaconEmployees);

    const view = render(<SuperAdminAgencyPayrollRunsWorkspace scope={{ actorUid: "super-1", agencyId: "atlas", operationalContextRevision: 1 }} agencyName="Atlas Care" />);
    view.rerender(<SuperAdminAgencyPayrollRunsWorkspace scope={{ actorUid: "super-1", agencyId: "beacon", operationalContextRevision: 2 }} agencyName="Beacon Supports" />);

    expect(atlasRun.abort).toHaveBeenCalledOnce();
    expect(atlasEmployees.abort).toHaveBeenCalledOnce();
    expect(api.current).toHaveBeenLastCalledWith({ actorUid: "super-1", agencyId: "beacon", operationalContextRevision: 2 }, true);

    await act(async () => {
      beaconRun.resolve(run);
      beaconEmployees.resolve(employees);
    });
    await waitFor(() => expect(screen.getByRole("heading", { name: "Beacon Supports payroll" })).toBeVisible());
    expect(screen.getByText("Avery Nurse")).toBeVisible();
    expect(screen.getByText(/read-only/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /approve|refresh|reopen|adjust|defer/i })).not.toBeInTheDocument();
  });
});
