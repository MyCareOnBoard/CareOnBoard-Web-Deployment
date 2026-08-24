import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Profiler } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentPayrollEmployeePage, CurrentPayrollRunResponse } from "../model/types";

const api = vi.hoisted(() => ({ current: vi.fn(), employees: vi.fn() }));
vi.mock("../api/superAdminPayrollRunEndpoints", () => ({
  useLazyGetSuperAdminCurrentPayrollRunQuery: () => [api.current, {}],
  useLazyGetSuperAdminCurrentPayrollEmployeesQuery: () => [api.employees, {}],
}));

import { SuperAdminAgencyPayrollRunsWorkspace } from "./SuperAdminAgencyPayrollRunsWorkspace";

function request<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { unwrap: () => promise, abort: vi.fn(), resolve, reject };
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
} as Extract<CurrentPayrollEmployeePage, { kind: "run" }>;

describe("SuperAdminAgencyPayrollRunsWorkspace", () => {
  beforeEach(() => {
    api.current.mockReset();
    api.employees.mockReset();
  });
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

  it("loads the next selected-agency employee page without truncating at 50 rows", async () => {
    const runRequest = request<CurrentPayrollRunResponse>();
    const firstEmployees = request<CurrentPayrollEmployeePage>();
    const secondEmployees = request<CurrentPayrollEmployeePage>();
    api.current.mockReturnValueOnce(runRequest);
    api.employees.mockReturnValueOnce(firstEmployees).mockReturnValueOnce(secondEmployees);
    render(<SuperAdminAgencyPayrollRunsWorkspace
      scope={{ actorUid: "super-1", agencyId: "atlas", operationalContextRevision: 1 }}
      agencyName="Atlas Care"
    />);

    await act(async () => {
      runRequest.resolve(run);
      firstEmployees.resolve({ ...employees, hasMore: true, nextCursor: "employee-page-2" });
    });
    expect(await screen.findByText("Avery Nurse")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Next employee page" }));
    expect(api.employees).toHaveBeenLastCalledWith({
      actorUid: "super-1",
      agencyId: "atlas",
      operationalContextRevision: 1,
      cursor: "employee-page-2",
    }, true);

    await act(async () => {
      secondEmployees.resolve({
        ...employees,
        items: [{ ...employees.items[0], employeeId: "employee-2", displayName: "Jordan Nurse" }],
      });
    });
    expect(await screen.findByText("Jordan Nurse")).toBeVisible();
    expect(screen.queryByText("Avery Nurse")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous employee page" })).toBeEnabled();
  });

  it("never paints the previous agency employee page during a direct scope transition", async () => {
    const atlasRun = request<CurrentPayrollRunResponse>();
    const atlasEmployees = request<CurrentPayrollEmployeePage>();
    const beaconRun = request<CurrentPayrollRunResponse>();
    const beaconEmployees = request<CurrentPayrollEmployeePage>();
    api.current.mockReturnValueOnce(atlasRun).mockReturnValueOnce(beaconRun);
    api.employees.mockReturnValueOnce(atlasEmployees).mockReturnValueOnce(beaconEmployees);
    const commits: string[] = [];
    const view = render(
      <Profiler id="selected-payroll" onRender={() => commits.push(document.body.textContent ?? "")}>
        <SuperAdminAgencyPayrollRunsWorkspace
          scope={{ actorUid: "super-1", agencyId: "atlas", operationalContextRevision: 1 }}
          agencyName="Atlas Care"
        />
      </Profiler>,
    );
    await act(async () => {
      atlasRun.resolve(run);
      atlasEmployees.resolve(employees);
    });
    expect(await screen.findByText("Avery Nurse")).toBeVisible();
    const transitionStart = commits.length;

    view.rerender(
      <Profiler id="selected-payroll" onRender={() => commits.push(document.body.textContent ?? "")}>
        <SuperAdminAgencyPayrollRunsWorkspace
          scope={{ actorUid: "super-1", agencyId: "beacon", operationalContextRevision: 2 }}
          agencyName="Beacon Supports"
        />
      </Profiler>,
    );

    expect(commits.slice(transitionStart)).not.toEqual([]);
    expect(commits.slice(transitionStart).every((content) => !content.includes("Avery Nurse"))).toBe(true);
  });

  it("retains the accepted employee page and reports a pagination failure", async () => {
    const runRequest = request<CurrentPayrollRunResponse>();
    const firstEmployees = request<CurrentPayrollEmployeePage>();
    const failedEmployees = request<CurrentPayrollEmployeePage>();
    api.current.mockReturnValueOnce(runRequest);
    api.employees.mockReturnValueOnce(firstEmployees).mockReturnValueOnce(failedEmployees);
    render(<SuperAdminAgencyPayrollRunsWorkspace
      scope={{ actorUid: "super-1", agencyId: "atlas", operationalContextRevision: 1 }}
      agencyName="Atlas Care"
    />);
    await act(async () => {
      runRequest.resolve(run);
      firstEmployees.resolve({ ...employees, hasMore: true, nextCursor: "employee-page-2" });
    });

    await userEvent.click(await screen.findByRole("button", { name: "Next employee page" }));
    await act(async () => failedEmployees.reject(new Error("network unavailable")));

    expect(await screen.findByRole("alert")).toHaveTextContent(/employee page could not be loaded/i);
    expect(screen.getByText("Avery Nurse")).toBeVisible();
  });
});
