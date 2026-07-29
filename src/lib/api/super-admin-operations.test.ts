import { beforeEach, describe, expect, it, vi } from "vitest";

const { axiosGet, axiosPost } = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  axiosPost: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: { get: axiosGet, post: axiosPost },
}));

import {
  createOperationalStaffActivity,
  getOperationalClientSchedulingContext,
  getOperationalAgencyContext,
  getOperationalStaffSchedulingContext,
  listOperationalAgencies,
  listOperationalServices,
  searchOperationalClients,
  searchOperationalStaff,
} from "./super-admin-operations";

describe("super-admin operational options API", () => {
  beforeEach(() => {
    axiosGet.mockReset();
    axiosPost.mockReset();
  });

  it("uses explicit Shift Management scheduling-context and staff-activity operations", async () => {
    const signal = new AbortController().signal;
    const client = { id: "client-1", firstName: "Ada", services: [] };
    const staff = { id: "staff-1", workAvailability: true };
    const activity = { id: "activity-1", status: "active" };
    axiosGet
      .mockResolvedValueOnce({ data: { success: true, data: client } })
      .mockResolvedValueOnce({ data: { success: true, data: staff } });
    axiosPost.mockResolvedValueOnce({ data: { success: true, data: activity } });

    await expect(getOperationalClientSchedulingContext(
      "shift-management",
      "agency-1",
      "client-1",
      signal,
    )).resolves.toEqual(client);
    await expect(getOperationalStaffSchedulingContext(
      "shift-management",
      "agency-1",
      "staff-1",
      signal,
    )).resolves.toEqual(staff);
    await expect(createOperationalStaffActivity(
      "shift-management",
      "agency-1",
      "staff-1",
      {
        activityType: "Service Log",
        shiftId: "shift-1",
        employeeId: "staff-1",
        agencyId: "agency-1",
      },
      signal,
    )).resolves.toEqual(activity);

    expect(axiosGet).toHaveBeenNthCalledWith(
      1,
      "/superAdminOperations/agencies/agency-1/clients/client-1/scheduling-context",
      { params: { feature: "shift-management" }, signal },
    );
    expect(axiosGet).toHaveBeenNthCalledWith(
      2,
      "/superAdminOperations/agencies/agency-1/staff/staff-1/scheduling-context",
      { params: { feature: "shift-management" }, signal },
    );
    expect(axiosPost).toHaveBeenCalledWith(
      "/superAdminOperations/agencies/agency-1/staff/staff-1/activities",
      {
        activityType: "Service Log",
        shiftId: "shift-1",
        employeeId: "staff-1",
        agencyId: "agency-1",
      },
      { params: { feature: "shift-management" }, signal },
    );
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

  it("preserves bounded option-search metadata and defaults it when the backend omits it", async () => {
    const option = { id: "client-1", name: "Ada Client", mode: "ddd" };
    axiosGet
      .mockResolvedValueOnce({
        data: { success: true, data: [option], truncated: true, scanLimit: 200 },
      })
      .mockResolvedValueOnce({ data: { success: true, data: [] } });

    await expect(
      searchOperationalClients("shift-management", { agencyId: "agency-1" }),
    ).resolves.toEqual({ items: [option], truncated: true, scanLimit: 200 });
    await expect(
      searchOperationalStaff("shift-management", { agencyId: "agency-1" }),
    ).resolves.toEqual({ items: [], truncated: false, scanLimit: null });
  });

  it("preserves agency-list truncation metadata", async () => {
    const agency = {
      id: "agency-a",
      name: "Agency A",
      status: "active",
      supportedClientTypes: ["ddd"],
      timezone: "UTC",
    };
    axiosGet.mockResolvedValue({
      data: {
        success: true,
        data: [agency],
        nextCursor: null,
        truncated: true,
        scanLimit: 200,
      },
    });

    await expect(listOperationalAgencies("shift-management")).resolves.toEqual({
      data: [agency],
      nextCursor: null,
      truncated: true,
      scanLimit: 200,
    });
  });

  it("rejects malformed agency rows, cursors, and truncation metadata", async () => {
    const agency = {
      id: "agency-a",
      name: "Agency A",
      status: "active",
      supportedClientTypes: ["ddd"],
      timezone: "UTC",
    };
    const malformed = [
      { success: true, data: [{ ...agency, supportedClientTypes: ["private"] }] },
      { success: true, data: [agency], nextCursor: 42 },
      { success: true, data: [agency], truncated: true, scanLimit: "200" },
    ];

    for (const data of malformed) {
      axiosGet.mockResolvedValueOnce({ data });
      await expect(listOperationalAgencies("shift-management")).rejects.toThrow(
        "Invalid operational agency response.",
      );
    }
  });

  it("validates the minimal success envelope before returning operational data", async () => {
    axiosGet.mockResolvedValue({ data: { success: true, data: [] } });
    await expect(getOperationalAgencyContext("shift-management", "agency-1")).rejects.toThrow(
      "Invalid operational agency response.",
    );
  });

});
