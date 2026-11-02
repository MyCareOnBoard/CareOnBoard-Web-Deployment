import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReportPreviewCard from "./ReportPreviewCard";

describe("ReportPreviewCard", () => {
  it("shows rows from a live reply and from a saved chat (rows stored as JSON strings)", () => {
    const base = { title: "Compliance", columns: ["Last", "First"], rowCount: 1, summary: [] };
    const { unmount } = render(<ReportPreviewCard data={{ ...base, rows: [["Jones", "Simon"]] }} />);
    expect(screen.getByText("Jones")).toBeInTheDocument();
    unmount();
    render(<ReportPreviewCard data={{ ...base, rows: ['["Jones","Simon"]', "not json"] }} />);
    expect(screen.getByText("Simon")).toBeInTheDocument();
  });
});
