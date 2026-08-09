import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotesReviewWorkspace from "./NotesReviewWorkspace";

const queryHook = vi.fn();
const refetch = vi.fn();

vi.mock("@/pages/agency/notes/api", () => ({
  useGetAllSubmittedNotesQuery: (params: unknown) => queryHook(params),
  useApproveSubmittedNotesMutation: () => [vi.fn(), { isLoading: false }],
  useRejectSubmittedNotesMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("./SubmittedNoteModal", () => ({
  default: () => null,
}));

const result = {
  data: {
    data: [{
      id: "submission-1",
      agencyId: "agency-1",
      agencyName: "Atlas Care",
      employeeId: "employee-1",
      employeeName: "Taylor Jordan",
      activityLogId: "activity-1",
      activityType: "community-based",
      activityDescription: "Community based services",
      submittedAt: "2026-08-08T12:00:00.000Z",
      noteCount: 1,
      status: "submitted",
    }],
    pagination: { currentPage: 1, totalPages: 2, totalItems: 11, itemsPerPage: 10 },
  },
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch,
};

describe("NotesReviewWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    queryHook.mockReturnValue(result);
  });

  it("passes optional agency and date scope to the list query and hides mutations in read-only mode", () => {
    render(<NotesReviewWorkspace readOnly startDate="2026-08-01" endDate="2026-08-09" showAgencyColumn />);

    expect(queryHook).toHaveBeenCalledWith(expect.objectContaining({
      agencyId: undefined,
      startDate: "2026-08-01",
      endDate: "2026-08-09",
    }));
    expect(screen.getByText("Atlas Care")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^return$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
  });

  it("keeps submitted-row Agency actions and never manually refetches settled query arguments", async () => {
    render(<NotesReviewWorkspace agencyId="agency-1" readOnly={false} />);

    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^approve$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /return/i })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "Taylor" } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(queryHook).toHaveBeenLastCalledWith(expect.objectContaining({
      agencyId: "agency-1",
      search: "Taylor",
      page: 1,
    }));
    expect(refetch).not.toHaveBeenCalled();
  });

  it("resets pagination when the selected agency changes", () => {
    const { rerender } = render(<NotesReviewWorkspace agencyId="agency-1" readOnly />);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(queryHook).toHaveBeenLastCalledWith(expect.objectContaining({
      agencyId: "agency-1",
      page: 2,
    }));

    rerender(<NotesReviewWorkspace agencyId="agency-2" readOnly />);
    expect(queryHook).toHaveBeenLastCalledWith(expect.objectContaining({
      agencyId: "agency-2",
      page: 1,
    }));
  });
});
