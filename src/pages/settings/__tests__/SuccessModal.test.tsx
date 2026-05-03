import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SuccessModal from "../components/SuccessModal";
import "@testing-library/jest-dom";

describe("SuccessModal", () => {
  it("renders success message when visible", () => {
    render(<SuccessModal isVisible={true} onClose={() => {}} />);

    // Check default title and message
    expect(screen.getByText(/changes saved/i)).toBeInTheDocument();
    expect(
      screen.getByText(/the changes you made have been saved/i)
    ).toBeInTheDocument();
  });

  it("calls onClose when the overlay is clicked", () => {
    const mockClose = vi.fn();
    render(<SuccessModal isVisible={true} onClose={mockClose} />);

    // Overlay has data-testid="overlay"
    const overlay = screen.getByTestId("overlay");
    fireEvent.click(overlay);

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("automatically calls onClose after 1.5 seconds", () => {
    vi.useFakeTimers(); // Enable fake timers
    const mockClose = vi.fn();

    render(<SuccessModal isVisible={true} onClose={mockClose} />);

    // Fast-forward time by 1.5 seconds
    vi.advanceTimersByTime(1500);

    expect(mockClose).toHaveBeenCalledTimes(1);

    vi.useRealTimers(); // Restore real timers
  });
});
