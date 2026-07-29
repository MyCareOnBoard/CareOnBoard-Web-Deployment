import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentType } from "@/lib/api/goals-and-documents";

const api = vi.hoisted(() => ({
  listClients: vi.fn(),
  getClientById: vi.fn(),
  listEmployees: vi.fn(),
  getEmployeeById: vi.fn(),
  createEmployeeActivityLog: vi.fn(),
  createGoalDocument: vi.fn(),
  listServices: vi.fn(),
  searchOperationalClients: vi.fn(),
  searchOperationalStaff: vi.fn(),
  listOperationalServices: vi.fn(),
  getOperationalClientSchedulingContext: vi.fn(),
  getOperationalStaffSchedulingContext: vi.fn(),
  createOperationalStaffActivity: vi.fn(),
  createOperationalShiftGoalDocument: vi.fn(),
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
vi.mock("@/lib/api/goals-and-documents", () => ({
  createGoalDocument: api.createGoalDocument,
  SubmissionStatus: { DRAFT: "draft" },
}));
vi.mock("@/lib/api/super-admin-operations", () => ({
  searchOperationalClients: api.searchOperationalClients,
  searchOperationalStaff: api.searchOperationalStaff,
  listOperationalServices: api.listOperationalServices,
  getOperationalClientSchedulingContext: api.getOperationalClientSchedulingContext,
  getOperationalStaffSchedulingContext: api.getOperationalStaffSchedulingContext,
  createOperationalStaffActivity: api.createOperationalStaffActivity,
  createOperationalShiftGoalDocument: api.createOperationalShiftGoalDocument,
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
    api.createGoalDocument.mockResolvedValue({
      document: { id: "goal-1", status: "draft" },
    });
    const adapter = createAgencyOperationalDataAdapter("agency-1");

    await expect(adapter.getClientSchedulingContext("client-1", { signal })).resolves.toBe(client);
    await expect(adapter.getStaffSchedulingContext("staff-1", { signal })).resolves.toBe(staff);
    await adapter.createStaffActivity("staff-1", payload, { signal });
    await expect(adapter.createGoalDocument(
      "client-1",
      "shift-1",
      {
        documentType: "natural_supports_training" as DocumentType,
        metadata: {
          name: "Ada",
          birthDate: "",
          ispOutcome: "",
          nameOfTrainer: "",
          trainingParticipants: [],
          trainings: [],
          completedBy: "",
          completionDate: "",
        },
      },
      { signal },
    )).resolves.toEqual({ id: "goal-1", status: "draft" });

    expect(api.getClientById).toHaveBeenCalledWith("client-1", "agency-1", { signal });
    expect(api.getEmployeeById).toHaveBeenCalledWith("staff-1", "agency-1", { signal });
    expect(api.createEmployeeActivityLog).toHaveBeenCalledWith({
      ...payload,
      employeeId: "staff-1",
      agencyId: "agency-1",
    }, { signal });
    expect(api.createGoalDocument).toHaveBeenCalledWith({
      agencyId: "agency-1",
      clientId: "client-1",
      shiftId: "shift-1",
      status: "draft",
      documentType: "natural_supports_training",
      metadata: {
        name: "Ada",
        birthDate: "",
        ispOutcome: "",
        nameOfTrainer: "",
        trainingParticipants: [],
        trainings: [],
        completedBy: "",
        completionDate: "",
      },
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
    api.createOperationalShiftGoalDocument.mockResolvedValue({ id: "goal-1", status: "draft" });
    const adapter = createSuperAdminOperationalDataAdapter("shift-management", "agency-1");

    await expect(adapter.getClientSchedulingContext("client-1", { signal })).resolves.toBe(client);
    await expect(adapter.getStaffSchedulingContext("staff-1", { signal })).resolves.toBe(staff);
    await adapter.createStaffActivity("staff-1", payload, { signal });
    await expect(adapter.createGoalDocument(
      "client-1",
      "shift-1",
      {
        documentType: "natural_supports_training" as DocumentType,
        metadata: {
          name: "Ada",
          birthDate: "",
          ispOutcome: "",
          nameOfTrainer: "",
          trainingParticipants: [],
          trainings: [],
          completedBy: "",
          completionDate: "",
        },
      },
      { signal },
    )).resolves.toEqual({ id: "goal-1", status: "draft" });

    expect(api.getOperationalClientSchedulingContext).toHaveBeenCalledWith(
      "agency-1", "client-1", signal,
    );
    expect(api.getOperationalStaffSchedulingContext).toHaveBeenCalledWith(
      "agency-1", "staff-1", signal,
    );
    expect(api.createOperationalStaffActivity).toHaveBeenCalledWith(
      "agency-1", "staff-1", {
        ...payload,
        employeeId: "staff-1",
        agencyId: "agency-1",
      }, signal,
    );
    expect(api.createOperationalShiftGoalDocument).toHaveBeenCalledWith(
      "agency-1",
      "client-1",
      "shift-1",
      {
        documentType: "natural_supports_training",
        metadata: {
          name: "Ada",
          birthDate: "",
          ispOutcome: "",
          nameOfTrainer: "",
          trainingParticipants: [],
          trainings: [],
          completedBy: "",
          completionDate: "",
        },
      },
      signal,
    );
    expect(api.getClientById).not.toHaveBeenCalled();
    expect(api.getEmployeeById).not.toHaveBeenCalled();
    expect(api.createEmployeeActivityLog).not.toHaveBeenCalled();
    expect(api.createGoalDocument).not.toHaveBeenCalled();
  });
});
