import { render, screen } from "@testing-library/react";
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
});
