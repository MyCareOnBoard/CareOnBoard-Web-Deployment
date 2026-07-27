import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import DashboardHeader from "./DashboardHeader";
import { UserType } from "@/utils/auth/types/user.types";

vi.mock("@/lib/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [], unreadCount: 0, loading: false, error: null,
    markAllAsRead: vi.fn(), markAsRead: vi.fn(), clearAll: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe("DashboardHeader", () => {
  it("renders the assigned account role", () => {
    render(
      <MemoryRouter>
        <DashboardHeader
          userName="Ada Admin"
          userRole="Compliance lead"
          userType={UserType.SUPER_ADMIN}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Compliance lead")).toBeVisible();
  });

  it("shows the assigned role in the phone-accessible account menu", () => {
    render(
      <MemoryRouter>
        <DashboardHeader
          userName="Ada Admin"
          userRole="Compliance lead"
          userType={UserType.SUPER_ADMIN}
        />
      </MemoryRouter>,
    );
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Account menu for Ada Admin" }),
    );
    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Ada Admin")).toBeVisible();
    expect(within(menu).getByText("Compliance lead")).toBeVisible();
  });
});
