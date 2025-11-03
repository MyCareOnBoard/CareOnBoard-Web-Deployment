import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import NotificationTab from "../components/NotificationTab";
import "@testing-library/jest-dom";

describe("NotificationTab", () => {
  it("renders the Notification heading", () => {
    // Mock the onSave handler
    const mockOnSave = vi.fn();

    // Render the component
    render(<NotificationTab onSave={mockOnSave} />);

    // Prefer role-based query for headings
    const heading = screen.getByRole("heading", { name: /notification/i });

    expect(heading).toBeInTheDocument();
  });
});
