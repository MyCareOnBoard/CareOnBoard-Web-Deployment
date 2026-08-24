import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PayrollEmployeeSummary } from "../model/types";
import { PayrollEmployeeList } from "./PayrollEmployeeList";

const api = vi.hoisted(() => ({
  detailTrigger: vi.fn(),
  sourceTrigger: vi.fn(),
}));

vi.mock("../api/payrollRunEndpoints", () => ({
  useLazyGetPayrollRunEmployeeQuery: () => [api.detailTrigger, { isFetching: true }],
  useLazyListPayrollRunEmployeeSourcesQuery: () => [api.sourceTrigger, { isFetching: false }],
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };
const identity = {
  kind: "run" as const,
  runId: "run-1",
  activeRevisionId: "revision-1",
  revisionNumber: 1,
};

const items: PayrollEmployeeSummary[] = Array.from({ length: 50 }, (_, index) => ({
  employeeId: `employee-${index}`,
  activeRevisionId: identity.activeRevisionId,
  revisionId: identity.activeRevisionId,
  employmentType: index % 2 ? "staff" : "field",
  displayName: `Employee ${index}`,
  disposition: index === 0 ? "blocked" : "included",
  grossEarningsCents: 100_00 + index,
  reimbursementCents: 0,
  adjustmentCents: 0,
  totalDueCents: 100_00 + index,
  regularHours: 8,
  overtimeHours: 0,
  sourceCount: 1,
  sourceCounts: { shift: 1 },
  hasBlockers: index === 0,
  blockerCodes: index === 0 ? ["COMPENSATION_MISSING"] : [],
  warningCodes: [],
  obligationId: null,
  providerItemState: "pending",
}));

const renderList = () => render(
  <PayrollEmployeeList
    scope={scope}
    identity={identity}
    items={items}
    isBusy={false}
    canPrevious={false}
    canNext
    onPrevious={vi.fn()}
    onNext={vi.fn()}
  />,
);

describe("PayrollEmployeeList", () => {
  beforeEach(() => {
    api.detailTrigger.mockReset();
    api.sourceTrigger.mockReset();
    api.detailTrigger.mockReturnValue(Object.assign(new Promise<never>(() => undefined), { abort: vi.fn() }));
  });

  it.each([1280, 412])("renders one semantic root per employee at %ipx", (width) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    renderList();

    expect(screen.getAllByTestId("payroll-employee-row")).toHaveLength(50);
    expect(screen.getByRole("list", { name: "Employees in this payroll" })).toBeInTheDocument();
  });

  it("lazy-loads a row detail only after the employee expands", () => {
    renderList();
    expect(api.detailTrigger).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "View payroll details for Employee 0" }));
    expect(api.detailTrigger).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Hide payroll details for Employee 0" }))
      .toHaveAttribute("aria-expanded", "true");
  });

  it("provides accessible page-replacement navigation", () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const view = render(
      <PayrollEmployeeList
        scope={scope}
        identity={identity}
        items={items.slice(0, 2)}
        isBusy={false}
        canPrevious
        canNext
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous employee page" }));
    const nextButton = screen.getByRole("button", { name: "Next employee page" });
    nextButton.focus();
    fireEvent.click(nextButton);
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();

    view.rerender(
      <PayrollEmployeeList
        scope={scope}
        identity={identity}
        items={items.slice(0, 2)}
        isBusy
        canPrevious
        canNext
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );
    expect(screen.getByRole("list", { name: "Employees in this payroll" }))
      .toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Next employee page" }))
      .toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Next employee page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next employee page" })).toHaveFocus();
  });
});
