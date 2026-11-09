import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import DashboardHeader from "./DashboardHeader";
import { UserType } from "@/utils/auth/types/user.types";

const notifications = vi.hoisted(() => ({ unreadCount: 0 }));

vi.mock("@/lib/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [], unreadCount: notifications.unreadCount, loading: false, error: null,
    markAllAsRead: vi.fn(), markAsRead: vi.fn(), clearAll: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/providers/ThemeProvider", () => ({ useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }) }));

const renderPanel = () => render(<MemoryRouter>
  <DashboardHeader userName="Fred Fafa" userRole="DSP" userType={UserType.EMPLOYEE} variant="panel" accountMenu={<p>menu</p>} />
</MemoryRouter>);

it("keeps the panel header to the bell and account menu", () => {
  renderPanel();
  expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "CareOnboardConnect Login" })).not.toBeInTheDocument();
});

it("names the unread count on the bell when there are notifications", () => {
  notifications.unreadCount = 3;
  renderPanel();
  expect(screen.getByRole("button", { name: "Notifications, 3 unread" })).toBeInTheDocument();
});
