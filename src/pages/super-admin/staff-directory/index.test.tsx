import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

const useListStaffDirectoryQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/staff-directory", () => ({ useListStaffDirectoryQuery }));

import StaffDirectory from "./index";

describe("super-admin staff directory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useListStaffDirectoryQuery.mockReturnValue({
      data: {
        success: true,
        agencies: [
          { id: "atlas", name: "Atlas Care", status: "active" },
          { id: "legacy", name: "Legacy Care", status: "inactive" },
        ],
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
    render(<MemoryRouter><StaffDirectory /></MemoryRouter>);

    const row = screen.getByRole("row", { name: /Jordan Lee/i });
    expect(within(row).getByText("Employee")).toBeVisible();
    expect(within(row).getByText("Direct support professional")).toBeVisible();
    expect(within(row).getByText("Atlas Care")).toBeVisible();
    expect(screen.getByText("17")).toBeVisible();
    expect(screen.getByText("13")).toBeVisible();
    expect(screen.getByText("2")).toBeVisible();
    expect(within(row).getByRole("link", { name: /view details/i })).toHaveAttribute("href", "/super-admin/staff-1");
    expect(within(row).getByRole("link", { name: /view details/i })).toHaveClass("whitespace-nowrap");
    expect(within(row).queryByRole("link", { name: /Jordan Lee/i })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /actions?/i })).toBeVisible();
    expect(screen.getByRole("option", { name: "Legacy Care" })).toHaveValue("legacy");

    const search = screen.getByRole("textbox", { name: "Search staff" });
    fireEvent.change(search, { target: { value: "JoRdAn" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(useListStaffDirectoryQuery).toHaveBeenLastCalledWith(expect.objectContaining({ search: "jordan" }));

    fireEvent.change(search, { target: { value: "test_agency@test.com" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(useListStaffDirectoryQuery).toHaveBeenLastCalledWith(expect.objectContaining({ search: "test_agency@test.com" }));

    fireEvent.change(search, { target: { value: "test_ca" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(search).not.toHaveAttribute("aria-invalid");
    expect(useListStaffDirectoryQuery).toHaveBeenLastCalledWith(expect.objectContaining({ search: "test_ca" }));

    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "internal_user" } });
    expect(useListStaffDirectoryQuery).toHaveBeenLastCalledWith(expect.objectContaining({ accountType: "internal_user" }));

    expect(screen.queryByLabelText("Role")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sort by created date: Newest first" }));
    fireEvent.click(screen.getByRole("button", { name: "Oldest first" }));
    expect(useListStaffDirectoryQuery).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "asc" }));

    fireEvent.change(search, { target: { value: "Jordan Lee@" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(screen.getByText("Search by one name, email term, email fragment, or complete email address.")).toBeVisible();
    expect(screen.queryByRole("row", { name: /Jordan Lee/i })).not.toBeInTheDocument();
    expect(screen.queryByText("17")).not.toBeInTheDocument();
    expect(screen.queryByText("Page 1")).not.toBeInTheDocument();
  });
});
