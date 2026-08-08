import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const calendarProps = vi.hoisted(() => vi.fn());
const listProps = vi.hoisted(() => vi.fn());

vi.mock("@/pages/super-admin/shift-management/SuperAdminShiftList", () => ({
  SuperAdminShiftScope: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/pages/super-admin/shift-management/SuperAdminShiftsCalendar", () => ({
  default: (props: Record<string, unknown>) => {
    calendarProps(props);
    return <div>Scoped calendar</div>;
  },
}));
vi.mock("@/pages/agency/scheduling/shifts", () => ({
  default: (props: Record<string, unknown>) => {
    listProps(props);
    return <div>Scoped list</div>;
  },
}));
vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  useOperationalAgency: () => ({
    agencyId: "agency-1",
    agency: { id: "agency-1", name: "Atlas Care", supportedClientTypes: ["ddd"] },
    mode: "ddd",
    routes: { details: (shiftId: string) => `/super-admin/shifts/${shiftId}` },
  }),
}));

import SuperAdminClientActivityShifts, { SuperAdminStaffActivityShifts } from "./SuperAdminClientActivityShifts";

describe("SuperAdminClientActivityShifts", () => {
  it("locks both Shift Management views to the client and agency", async () => {
    render(<SuperAdminClientActivityShifts clientId="client-1" agencyId="agency-1" />);

    expect(screen.getByText("Scoped calendar")).toBeVisible();
    expect(calendarProps).toHaveBeenLastCalledWith(expect.objectContaining({
      clientId: "client-1",
      agencies: [expect.objectContaining({ id: "agency-1" })],
      lockAgency: true,
    }));

    await userEvent.click(screen.getByRole("button", { name: "List view" }));

    expect(screen.getByText("Scoped list")).toBeVisible();
    expect(listProps).toHaveBeenLastCalledWith(expect.objectContaining({
      clientId: "client-1",
      dateRange: expect.objectContaining({ startDate: expect.any(String), endDate: expect.any(String) }),
      readOnly: true,
      embedded: true,
    }));
  });

  it("uses the same workspace and date range for an employee", async () => {
    const loadPage = vi.fn(async () => ({ success: true, count: 0, shifts: [], nextCursor: null }));
    render(<SuperAdminStaffActivityShifts employeeId="employee-1" agencyId="agency-1" loadPage={loadPage} />);

    expect(screen.getByRole("group", { name: "Staff shift view" })).toBeVisible();
    expect(calendarProps).toHaveBeenLastCalledWith(expect.objectContaining({
      employeeId: "employee-1",
      lockAgency: true,
      loadPage,
    }));

    await userEvent.click(screen.getByRole("button", { name: "List view" }));

    expect(listProps).toHaveBeenLastCalledWith(expect.objectContaining({
      employeeId: "employee-1",
      dateRange: expect.objectContaining({ startDate: expect.any(String), endDate: expect.any(String) }),
      readOnly: true,
      embedded: true,
      loadPage,
    }));
  });
});
