import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserAccessControlPage from "./index";
import { getSuperAdminAccessConfig, listAssignableAgencies, listSuperAdminUsers } from "@/lib/api/super-admin-users";

vi.mock("@/lib/api/super-admin-users", () => ({
  getSuperAdminAccessConfig: vi.fn(),
  listAssignableAgencies: vi.fn(),
  listSuperAdminUsers: vi.fn(),
  createSuperAdminUser: vi.fn(),
  updateSuperAdminUser: vi.fn(),
  removeSuperAdminUser: vi.fn(),
}));

const config = { accessScopes: ["Compliance Monitor"], roleTemplates: [{ key: "custom", label: "Custom role", accessList: [] }], canAssignAllAgencies: true } as const;

describe("UserAccessControlPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSuperAdminAccessConfig).mockResolvedValue(config as never);
    vi.mocked(listSuperAdminUsers).mockResolvedValue({ success: true, data: [{ id: "u1", uid: "u1", name: "Ada Admin", email: "ada@example.com", role: "Compliance lead", roleTemplate: "custom", accessList: ["Compliance Monitor"], agencyScope: "selected", agencyIds: ["a1", "a2"], isActive: true, createdAt: "", updatedAt: "" }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } });
    vi.mocked(listAssignableAgencies).mockResolvedValue({ agencies: [{ id: "a1", name: "Atlas Care" }, { id: "a2", name: "Birch House" }], nextCursor: null });
  });

  it("loads a backend 10-row page and displays role and agency access", async () => {
    render(<UserAccessControlPage />);
    expect(await screen.findByText("Ada Admin")).toBeVisible();
    expect(screen.getByText("Compliance lead")).toBeVisible();
    expect(screen.getByText("2 agencies")).toBeVisible();
    expect(listSuperAdminUsers).toHaveBeenCalledWith({ page: 1, limit: 10, search: "", isActive: true });
  });

  it("does not load agencies until the modal opens and hydrates edit IDs", async () => {
    render(<UserAccessControlPage />);
    await screen.findByText("Ada Admin");
    expect(listAssignableAgencies).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Edit user Ada Admin" }));
    await waitFor(() => expect(listAssignableAgencies).toHaveBeenCalledWith(expect.objectContaining({ ids: ["a1", "a2"], limit: 50 })));
  });

  it("debounces server-side user search by 300 ms", async () => {
    const user = userEvent.setup();
    render(<UserAccessControlPage />);
    await screen.findByText("Ada Admin");
    const callsBeforeSearch = vi.mocked(listSuperAdminUsers).mock.calls.length;
    await user.type(screen.getByLabelText("Search users"), "ada");
    expect(listSuperAdminUsers).toHaveBeenCalledTimes(callsBeforeSearch);
    await waitFor(() => expect(listSuperAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 10, search: "ada" })), { timeout: 1500 });
  });
});
