import { beforeEach, describe, expect, it, vi } from "vitest";

const axiosGet = vi.hoisted(() => vi.fn());

vi.mock("@/lib/axios", () => ({
  default: { get: axiosGet },
}));

import {
  getOperationalAgencyContext,
  listOperationalAgencies,
  listOperationalServices,
  searchOperationalClients,
  searchOperationalStaff,
} from "./super-admin-operations";

describe("super-admin operational options API", () => {
  beforeEach(() => {
    axiosGet.mockReset();
  });

  it("lists agencies with the exact feature and repeated ids serialization", async () => {
    axiosGet.mockResolvedValue({
      data: { success: true, data: [{ id: "a", name: "Agency A", status: "active", supportedClientTypes: [], timezone: "UTC" }] },
    });

    await expect(
      listOperationalAgencies("shift-management", {
        ids: ["b", "a", "b"],
        search: "care",
        cursor: "after-a",
        limit: 20,
      }),
    ).resolves.toMatchObject({ data: [{ id: "a" }] });

    expect(axiosGet).toHaveBeenCalledWith("/superAdminOperations/agencies", expect.objectContaining({
      params: { feature: "shift-management", ids: ["b", "a"], search: "care", cursor: "after-a", limit: 20 },
      paramsSerializer: { indexes: null },
    }));
  });

  it("passes the selected agency, explicit feature, search, mode, and AbortSignal to option requests", async () => {
    const signal = new AbortController().signal;
    axiosGet.mockResolvedValue({ data: { success: true, data: [] } });

    await searchOperationalClients("billing-management", {
      agencyId: "agency-1",
      search: "Ada",
      mode: "hha",
      limit: 5,
      signal,
    });
    await searchOperationalStaff("shift-management", { agencyId: "agency-1", signal });
    await listOperationalServices("billing-management", { agencyId: "agency-1", mode: "ddd", signal });

    expect(axiosGet).toHaveBeenNthCalledWith(1, "/superAdminOperations/agencies/agency-1/clients", {
      params: { feature: "billing-management", q: "Ada", mode: "hha", limit: 5 }, signal,
    });
    expect(axiosGet).toHaveBeenNthCalledWith(2, "/superAdminOperations/agencies/agency-1/staff", {
      params: { feature: "shift-management" }, signal,
    });
    expect(axiosGet).toHaveBeenNthCalledWith(3, "/superAdminOperations/agencies/agency-1/services", {
      params: { feature: "billing-management", mode: "ddd" }, signal,
    });
  });

  it("validates the minimal success envelope before returning operational data", async () => {
    axiosGet.mockResolvedValue({ data: { success: true, data: [] } });
    await expect(getOperationalAgencyContext("shift-management", "agency-1")).rejects.toThrow(
      "Invalid operational agency response.",
    );
  });

});
