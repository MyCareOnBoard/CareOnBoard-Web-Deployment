import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useListStaffDirectoryQuery = vi.hoisted(() => vi.fn());
const useListAllAgenciesQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/staff-directory", () => ({ useListStaffDirectoryQuery }));
vi.mock("@/pages/super-admin/agencies/api", () => ({ useListAllAgenciesQuery }));

import StaffDirectory from "./index";

describe("super-admin staff directory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useListAllAgenciesQuery.mockReturnValue({
      data: { agencies: [{ id: "atlas", name: "Atlas Care", status: "active" }] },
      isLoading: false,
    });
    useListStaffDirectoryQuery.mockReturnValue({
      data: {
        success: true,
        staff: [{
          id: "staff-1",
          accountType: "employee",
          name: "Jordan Lee",
          email: "jordan@example.test",
          phone: null,
          role: "Direct support professional",
          status: "active",
          agencyId: "atlas",
          agency: { id: "atlas", name: "Atlas Care" },
          avatarUrl: null,
          createdAt: "2026-07-14T10:00:00.000Z",
        }],
        pagination: { hasMore: false, nextCursor: null },
        stats: { total: 17, active: 13, internalUsers: 2 },
        updatedAt: "2026-08-05T10:00:00.000Z",
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => vi.useRealTimers());

  it("renders the read-only directory and protects its search contract", async () => {
    render(<StaffDirectory />);

    const row = screen.getByRole("row", { name: /Jordan Lee/i });
    expect(within(row).getByText("Employee")).toBeVisible();
    expect(within(row).getByText("Direct support professional")).toBeVisible();
    expect(within(row).getByText("Atlas Care")).toBeVisible();
    expect(screen.getByText("17")).toBeVisible();
    expect(screen.getByText("13")).toBeVisible();
    expect(screen.getByText("2")).toBeVisible();
    expect(screen.queryByRole("button", { name: /add staff|view details|edit|delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /actions?/i })).not.toBeInTheDocument();

    const search = screen.getByRole("textbox", { name: "Search staff" });
    fireEvent.change(search, { target: { value: "JoRdAn" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(useListStaffDirectoryQuery).toHaveBeenLastCalledWith(expect.objectContaining({ search: "jordan" }));

    fireEvent.change(search, { target: { value: "Jordan Lee@" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(screen.getByText("Use one 2–32 character name or email token with letters and numbers only.")).toBeVisible();
    expect(useListStaffDirectoryQuery).toHaveBeenLastCalledWith(expect.objectContaining({ search: "jordan" }));
  });
});
