import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Profiler } from "react";
import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("../api/superAdminPayrollRunEndpoints", () => ({
  useListSuperAdminNetworkPayrollRunsQuery: api.list,
}));

import { NetworkPayrollRunsWorkspace } from "./NetworkPayrollRunsWorkspace";

const rows = [
  {
    networkRunKey: "network-atlas",
    environment: "sandbox",
    agencyId: "atlas",
    agencyName: "Atlas Care",
    runId: "run-atlas",
    runType: "regular",
    periodStart: "2026-07-20",
    periodEnd: "2026-08-02",
    payday: "2026-08-07",
    approvalDeadline: null,
    reopenDeadline: null,
    timezone: "America/New_York",
    workflowState: "review",
    providerStatus: "draft",
    activeRevisionId: "revision-1",
    revisionNumber: 1,
    stale: false,
    employeeCount: 12,
    includedCount: 11,
    deferredCount: 0,
    zeroDueCount: 0,
    blockerCount: 1,
    warningCount: 0,
    totals: { grossEarningsCents: 100_00, reimbursementCents: 25_00, adjustmentCents: 0, totalDueCents: 125_00 },
    preview: { status: "none", revisionId: null, totals: null },
    asOf: "2026-08-03T12:00:00.000Z",
  },
  {
    networkRunKey: "network-beacon",
    environment: "sandbox",
    agencyId: "beacon",
    agencyName: "Beacon Supports",
    runId: "run-beacon",
    runType: "off_cycle",
    periodStart: "2026-07-27",
    periodEnd: "2026-08-02",
    payday: "2026-08-08",
    approvalDeadline: null,
    reopenDeadline: null,
    timezone: "America/Chicago",
    workflowState: "approved",
    providerStatus: "processing",
    activeRevisionId: "revision-2",
    revisionNumber: 2,
    stale: false,
    employeeCount: 1,
    includedCount: 1,
    deferredCount: 0,
    zeroDueCount: 0,
    blockerCount: 0,
    warningCount: 0,
    totals: { grossEarningsCents: 50_00, reimbursementCents: 0, adjustmentCents: 0, totalDueCents: 50_00 },
    preview: { status: "succeeded", revisionId: "revision-2", totals: {} },
    asOf: "2026-08-03T13:00:00.000Z",
  },
] as const;

describe("NetworkPayrollRunsWorkspace", () => {
  it("keeps agency identity on every read-only row and enters trusted agency context", async () => {
    const onOpenAgency = vi.fn();
    const page = { items: rows, nextCursor: null, hasMore: false };
    api.list.mockReturnValue({ data: page, currentData: page, isLoading: false, isFetching: false, error: null, refetch: vi.fn() });
    render(<NetworkPayrollRunsWorkspace actorUid="super-1" onOpenAgency={onOpenAgency} />);

    const list = screen.getByRole("list", { name: "Authorized network payroll runs" });
    expect(list).toBeVisible();
    expect(screen.getByRole("listitem", { name: /Atlas Care/ })).toHaveTextContent("Atlas Care");
    expect(screen.getByRole("listitem", { name: /Beacon Supports/ })).toHaveTextContent("Beacon Supports");
    expect(screen.queryByRole("button", { name: /approve|refresh|reopen|create/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open Atlas Care payroll" }));
    expect(onOpenAgency).toHaveBeenCalledWith("atlas");
    expect(api.list).toHaveBeenCalledWith({ actorUid: "super-1" }, { skip: false });
  });

  it("navigates bounded cursor pages without mounting multiple network lists", async () => {
    const firstPage = { items: [rows[0]], nextCursor: "network-page-2", hasMore: true };
    const secondPage = { items: [rows[1]], nextCursor: null, hasMore: false };
    api.list.mockImplementation((args?: { cursor?: string }) => ({
      data: args?.cursor ? secondPage : firstPage,
      currentData: args?.cursor ? secondPage : firstPage,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    }));
    render(<NetworkPayrollRunsWorkspace actorUid="super-1" onOpenAgency={vi.fn()} />);

    expect(screen.getAllByRole("list", { name: "Authorized network payroll runs" })).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Next network payroll page" }));
    expect(api.list).toHaveBeenLastCalledWith(
      { actorUid: "super-1", cursor: "network-page-2" },
      { skip: false },
    );
    expect(screen.getByRole("listitem", { name: /Beacon Supports/ })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Previous network payroll page" }));
    expect(screen.getByRole("listitem", { name: /Atlas Care/ })).toBeVisible();
  });

  it("never paints the prior actor's agency rows during a direct actor transition", () => {
    const firstActorResult = {
      data: { items: [rows[0]], nextCursor: null, hasMore: false },
      currentData: { items: [rows[0]], nextCursor: null, hasMore: false },
      isLoading: false,
      isFetching: false,
      error: null,
    };
    const secondActorResult = {
      data: firstActorResult.data,
      currentData: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
    };
    api.list.mockImplementation((args?: { actorUid: string }) => (
      args?.actorUid === "super-1" ? firstActorResult : secondActorResult
    ));
    const commits: string[] = [];
    const view = render(
      <Profiler id="network-payroll" onRender={() => commits.push(document.body.textContent ?? "")}>
        <NetworkPayrollRunsWorkspace actorUid="super-1" onOpenAgency={vi.fn()} />
      </Profiler>,
    );
    expect(screen.getByText("Atlas Care")).toBeVisible();
    const transitionStart = commits.length;

    view.rerender(
      <Profiler id="network-payroll" onRender={() => commits.push(document.body.textContent ?? "")}>
        <NetworkPayrollRunsWorkspace actorUid="super-2" onOpenAgency={vi.fn()} />
      </Profiler>,
    );

    expect(commits.slice(transitionStart)).not.toEqual([]);
    expect(commits.slice(transitionStart).every((content) => !content.includes("Atlas Care"))).toBe(true);
  });
});
