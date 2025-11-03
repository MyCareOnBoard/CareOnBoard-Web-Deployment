import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountTab from "../components/AccountTab";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";

describe("AccountTab", () => {
  it("renders the Account Info heading", () => {
    // Mock the onSave handler
    const mockOnSave = vi.fn();

    // Render the component
    render(<AccountTab onSave={mockOnSave} />);

    // Check the heading text
    const heading = screen.getByRole("heading", { name: /account info/i });
    expect(heading).toBeInTheDocument();
  });

  it("renders the Save Changes button and triggers onSave", async () => {
    const mockOnSave = vi.fn();
    render(<AccountTab onSave={mockOnSave} />);

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    expect(saveButton).toBeInTheDocument();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it("shows the success modal after saving", async () => {
    const mockOnSave = vi.fn();
    render(<AccountTab onSave={mockOnSave} />);

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    // Success modal should appear
    const successMessage = await screen.findByText(/changes saved/i);
    expect(successMessage).toBeInTheDocument();
  });
});
