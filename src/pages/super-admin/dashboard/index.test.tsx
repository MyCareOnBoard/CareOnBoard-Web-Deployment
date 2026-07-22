import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useGetAttendanceReportQuery,
  useGetShiftStatsQuery,
  useGetSuperAdminStatsQuery,
} from "./api";
import SuperAdminDashboard from "./index";

vi.mock("./api", () => ({
  useGetAttendanceReportQuery: vi.fn(),
  useGetShiftStatsQuery: vi.fn(),
  useGetSuperAdminStatsQuery: vi.fn(),
}));

vi.mock("./components/NetworkComplianceSection", () => ({
  default: () => (
    <section>
      <h2>Network compliance</h2>
    </section>
  ),
}));

describe("SuperAdminDashboard", () => {
  beforeEach(() => {
    vi.mocked(useGetSuperAdminStatsQuery).mockReturnValue({
      data: {
        success: true,
        stats: {
          totalAgencies: 28,
          totalStaff: 846,
          totalClients: 1204,
          ongoingIncidents: 12,
          scheduledIncidents: 19,
          pendingNotes: 14,
          pendingTimesheets: 11,
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useGetShiftStatsQuery).mockReturnValue({
      data: {
        success: true,
        buckets: [{ time: "9 AM", scheduled: 3, completed: 2 }],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useGetAttendanceReportQuery).mockReturnValue({
      data: {
        success: true,
        data: [{ time: "Morning", days: [0, 1, 2, 3, 2, 1, 0] }],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
  });

  it("renders the approved operational-priority hierarchy", () => {
    render(<SuperAdminDashboard />);

    expect(
      screen.getAllByRole("heading").map((heading) => heading.textContent),
    ).toEqual([
      "Dashboard",
      "Network overview",
      "Network compliance",
      "Operational workload",
      "Shift activity",
      "Attendance report",
    ]);
    expect(screen.getByText("1,204")).toBeInTheDocument();
    expect(screen.getByText("37")).toBeInTheDocument();
  });

  it("labels dashboard regions and visual data for assistive technology", () => {
    render(<SuperAdminDashboard />);

    expect(
      screen.getByRole("region", { name: "Network overview" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("9 AM: 3 scheduled, 2 completed"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Morning, day 1: attendance level 0"),
    ).toBeInTheDocument();
  });

  it("uses shared skeleton shapes for every initial loading state", () => {
    vi.mocked(useGetSuperAdminStatsQuery).mockReturnValue({
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useGetShiftStatsQuery).mockReturnValue({
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useGetAttendanceReportQuery).mockReturnValue({
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    } as never);

    render(<SuperAdminDashboard />);

    expect(screen.getAllByTestId("dashboard-overview-skeleton")).toHaveLength(4);
    expect(screen.getAllByTestId("workload-skeleton")).toHaveLength(2);
    expect(screen.getByTestId("shift-skeleton")).toBeInTheDocument();
    expect(screen.getAllByTestId("attendance-skeleton-row")).toHaveLength(4);
  });

  it("keeps query failures independently retryable", () => {
    const retryStats = vi.fn();
    const retryShifts = vi.fn();
    const retryAttendance = vi.fn();
    vi.mocked(useGetSuperAdminStatsQuery).mockReturnValue({
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch: retryStats,
    } as never);
    vi.mocked(useGetShiftStatsQuery).mockReturnValue({
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch: retryShifts,
    } as never);
    vi.mocked(useGetAttendanceReportQuery).mockReturnValue({
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch: retryAttendance,
    } as never);

    render(<SuperAdminDashboard />);

    fireEvent.click(
      screen.getByRole("button", { name: "Retry network overview" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retry operational workload" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retry shift activity" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retry attendance report" }),
    );

    expect(retryStats).toHaveBeenCalledTimes(2);
    expect(retryShifts).toHaveBeenCalledOnce();
    expect(retryAttendance).toHaveBeenCalledOnce();
  });

  it("shows calm empty states for missing activity data", () => {
    vi.mocked(useGetShiftStatsQuery).mockReturnValue({
      data: { success: true, buckets: [] },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useGetAttendanceReportQuery).mockReturnValue({
      data: { success: true, data: [] },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as never);

    render(<SuperAdminDashboard />);

    expect(
      screen.getByText("No shift activity in the last 24 hours."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No attendance activity is available."),
    ).toBeInTheDocument();
  });
});
