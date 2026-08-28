import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PayrollEmployeeDetail } from "./PayrollEmployeeDetail";

const api = vi.hoisted(() => ({
  detailTrigger: vi.fn(),
  sourceTrigger: vi.fn(),
  detailState: {} as Record<string, unknown>,
  sourceState: {} as Record<string, unknown>,
}));

vi.mock("../api/payrollRunEndpoints", () => ({
  useLazyGetPayrollRunEmployeeQuery: () => [api.detailTrigger, api.detailState],
  useLazyListPayrollRunEmployeeSourcesQuery: () => [api.sourceTrigger, api.sourceState],
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1", mode: "ddd" as const };
const identity = {
  kind: "run" as const,
  runId: "run-1",
  activeRevisionId: "revision-1",
  revisionNumber: 1,
};

const pending = () => Object.assign(new Promise<never>(() => undefined), { abort: vi.fn() });

describe("PayrollEmployeeDetail", () => {
  beforeEach(() => {
    api.detailTrigger.mockReset();
    api.sourceTrigger.mockReset();
    api.detailState = { data: undefined, isFetching: true, error: undefined };
    api.sourceState = { data: undefined, isFetching: false, error: undefined };
  });

  it("loads only after expansion and aborts the request on collapse or unmount", () => {
    const detailRequest = pending();
    api.detailTrigger.mockReturnValue(detailRequest);
    const view = render(
      <PayrollEmployeeDetail scope={scope} identity={identity} employeeId="employee-1" />,
    );

    expect(api.detailTrigger).toHaveBeenCalledWith({
      ...scope,
      runId: "run-1",
      activeRevisionId: "revision-1",
      employeeId: "employee-1",
    }, false);
    expect(api.sourceTrigger).not.toHaveBeenCalled();

    view.unmount();
    expect(detailRequest.abort).toHaveBeenCalledOnce();
  });

  it("aborts and rekeys detail when the opaque revision identity changes", () => {
    const first = pending();
    const second = pending();
    api.detailTrigger.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const view = render(
      <PayrollEmployeeDetail scope={scope} identity={identity} employeeId="employee-1" />,
    );

    view.rerender(
      <PayrollEmployeeDetail
        scope={scope}
        identity={{ ...identity, activeRevisionId: "revision-2", revisionNumber: 2 }}
        employeeId="employee-1"
      />,
    );

    expect(first.abort).toHaveBeenCalledOnce();
    expect(api.detailTrigger).toHaveBeenLastCalledWith(expect.objectContaining({
      activeRevisionId: "revision-2",
    }), false);
  });

  it("aborts DDD detail and reloads with HHA authority when mode changes", () => {
    const first = pending();
    const second = pending();
    api.detailTrigger.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const view = render(
      <PayrollEmployeeDetail scope={scope} identity={identity} employeeId="employee-1" />,
    );

    view.rerender(
      <PayrollEmployeeDetail scope={{ ...scope, mode: "hha" }} identity={identity} employeeId="employee-1" />,
    );

    expect(first.abort).toHaveBeenCalledOnce();
    expect(api.detailTrigger).toHaveBeenLastCalledWith({
      ...scope,
      mode: "hha",
      runId: "run-1",
      activeRevisionId: "revision-1",
      employeeId: "employee-1",
    }, false);
  });

  it("requests bounded sources only after explicit user intent", () => {
    api.detailTrigger.mockReturnValue(pending());
    api.detailState = {
      data: {
        employeeId: "employee-1",
        displayName: "Alex Morgan",
        sourceDetailsAvailable: true,
        sourceCount: 2,
      },
      isFetching: false,
      error: undefined,
    };
    api.sourceTrigger.mockReturnValue(pending());
    api.sourceState = {
      data: { items: [{ key: "source-1", type: "shift", serviceDate: "2026-08-20" }] },
      isFetching: false,
      error: undefined,
    };
    render(<PayrollEmployeeDetail scope={scope} identity={identity} employeeId="employee-1" />);

    expect(api.sourceTrigger).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Show source details" }));

    expect(api.sourceTrigger).toHaveBeenCalledWith(expect.objectContaining({
      runId: "run-1",
      activeRevisionId: "revision-1",
      employeeId: "employee-1",
    }), false);
    expect(screen.getByText("shift · Aug 20, 2026")).toBeInTheDocument();
  });
});
