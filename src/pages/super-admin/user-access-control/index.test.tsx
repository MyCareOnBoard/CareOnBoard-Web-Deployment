import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserAccessControlPage from "./index";
import {
  createSuperAdminUser,
  getSuperAdminAccessConfig,
  listAssignableAgencies,
  listSuperAdminUsers,
  updateSuperAdminUser,
} from "@/lib/api/super-admin-users";

const { dispatch, refreshProfile } = vi.hoisted(() => ({
  dispatch: vi.fn(),
  refreshProfile: vi.fn(),
}));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: { uid: "u1" }, refreshProfile }),
}));
vi.mock("@/store/redux/hooks", () => ({ useAppDispatch: () => dispatch }));

vi.mock("@/lib/api/super-admin-users", () => ({
  getSuperAdminAccessConfig: vi.fn(),
  listAssignableAgencies: vi.fn(),
  listSuperAdminUsers: vi.fn(),
  createSuperAdminUser: vi.fn(),
  updateSuperAdminUser: vi.fn(),
  removeSuperAdminUser: vi.fn(),
}));

const config = {
  accessScopes: ["Compliance Monitor"],
  roleTemplates: [{ key: "custom", label: "Custom role", accessList: [] }],
  canAssignAllAgencies: true,
} as const;
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

describe("UserAccessControlPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshProfile.mockResolvedValue({ uid: "u1" });
    vi.mocked(getSuperAdminAccessConfig).mockResolvedValue(config as never);
    vi.mocked(listSuperAdminUsers).mockResolvedValue({
      success: true,
      data: [
        {
          id: "u1",
          uid: "u1",
          name: "Ada Admin",
          email: "ada@example.com",
          role: "Compliance lead",
          roleTemplate: "custom",
          accessList: ["Compliance Monitor"],
          agencyScope: "selected",
          agencyIds: ["a1", "a2"],
          isActive: true,
          createdAt: "",
          updatedAt: "",
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    vi.mocked(listAssignableAgencies).mockResolvedValue({
      agencies: [
        { id: "a1", name: "Atlas Care" },
        { id: "a2", name: "Birch House" },
      ],
      nextCursor: null,
    });
  });

  it("loads a backend 10-row page and displays role and agency access", async () => {
    render(<UserAccessControlPage />);
    expect(await screen.findByText("Ada Admin")).toBeVisible();
    expect(screen.getByText("Compliance lead")).toBeVisible();
    expect(screen.getByText("2 agencies")).toBeVisible();
    expect(listSuperAdminUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: "",
      isActive: true,
    });
  });

  it("does not load agencies until the modal opens and hydrates edit IDs", async () => {
    render(<UserAccessControlPage />);
    await screen.findByText("Ada Admin");
    expect(listAssignableAgencies).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Edit user Ada Admin" }),
    );
    await waitFor(() =>
      expect(listAssignableAgencies).toHaveBeenCalledWith(
        expect.objectContaining({ ids: ["a1", "a2"], limit: 50 }),
      ),
    );
  });

  it("debounces server-side user search by 300 ms", async () => {
    const user = userEvent.setup();
    render(<UserAccessControlPage />);
    await screen.findByText("Ada Admin");
    const callsBeforeSearch = vi.mocked(listSuperAdminUsers).mock.calls.length;
    await user.type(screen.getByLabelText("Search users"), "ada");
    expect(listSuperAdminUsers).toHaveBeenCalledTimes(callsBeforeSearch);
    await waitFor(
      () =>
        expect(listSuperAdminUsers).toHaveBeenLastCalledWith(
          expect.objectContaining({ page: 1, limit: 10, search: "ada" }),
        ),
      { timeout: 1500 },
    );
  });

  it("keeps the initial skeleton until both users and config settle", async () => {
    const pendingConfig = deferred<typeof config>();
    vi.mocked(getSuperAdminAccessConfig).mockReturnValueOnce(
      pendingConfig.promise as never,
    );
    render(<UserAccessControlPage />);
    expect(screen.getByRole("status", { name: "Loading users" })).toBeVisible();
    await waitFor(() => expect(listSuperAdminUsers).toHaveBeenCalled());
    expect(screen.getByRole("status", { name: "Loading users" })).toBeVisible();
    pendingConfig.resolve(config);
    expect(await screen.findByText("Ada Admin")).toBeVisible();
  });

  it("ignores a stale user-search response", async () => {
    const oldResult = deferred<any>();
    const newResult = deferred<any>();
    vi.mocked(listSuperAdminUsers).mockImplementation((params) => {
      if (params?.search === "old") return oldResult.promise;
      if (params?.search === "new") return newResult.promise;
      return Promise.resolve({
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      });
    });
    const user = userEvent.setup();
    render(<UserAccessControlPage />);
    await screen.findByText("No administrators found");
    await user.type(screen.getByLabelText("Search users"), "old");
    await waitFor(
      () =>
        expect(listSuperAdminUsers).toHaveBeenCalledWith(
          expect.objectContaining({ search: "old" }),
        ),
      { timeout: 1500 },
    );
    await user.clear(screen.getByLabelText("Search users"));
    await user.type(screen.getByLabelText("Search users"), "new");
    await waitFor(
      () =>
        expect(listSuperAdminUsers).toHaveBeenCalledWith(
          expect.objectContaining({ search: "new" }),
        ),
      { timeout: 1500 },
    );
    newResult.resolve({
      success: true,
      data: [
        {
          id: "new",
          uid: "new",
          name: "New Result",
          email: "new@example.com",
          role: "Super Admin",
          roleTemplate: "custom",
          accessList: [],
          agencyScope: "all",
          agencyIds: [],
          isActive: true,
          createdAt: "",
          updatedAt: "",
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    expect(await screen.findByText("New Result")).toBeVisible();
    oldResult.resolve({
      success: true,
      data: [
        {
          id: "old",
          uid: "old",
          name: "Old Result",
          email: "old@example.com",
          role: "Super Admin",
          roleTemplate: "custom",
          accessList: [],
          agencyScope: "all",
          agencyIds: [],
          isActive: true,
          createdAt: "",
          updatedAt: "",
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 20));
    expect(screen.getByText("New Result")).toBeVisible();
    expect(screen.queryByText("Old Result")).not.toBeInTheDocument();
  });

  it("chunks more than 50 selected IDs and keeps hydration independent from agency search", async () => {
    const ids = Array.from({ length: 51 }, (_, index) => `a${index + 1}`);
    vi.mocked(listSuperAdminUsers).mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: "u1",
          uid: "u1",
          name: "Ada Admin",
          email: "ada@example.com",
          role: "Compliance lead",
          roleTemplate: "custom",
          accessList: ["Compliance Monitor"],
          agencyScope: "selected",
          agencyIds: ids,
          isActive: true,
          createdAt: "",
          updatedAt: "",
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const hydration = deferred<any>();
    vi.mocked(listAssignableAgencies).mockImplementation((params) => {
      if (params?.ids?.includes("a51")) return hydration.promise;
      if (params?.ids)
        return Promise.resolve({
          agencies: params.ids.map((id) => ({ id, name: `Agency ${id}` })),
          nextCursor: null,
        });
      return Promise.resolve({
        agencies: [{ id: "search", name: "Search Agency" }],
        nextCursor: null,
      });
    });
    const user = userEvent.setup();
    render(<UserAccessControlPage />);
    await screen.findByText("Ada Admin");
    await user.click(
      screen.getByRole("button", { name: "Edit user Ada Admin" }),
    );
    await waitFor(() =>
      expect(
        vi
          .mocked(listAssignableAgencies)
          .mock.calls.filter(([params]) => params?.ids)
          .map(([params]) => params?.ids?.length),
      ).toEqual(expect.arrayContaining([50, 1])),
    );
    await user.click(screen.getByRole("button", { name: "Choose agencies" }));
    await user.type(screen.getByLabelText("Search agencies"), "search");
    expect(
      vi
        .mocked(listAssignableAgencies)
        .mock.calls.some(([params]) => params?.search === "search"),
    ).toBe(false);
    await waitFor(
      () =>
        expect(listAssignableAgencies).toHaveBeenCalledWith(
          expect.objectContaining({ search: "search" }),
        ),
      { timeout: 1500 },
    );
    hydration.resolve({
      agencies: [{ id: "a51", name: "Agency a51" }],
      nextCursor: null,
    });
    expect((await screen.findAllByText("Agency a51")).length).toBeGreaterThan(0);
  });

  it("ignores an aborted stale agency search response", async () => {
    const stalePage = deferred<any>();
    vi.mocked(listAssignableAgencies).mockImplementation((params) => {
      if (params?.search === "fresh")
        return Promise.resolve({ agencies: [{ id: "fresh", name: "Fresh Agency" }], nextCursor: null });
      return stalePage.promise;
    });
    const user = userEvent.setup();
    render(<UserAccessControlPage />);
    await screen.findByText("Ada Admin");
    await user.click(screen.getByRole("button", { name: "New Access" }));
    await user.click(screen.getByRole("radio", { name: "Selected agencies" }));
    await user.click(screen.getByRole("button", { name: "Choose agencies" }));
    await user.type(screen.getByLabelText("Search agencies"), "fresh");
    expect(await screen.findByText("Fresh Agency", {}, { timeout: 1500 })).toBeVisible();
    stalePage.resolve({ agencies: [{ id: "stale", name: "Stale Agency" }], nextCursor: null });
    await new Promise((resolve) => window.setTimeout(resolve, 20));
    expect(screen.getByText("Fresh Agency")).toBeVisible();
    expect(screen.queryByText("Stale Agency")).not.toBeInTheDocument();
  });

  it("keeps hydration and page errors independently visible and retryable", async () => {
    let hydrationAttempts = 0;
    vi.mocked(listAssignableAgencies).mockImplementation((params) => {
      if (params?.ids) {
        hydrationAttempts += 1;
        return hydrationAttempts === 1
          ? Promise.reject(new Error("Selected agencies failed"))
          : Promise.resolve({ agencies: params.ids.map((id) => ({ id, name: `Recovered ${id}` })), nextCursor: null });
      }
      if (params?.search === "fresh")
        return Promise.resolve({ agencies: [{ id: "fresh", name: "Fresh Agency" }], nextCursor: null });
      if (params?.search === "broken")
        return Promise.reject(new Error("Agency search failed"));
      return Promise.resolve({ agencies: [{ id: "base", name: "Base Agency" }], nextCursor: null });
    });
    const user = userEvent.setup();
    render(<UserAccessControlPage />);
    await screen.findByText("Ada Admin");
    await user.click(screen.getByRole("button", { name: "Edit user Ada Admin" }));
    await user.click(screen.getByRole("button", { name: "Choose agencies" }));
    expect(await screen.findByText("Selected agencies failed")).toBeVisible();

    const search = screen.getByLabelText("Search agencies");
    await user.type(search, "fresh");
    expect(await screen.findByText("Fresh Agency", {}, { timeout: 1500 })).toBeVisible();
    expect(screen.getByText("Selected agencies failed")).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry selected agencies" })).toBeVisible();

    await user.clear(search);
    await user.type(search, "broken");
    expect(await screen.findByText("Agency search failed", {}, { timeout: 1500 })).toBeVisible();
    expect(screen.getByText("Selected agencies failed")).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry agency search" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Retry selected agencies" }));
    expect(await screen.findByRole("button", { name: "Remove Recovered a1" })).toBeVisible();
    expect(screen.queryByText("Selected agencies failed")).not.toBeInTheDocument();
    expect(screen.getByText("Agency search failed")).toBeVisible();
  });

  it("renders a 50-row agency page, appends the cursor page, and preserves selected chips", async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => ({
      id: `p${index}`,
      name: `Page Agency ${index}`,
    }));
    vi.mocked(listAssignableAgencies).mockImplementation((params) =>
      Promise.resolve(
        params?.cursor
          ? {
              agencies: [{ id: "p50", name: "Page Agency 50" }],
              nextCursor: null,
            }
          : { agencies: firstPage, nextCursor: "next" },
      ),
    );
    const user = userEvent.setup();
    render(<UserAccessControlPage />);
    await screen.findByText("Ada Admin");
    await user.click(screen.getByRole("button", { name: "New Access" }));
    await user.click(screen.getByRole("radio", { name: "Selected agencies" }));
    await user.click(screen.getByRole("button", { name: "Choose agencies" }));
    expect((await screen.findAllByRole("checkbox")).length).toBe(51);
    await user.click(screen.getByRole("checkbox", { name: "Page Agency 0" }));
    await user.click(
      screen.getByRole("button", { name: "Load more agencies" }),
    );
    expect(
      await screen.findByRole("checkbox", { name: "Page Agency 50" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Remove Page Agency 0" }),
    ).toBeVisible();
  });

  it("sends complete create and update payloads", async () => {
    vi.mocked(createSuperAdminUser).mockResolvedValue({} as never);
    vi.mocked(updateSuperAdminUser).mockResolvedValue({} as never);
    const user = userEvent.setup();
    render(<UserAccessControlPage />);
    await screen.findByText("Ada Admin");
    await user.click(screen.getByRole("button", { name: "New Access" }));
    await user.type(screen.getByLabelText("Name"), "New Admin");
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "StrongPass123!");
    await user.type(screen.getByLabelText("Custom role title"), "Quality Lead");
    await user.click(
      screen.getByRole("checkbox", { name: "Compliance Monitor" }),
    );
    await user.click(screen.getByRole("button", { name: "Add User" }));
    await waitFor(() =>
      expect(createSuperAdminUser).toHaveBeenCalledWith({
        name: "New Admin",
        email: "new@example.com",
        password: "StrongPass123!",
        role: "Quality Lead",
        roleTemplate: "custom",
        accessList: ["Compliance Monitor"],
        agencyScope: "all",
        agencyIds: [],
        phone: "",
      }),
    );
  }, 15000);

  it("sends the complete edit payload without an empty password", async () => {
    vi.mocked(updateSuperAdminUser).mockResolvedValue({} as never);
    const pendingRefresh = deferred<any>();
    refreshProfile.mockReturnValueOnce(pendingRefresh.promise);
    const user = userEvent.setup();
    render(<UserAccessControlPage />);
    await screen.findByText("Ada Admin");
    await user.click(screen.getByRole("button", { name: "Edit user Ada Admin" }));
    await user.click(screen.getByRole("button", { name: "Update User" }));
    await waitFor(() =>
      expect(updateSuperAdminUser).toHaveBeenCalledWith("u1", {
        name: "Ada Admin",
        role: "Compliance lead",
        roleTemplate: "custom",
        accessList: ["Compliance Monitor"],
        agencyScope: "selected",
        agencyIds: ["a1", "a2"],
      }),
    );
    expect(dispatch).not.toHaveBeenCalled();
    pendingRefresh.resolve({ uid: "u1" });
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledOnce());
    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(10));
    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual([
      "superAdminApi/resetApiState",
      "superAdminDashboardApi/resetApiState",
      "complianceApi/resetApiState",
      "billingMonitorApi/resetApiState",
      "clientsApi/resetApiState",
      "reportsApi/resetApiState",
      "agencyStaffApi/resetApiState",
      "userMessagingApi/resetApiState",
      "billingExpensesApi/resetApiState",
      "servicesApi/resetApiState",
    ]);
  });

  it("commits a self-edit even when profile refresh fails and retries only refresh", async () => {
    vi.mocked(updateSuperAdminUser).mockResolvedValue({} as never);
    refreshProfile.mockRejectedValueOnce(new Error("Profile refresh failed"));
    const user = userEvent.setup();
    render(<UserAccessControlPage />);
    await screen.findByText("Ada Admin");
    await user.click(screen.getByRole("button", { name: "Edit user Ada Admin" }));
    await user.click(screen.getByRole("button", { name: "Update User" }));

    expect(await screen.findByRole("heading", { name: "User updated" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "saved, but your access could not be refreshed",
    );
    expect(updateSuperAdminUser).toHaveBeenCalledOnce();

    refreshProfile.mockResolvedValueOnce({ uid: "u1" });
    await user.click(screen.getByRole("button", { name: "Retry access refresh" }));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(updateSuperAdminUser).toHaveBeenCalledOnce();
  });

  it("clears an earlier warning for a new committed edit and ignores the old session completion", async () => {
    vi.mocked(updateSuperAdminUser).mockResolvedValue({} as never);
    const firstRefresh = deferred<any>();
    const secondRefresh = deferred<any>();
    refreshProfile
      .mockReturnValueOnce(firstRefresh.promise)
      .mockReturnValueOnce(secondRefresh.promise);
    const user = userEvent.setup();
    render(<UserAccessControlPage />);
    await screen.findByText("Ada Admin");

    await user.click(screen.getByRole("button", { name: "Edit user Ada Admin" }));
    await user.click(screen.getByRole("button", { name: "Update User" }));
    expect(await screen.findByText("Refreshing access...")).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "User updated" }))
        .not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Edit user Ada Admin" }));
    await user.click(screen.getByRole("button", { name: "Update User" }));
    expect(await screen.findByText("Refreshing access...")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    firstRefresh.reject(new Error("stale refresh failed"));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Refreshing access...")).toBeVisible();

    secondRefresh.resolve({ uid: "u1" });
    await waitFor(() =>
      expect(screen.queryByText("Refreshing access...")).not.toBeInTheDocument(),
    );
    expect(dispatch).toHaveBeenCalledTimes(10);
    expect(updateSuperAdminUser).toHaveBeenCalledTimes(2);
  }, 15000);
});
