import { fireEvent, render, screen } from "@testing-library/react";
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
    const shifts = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, clientName: `Client ${i + 1}`, date: "2026-11-01", status: "pending" }));
    render(<ShiftListCard data={shifts} meta={{ total: 12, hasMore: false }} />);
    expect(screen.getByText("Client 10")).toBeTruthy();
    expect(screen.queryByText("Client 11")).toBeNull();
    fireEvent.click(screen.getByLabelText("Next page"));
    expect(screen.getByText("Client 12")).toBeTruthy();
  });
});
