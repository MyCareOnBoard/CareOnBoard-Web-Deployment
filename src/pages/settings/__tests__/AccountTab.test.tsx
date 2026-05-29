import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountSettingsTab from "@/pages/shared/settings/AccountSettingsTab";
import * as settingsApi from "@/lib/api/settings";
import { getAuth } from "firebase/auth";

vi.mock("@/lib/api/settings");

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));
vi.mock("@/components/modals/DeleteConfirmationModal", () => ({
  DeleteConfirmationModal: ({ isOpen, title, message }: { isOpen: boolean; title?: string; message?: string }) =>
    isOpen ? (
      <div data-testid="delete-confirmation-modal">
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
    ) : null,
}));
vi.mock("@/components/ui/loader", () => ({
  ButtonLoader: () => null,
  PageLoader: () => null,
}));
vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      email: "test@example.com",
      displayName: "Test User",
      uid: "test-uid-123",
    },
    authStateReady: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("AccountSettingsTab", () => {
  const mockAccountInfo = {
    email: "test@example.com",
    fullName: "Test User",
    profilePicture: "https://example.com/profile.jpg",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockClear();
    vi.mocked(settingsApi.getAccountInfo).mockResolvedValue(mockAccountInfo);
  });

  it("should show loading skeleton while fetching account info", () => {
    vi.mocked(settingsApi.getAccountInfo).mockImplementation(() => new Promise(() => {}));

    render(<AccountSettingsTab />);

    expect(screen.getByLabelText(/loading settings/i)).toBeInTheDocument();
  });

  it("should display account information after loading", async () => {
    render(<AccountSettingsTab />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
      expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
    });
  });

  it("should show toast on successful save", async () => {
    const user = userEvent.setup();
    vi.mocked(settingsApi.updateAccountInfo).mockResolvedValue({
      ...mockAccountInfo,
      fullName: "Updated Name",
    });

    render(<AccountSettingsTab />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("Test User");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Name");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Account updated",
        }),
      );
    });
  });

  it("should show confirmation dialog when delete is clicked", async () => {
    const user = userEvent.setup();
    render(<AccountSettingsTab />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: /delete account/i });
    await user.click(deleteButton);

    expect(screen.getByTestId("delete-confirmation-modal")).toBeInTheDocument();
    expect(screen.getByText(/Delete Account\?/)).toBeInTheDocument();
  });
});
