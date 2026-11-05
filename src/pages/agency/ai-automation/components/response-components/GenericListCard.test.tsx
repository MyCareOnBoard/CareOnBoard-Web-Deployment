import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import GenericListCard from "./GenericListCard";
import ShiftListCard from "./ShiftListCard";

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ primary: `DSP ${i + 1}` }));

describe("GenericListCard paging", () => {
  it("shows 10 rows a page and moves between pages", () => {
    render(<GenericListCard data={{ title: "DSPs", rows: rows(15), total: 15, hasMore: false }} />);
    expect(screen.getByText("DSP 10")).toBeTruthy();
    expect(screen.queryByText("DSP 11")).toBeNull();
    expect(screen.getByText("1–10 of 15")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Next page"));
    expect(screen.getByText("DSP 15")).toBeTruthy();
    expect(screen.queryByText("DSP 1")).toBeNull();
    expect(screen.getByText("11–15 of 15")).toBeTruthy();
  });

  it("shows no pager for a short complete list", () => {
    render(<GenericListCard data={{ title: "DSPs", rows: rows(3), total: 3, hasMore: false }} />);
    expect(screen.queryByLabelText("Next page")).toBeNull();
    expect(screen.queryByText("Load all")).toBeNull();
  });

  it("shows the full total and a Load all button when the server has more", () => {
    const onSendMessage = vi.fn();
    render(<GenericListCard data={{ title: "DSPs", rows: rows(25), total: 40, hasMore: true }} onSendMessage={onSendMessage} />);
    expect(screen.getByText("40")).toBeTruthy();
    expect(screen.getByText("1–10 of 40")).toBeTruthy();
    fireEvent.click(screen.getByText("Load all"));
    expect(onSendMessage).toHaveBeenCalledWith("Show all DSPs");
  });

  it("pages shift cards using their meta", () => {
    const shifts = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, clientName: `Client ${i + 1}`, assignedDSP: i === 0 ? "Kennet Smith" : null, date: "2026-11-01", status: "pending" }));
    render(<ShiftListCard data={shifts} meta={{ total: 12, hasMore: false }} />);
    expect(screen.getByText("Client 10")).toBeTruthy();
    expect(screen.queryByText("Client 11")).toBeNull();
    expect(screen.getByText("Kennet Smith")).toBeTruthy();
    expect(screen.getAllByText("Unassigned").length).toBe(9);
    fireEvent.click(screen.getByLabelText("Next page"));
    expect(screen.getByText("Client 12")).toBeTruthy();
  });

  it("links rows to the record's page when the assistant sends one", () => {
    render(
      <MemoryRouter>
        <GenericListCard data={{ title: "DSPs", rows: [{ primary: "Ann Lee", link: { kind: "dsp", id: "emp-1" } }, { primary: "No link" }], total: 2, hasMore: false }} />
        <ShiftListCard data={[{ id: "s1", clientName: "Bo Kim", date: "2026-11-01", status: "pending" }]} meta={{ total: 1, hasMore: false }} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Ann Lee").closest("a")?.getAttribute("href")).toBe("/agency/dsp-management/emp-1");
    expect(screen.getByText("No link").closest("a")).toBeNull();
    expect(screen.getByText("Bo Kim").closest("a")?.getAttribute("href")).toBe("/agency/shifts/s1");
  });

  it("renders plain rows outside a router", () => {
    render(<GenericListCard data={{ title: "DSPs", rows: [{ primary: "Ann Lee", link: { kind: "dsp", id: "emp-1" } }], total: 1, hasMore: false }} />);
    expect(screen.getByText("Ann Lee").closest("a")).toBeNull();
  });

  it("shows column headers and keeps meta values in their columns", () => {
    render(
      <GenericListCard
        data={{
          title: "DSPs",
          columns: ["Name", "Role", "Availability", "Status"],
          rows: [
            { primary: "Ann", meta: ["dsp", "available"], status: "active" },
            { primary: "Bo", status: "inactive" },
          ],
        }}
      />,
    );
    for (const h of ["Name", "Role", "Availability", "Status"]) expect(screen.getByText(h)).toBeTruthy();
    expect(screen.getByText("available")).toBeTruthy();
    // A row with no meta still fills both meta columns.
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("shows clock in and clock out on shift cards", () => {
    render(
      <ShiftListCard
        data={[
          { id: "s1", clientName: "C", date: "2026-11-01", status: "completed", clockedInAt: "2026-11-01T13:05:00Z", clockedOutAt: null },
        ]}
      />,
    );
    expect(screen.getByText("Clock in")).toBeTruthy();
    expect(screen.getByText("Clock out")).toBeTruthy();
    const expected = new Date("2026-11-01T13:05:00Z").toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    expect(screen.getByText(expected)).toBeTruthy();
  });
});
