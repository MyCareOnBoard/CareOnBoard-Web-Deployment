import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SuperAdminNotesPage from "./index";

const routing = vi.hoisted(() => ({
  location: { pathname: "/super-admin/notes", search: "?id=note-4" },
  navigate: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useLocation: () => routing.location,
    useNavigate: () => routing.navigate,
  };
});

vi.mock("@/pages/super-admin/shift-management/ShiftManagementHeader", () => ({
  default: ({
    title,
    feature,
    dateRange,
    selectedAgencyIds,
    onAgencySelectionChange,
    onDateRangeChange,
    dateRangeControlLabel,
    dateRangeDialogTitle,
    dateRangeDescription,
  }: any) => (
    <section aria-label="Notes operations header">
      <p>{title}</p>
      <p>{feature}</p>
      <p>{dateRangeControlLabel}</p>
      <p>{dateRangeDialogTitle}</p>
      <p>{dateRangeDescription}</p>
      <p>{selectedAgencyIds.join(",") || "all agencies"}</p>
      <button type="button" onClick={() => onAgencySelectionChange(["agency-1"])}>Select agency</button>
      <button type="button" onClick={() => onAgencySelectionChange([])}>Clear agency</button>
      <button type="button" onClick={() => onDateRangeChange({ startDate: "2026-08-03", endDate: "2026-08-07" })}>Change dates</button>
    </section>
  ),
}));

vi.mock("@/pages/shared/notes/NotesReviewWorkspace", () => ({
  default: ({ agencyId, startDate, endDate, readOnly, showAgencyColumn }: any) => (
    <output>
      {JSON.stringify({ agencyId, startDate, endDate, readOnly, showAgencyColumn })}
    </output>
  ),
}));

describe("SuperAdminNotesPage", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 7, 9, 12));
    routing.location = { pathname: "/super-admin/notes", search: "?id=note-4" };
    routing.navigate.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the read-only aggregate workspace with Notes-specific operations copy", () => {
    render(<MemoryRouter><SuperAdminNotesPage /></MemoryRouter>);

    expect(screen.getByRole("region", { name: "Notes operations header" })).toHaveTextContent("Notes");
    expect(screen.getByText("notes")).toBeVisible();
    expect(screen.getByText("Change notes date range")).toBeVisible();
    expect(screen.getByText("Select notes date range")).toBeVisible();
    expect(screen.getByText("Choose the dates to show in Notes")).toBeVisible();
    expect(screen.getByText("all agencies")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent('"readOnly":true');
    expect(screen.getByRole("status")).toHaveTextContent('"showAgencyColumn":true');
  });

  it("renders a selected agency without the aggregate Agency column", () => {
    routing.location = {
      pathname: "/super-admin/notes",
      search: "?agencyId=agency-1&startDate=2026-08-01&endDate=2026-08-09",
    };

    render(<MemoryRouter><SuperAdminNotesPage /></MemoryRouter>);

    expect(screen.getByRole("region", { name: "Notes operations header" })).toHaveTextContent("agency-1");
    expect(screen.getByRole("status")).toHaveTextContent('"agencyId":"agency-1"');
    expect(screen.getByRole("status")).toHaveTextContent('"showAgencyColumn":false');
  });

  it("keeps the note detail id when changing scope or dates", async () => {
    const user = userEvent.setup();
    const view = render(<MemoryRouter><SuperAdminNotesPage /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Select agency" }));
    expect(routing.navigate).toHaveBeenLastCalledWith({
      pathname: "/super-admin/notes",
      search: "?id=note-4&startDate=2026-07-11&endDate=2026-08-09&agencyId=agency-1",
    });

    routing.location = { pathname: "/super-admin/notes", search: "?id=note-4&agencyId=agency-1&startDate=2026-07-11&endDate=2026-08-09" };
    view.rerender(<MemoryRouter><SuperAdminNotesPage /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Change dates" }));
    expect(routing.navigate).toHaveBeenLastCalledWith({
      pathname: "/super-admin/notes",
      search: "?id=note-4&agencyId=agency-1&startDate=2026-08-03&endDate=2026-08-07",
    });
  });
});
