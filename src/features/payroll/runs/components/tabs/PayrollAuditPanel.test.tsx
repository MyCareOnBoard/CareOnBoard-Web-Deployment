import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PayrollAuditPanel } from "./PayrollAuditPanel";

const api = vi.hoisted(() => ({ events: vi.fn() }));
vi.mock("../../api/payrollRunEndpoints", () => ({
  useListPayrollRunEventsQuery: (...args: unknown[]) => api.events(...args),
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };
const identity = { runId: "run-1", activeRevisionId: "revision-1" };

describe("PayrollAuditPanel", () => {
  beforeEach(() => {
    api.events.mockReset();
    api.events.mockImplementation((args: { cursor?: string }) => ({
      data: args.cursor
        ? { items: [{ eventId: "event-26", revisionId: "revision-1", type: "payroll_paid", occurredAt: "2026-08-24T12:00:00.000Z", data: { outcome: "paid" } }], nextCursor: null, hasMore: false }
        : { items: Array.from({ length: 25 }, (_, index) => ({ eventId: `event-${index + 1}`, revisionId: "revision-1", type: "revision_published", occurredAt: "2026-08-24T12:00:00.000Z", data: { outcome: "published" } })), nextCursor: "events-2", hasMore: true },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    }));
  });

  it("shows one immutable 25-event page and keeps expanded audit absent without capability", () => {
    const view = render(<PayrollAuditPanel scope={scope} {...identity} expandedAudit={false} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(25);
    expect(api.events).toHaveBeenLastCalledWith({ ...scope, ...identity });
    expect(screen.queryByRole("region", { name: "Expanded audit" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(api.events).toHaveBeenLastCalledWith({ ...scope, ...identity, cursor: "events-2" });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    api.events.mockClear();
    view.rerender(<PayrollAuditPanel scope={scope} runId="run-2" activeRevisionId="revision-2" expandedAudit={false} />);
    expect(api.events).toHaveBeenCalledOnce();
    expect(api.events).toHaveBeenCalledWith({ ...scope, runId: "run-2", activeRevisionId: "revision-2" });
  });

  it("renders expanded audit context only when the server capability is present", () => {
    render(<PayrollAuditPanel scope={scope} {...identity} expandedAudit />);
    expect(screen.getByRole("region", { name: "Expanded audit" })).toBeInTheDocument();
  });
});
