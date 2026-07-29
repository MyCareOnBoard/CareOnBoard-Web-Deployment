import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listClients: vi.fn(),
  getClientById: vi.fn(),
  listEmployees: vi.fn(),
  getEmployeeById: vi.fn(),
  createEmployeeActivityLog: vi.fn(),
  listServices: vi.fn(),
  searchOperationalClients: vi.fn(),
  searchOperationalStaff: vi.fn(),
  listOperationalServices: vi.fn(),
  getOperationalClientSchedulingContext: vi.fn(),
  getOperationalStaffSchedulingContext: vi.fn(),
  createOperationalStaffActivity: vi.fn(),
}));

vi.mock("@/lib/api/clients", () => ({
  listClients: api.listClients,
  getClientById: api.getClientById,
}));
vi.mock("@/lib/api/employees", () => ({
  listEmployees: api.listEmployees,
  getEmployeeById: api.getEmployeeById,
  createEmployeeActivityLog: api.createEmployeeActivityLog,
}));
vi.mock("@/lib/api/services", () => ({ listServices: api.listServices }));
vi.mock("@/lib/api/super-admin-operations", () => ({
  searchOperationalClients: api.searchOperationalClients,
  searchOperationalStaff: api.searchOperationalStaff,
  listOperationalServices: api.listOperationalServices,
  getOperationalClientSchedulingContext: api.getOperationalClientSchedulingContext,
  getOperationalStaffSchedulingContext: api.getOperationalStaffSchedulingContext,
  createOperationalStaffActivity: api.createOperationalStaffActivity,
}));

import {
  createAgencyOperationalDataAdapter,
  createSuperAdminOperationalDataAdapter,
} from "./dataAdapters";

describe("operational scheduling data adapters", () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
  });

  it("keeps agency scheduling context on the existing agency APIs", async () => {
    const signal = new AbortController().signal;
    const client = { id: "client-1" };
    const staff = { id: "staff-1", workAvailability: true };
    const payload = {
      activityType: "Service Log",
      shiftId: "shift-1",
      employeeId: "wrong-staff",
      agencyId: "wrong-agency",
    };
    api.getClientById.mockResolvedValue(client);
    api.getEmployeeById.mockResolvedValue(staff);
    api.createEmployeeActivityLog.mockResolvedValue({ id: "activity-1" });
    const adapter = createAgencyOperationalDataAdapter("agency-1");

    await expect(adapter.getClientSchedulingContext("client-1", { signal })).resolves.toBe(client);
    await expect(adapter.getStaffSchedulingContext("staff-1", { signal })).resolves.toBe(staff);
    await adapter.createStaffActivity("staff-1", payload, { signal });

    expect(api.getClientById).toHaveBeenCalledWith("client-1", "agency-1", { signal });
    expect(api.getEmployeeById).toHaveBeenCalledWith("staff-1", "agency-1", { signal });
    expect(api.createEmployeeActivityLog).toHaveBeenCalledWith({
      ...payload,
      employeeId: "staff-1",
      agencyId: "agency-1",
    }, { signal });
  });

  it("never falls back to directory APIs for a super-admin scheduling operation", async () => {
    const signal = new AbortController().signal;
    const client = { id: "client-1" };
    const staff = { id: "staff-1", workAvailability: true };
    const payload = {
      activityType: "Service Log",
      shiftId: "shift-1",
      employeeId: "wrong-staff",
      agencyId: "wrong-agency",
    };
    api.getOperationalClientSchedulingContext.mockResolvedValue(client);
    api.getOperationalStaffSchedulingContext.mockResolvedValue(staff);
    api.createOperationalStaffActivity.mockResolvedValue({ id: "activity-1", status: "active" });
    const adapter = createSuperAdminOperationalDataAdapter("shift-management", "agency-1");

    await expect(adapter.getClientSchedulingContext("client-1", { signal })).resolves.toBe(client);
    await expect(adapter.getStaffSchedulingContext("staff-1", { signal })).resolves.toBe(staff);
    await adapter.createStaffActivity("staff-1", payload, { signal });

    expect(api.getOperationalClientSchedulingContext).toHaveBeenCalledWith(
      "shift-management", "agency-1", "client-1", signal,
    );
    expect(api.getOperationalStaffSchedulingContext).toHaveBeenCalledWith(
      "shift-management", "agency-1", "staff-1", signal,
    );
    expect(api.createOperationalStaffActivity).toHaveBeenCalledWith(
      "shift-management", "agency-1", "staff-1", {
        ...payload,
        employeeId: "staff-1",
        agencyId: "agency-1",
      }, signal,
    );
    expect(api.getClientById).not.toHaveBeenCalled();
    expect(api.getEmployeeById).not.toHaveBeenCalled();
    expect(api.createEmployeeActivityLog).not.toHaveBeenCalled();
  });
});
