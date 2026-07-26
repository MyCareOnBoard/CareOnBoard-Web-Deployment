import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, patch } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("../axios", () => ({ default: { get, post, patch } }));

import {
  createSuperAdminUser,
  getSuperAdminAccessConfig,
  listAssignableAgencies,
  updateSuperAdminUser,
} from "./super-admin-users";

describe("super-admin access API", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    patch.mockReset();
  });

  it("loads the canonical access configuration", async () => {
    const config = {
      accessScopes: ["Compliance Monitor"],
      roleTemplates: [{
        key: "compliance_manager",
        label: "Compliance Manager",
        accessList: ["Compliance Monitor"],
      }],
      canAssignAllAgencies: false,
    };
    get.mockResolvedValueOnce({ data: { success: true, data: config } });

    await expect(getSuperAdminAccessConfig()).resolves.toEqual(config);
    expect(get).toHaveBeenCalledWith("/superAdminUsers/config");
  });

  it("loads an abortable cursor page of assignable agencies", async () => {
    const signal = new AbortController().signal;
    get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ id: "agency-a", name: "Agency A", status: "active" }],
        cursor: "agency-a",
      },
    });

    await expect(listAssignableAgencies({
      search: "Agency",
      cursor: "cursor-a",
      limit: 50,
      ids: ["agency-a", "agency-b"],
      signal,
    })).resolves.toEqual({
      agencies: [{ id: "agency-a", name: "Agency A", status: "active" }],
      nextCursor: "agency-a",
    });

    expect(get).toHaveBeenCalledWith("/superAdminUsers/assignable-agencies", {
      params: {
        search: "Agency",
        cursor: "cursor-a",
        limit: 50,
        ids: "agency-a,agency-b",
      },
      signal,
    });
  });

  it("sends canonical scope fields when creating an administrator", async () => {
    const createPayload = {
      name: "Ada Admin",
      email: "ada@example.com",
      password: "StrongPass123!",
      role: "Compliance Manager",
      roleTemplate: "compliance_manager" as const,
      accessList: ["Compliance Monitor"],
      agencyScope: "selected" as const,
      agencyIds: ["agency-a"],
    };
    post.mockResolvedValueOnce({
      data: { success: true, user: { id: "super-1", ...createPayload } },
    });

    await createSuperAdminUser(createPayload);

    expect(post).toHaveBeenCalledWith("/superAdminUsers/users", createPayload);
  });

  it("sends canonical scope fields when updating an administrator", async () => {
    const updatePayload = {
      role: "Compliance Manager",
      roleTemplate: "compliance_manager" as const,
      accessList: ["Compliance Monitor"],
      agencyScope: "selected" as const,
      agencyIds: ["agency-a"],
    };
    patch.mockResolvedValueOnce({
      data: { success: true, data: { id: "super-1", ...updatePayload } },
    });

    await updateSuperAdminUser("super-1", updatePayload);

    expect(patch).toHaveBeenCalledWith("/superAdminUsers/users/super-1", updatePayload);
  });

  it("normalizes legacy create and update callers to canonical scope fields", async () => {
    const legacyCreatePayload = {
      name: "Legacy Admin",
      email: "legacy@example.com",
      password: "StrongPass123!",
      accessList: ["Reports"],
    };
    const canonicalDefaults = {
      role: "Super Admin",
      roleTemplate: "custom",
      agencyScope: "all",
      agencyIds: [],
    };
    post.mockResolvedValueOnce({
      data: { success: true, user: { id: "super-legacy" } },
    });
    patch.mockResolvedValueOnce({
      data: { success: true, data: { id: "super-legacy" } },
    });

    await createSuperAdminUser(legacyCreatePayload);
    await updateSuperAdminUser("super-legacy", { accessList: ["Reports"] });

    expect(post).toHaveBeenCalledWith("/superAdminUsers/users", {
      ...legacyCreatePayload,
      ...canonicalDefaults,
    });
    expect(patch).toHaveBeenCalledWith("/superAdminUsers/users/super-legacy", {
      accessList: ["Reports"],
      ...canonicalDefaults,
    });
  });});
