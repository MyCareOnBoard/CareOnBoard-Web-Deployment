import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchShiftAnomalies: vi.fn(),
  fetchShiftMaintenanceAudit: vi.fn(),
}));
const modalProps = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/shifts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/shifts")>("@/lib/api/shifts");
  return {
    ...actual,
    fetchShiftAnomalies: api.fetchShiftAnomalies,
    fetchShiftMaintenanceAudit: api.fetchShiftMaintenanceAudit,
  };
});
vi.mock("@/components/ShiftDetailsModal", () => ({
  default: (props: Record<string, unknown>) => {
    modalProps.current = props;
    return props.isOpen ? <div role="dialog" aria-label="Shift maintenance details" /> : null;
  },
}));
vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: { uid: "super-1", userType: "super_admin", profile: { accessList: ["Shift Maintenance"] } } }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

import ShiftMaintenancePage from "./index";

const agencies = [
  { id: "agency-a", name: "Atlas Care", status: "active" as const, supportedClientTypes: ["ddd"] as const, timezone: "UTC" },
  { id: "agency-b", name: "Beacon Supports", status: "active" as const, supportedClientTypes: ["ddd"] as const, timezone: "UTC" },
];

const anomaly = {
  id: "shift-b",
  agencyId: "agency-b",
  date: "2026-07-30",
  startTime: "09:00 AM",
  endTime: "11:00 AM",
  status: "expired",
  employeeId: "staff-b",
  clientId: "client-b",
  assignedDsp: "staff-b",
  clientName: "Jamie Client",
  dspName: "Robin Staff",
  anomalyCodes: ["missed"],
};

describe("shared shift maintenance table", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 7, 1, 12));
    toast.mockReset();
    modalProps.current = null;
    api.fetchShiftAnomalies.mockReset();
    api.fetchShiftMaintenanceAudit.mockReset();
    api.fetchShiftAnomalies.mockResolvedValue({
      success: true,
      anomalies: [anomaly],
      hasNextPage: false,
      nextCursor: null,
    });
    api.fetchShiftMaintenanceAudit.mockResolvedValue({
      success: true,
      audits: [{
        id: "audit-b",
        agencyId: "agency-b",
        shiftId: "shift-b",
        actorUid: "super-1",
        actorUserType: "super_admin",
        actorName: "Sam Admin",
        action: "update",
        changes: { status: { before: "ongoing", after: "completed" } },
        reason: "Verified record",
        ip: null,
        environment: "test",
        timestamp: "2026-07-30T12:00:00.000Z",
      }],
      hasNextPage: false,
      nextCursor: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("loads all allowed agencies when no agency is selected and keeps row scope for corrections", async () => {
    render(
      <MemoryRouter initialEntries={["/super-admin/shifts/maintenance?startDate=2026-07-03&endDate=2026-08-01"]}>
        <ShiftMaintenancePage isSuperAdmin embedded agencies={agencies} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.fetchShiftAnomalies).toHaveBeenCalledWith({
      from: "2026-07-03",
      to: "2026-08-01",
      limit: 25,
      startAfter: undefined,
    }, expect.objectContaining({ signal: expect.any(AbortSignal) })));
    expect(await screen.findByRole("table", { name: "Problem shifts" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Agency" })).toBeVisible();
    expect(screen.getByText("Beacon Supports")).toBeVisible();
    expect(screen.getByText("Jamie Client")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Review Jamie Client shift" }));
    expect(await screen.findByRole("dialog", { name: "Shift maintenance details" })).toBeVisible();
    expect(modalProps.current).toMatchObject({ agencyId: "agency-b", agencyName: "Beacon Supports" });
  });

  it("loads activity history across all allowed agencies when no agency is selected", async () => {
    render(
      <MemoryRouter initialEntries={["/super-admin/shifts/maintenance"]}>
        <ShiftMaintenancePage isSuperAdmin embedded agencies={agencies} />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("tab", { name: "Activity history" }));
    await waitFor(() => expect(api.fetchShiftMaintenanceAudit).toHaveBeenCalledWith({
      limit: 25,
      startAfter: undefined,
    }, expect.objectContaining({ signal: expect.any(AbortSignal) })));
    expect(await screen.findByRole("table", { name: "Activity history" })).toBeVisible();
    expect(screen.getByText("Beacon Supports")).toBeVisible();
    expect(screen.getByText("Sam Admin")).toBeVisible();
  });

  it("uses maintenance table skeleton rows while issues are loading", async () => {
    api.fetchShiftAnomalies.mockReturnValueOnce(new Promise(() => {}));
    render(
      <MemoryRouter initialEntries={["/super-admin/shifts/maintenance"]}>
        <ShiftMaintenancePage isSuperAdmin embedded agencies={agencies} />
      </MemoryRouter>,
    );

    expect(await screen.findAllByTestId("maintenance-table-skeleton-row")).toHaveLength(6);
    expect(screen.queryByLabelText("Loading maintenance issues")).not.toBeInTheDocument();
  });
});
