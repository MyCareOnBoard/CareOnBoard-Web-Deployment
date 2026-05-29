import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationPreferencesTab from "../NotificationPreferencesTab";
import * as settingsApi from "@/lib/api/settings";

vi.mock("@/lib/api/settings");

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));
vi.mock("@/components/ui/loader", () => ({
  ButtonLoader: () => null,
  PageLoader: () => null,
}));

describe("NotificationPreferencesTab", () => {
  const mockSettings = {
    emailNotifications: true,
    inAppNotifications: true,
    appointmentChanges: false,
    systemWarnings: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockClear();
    vi.mocked(settingsApi.getNotificationSettings).mockResolvedValue(mockSettings);
  });

  it("should render notification toggles after loading", async () => {
    render(<NotificationPreferencesTab />);

    await waitFor(() => {
      expect(screen.getByText(/email notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/in-app notifications/i)).toBeInTheDocument();
    });
  });

  it("should show error and retry when load fails", async () => {
    vi.mocked(settingsApi.getNotificationSettings).mockRejectedValue(
      new Error("Failed to load settings"),
    );

    render(<NotificationPreferencesTab />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load settings/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Couldn't load settings",
        variant: "destructive",
      }),
    );
  });

  it("should show error toast when save fails", async () => {
    vi.mocked(settingsApi.updateNotificationSettings).mockRejectedValue(new Error("Network error"));

    const user = userEvent.setup();
    render(<NotificationPreferencesTab />);

    await waitFor(() => {
      expect(screen.getByText(/email notifications/i)).toBeInTheDocument();
    });

    const switches = screen.getAllByRole("switch");
    await user.click(switches[2]!);

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Couldn't save settings",
          variant: "destructive",
        }),
      );
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});
