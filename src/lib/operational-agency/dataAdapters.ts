import { getClientById, listClients } from "@/lib/api/clients";
import {
  createEmployeeActivityLog,
  getEmployeeById,
  listEmployees,
} from "@/lib/api/employees";
import { listServices } from "@/lib/api/services";
import {
  createGoalDocument,
  SubmissionStatus as GoalDocumentStatus,
} from "@/lib/api/goals-and-documents";
import {
  listOperationalServices,
  createOperationalStaffActivity,
  createOperationalShiftGoalDocument,
  getOperationalClientSchedulingContext,
  getOperationalStaffSchedulingContext,
  searchOperationalClients,
  searchOperationalStaff,
} from "@/lib/api/super-admin-operations";
import type {
  OperationalAgencyDataAdapter,
  OperationalFeature,
} from "./types";

export function createAgencyOperationalDataAdapter(agencyId: string): OperationalAgencyDataAdapter {
  return {
    async searchClients(input = {}) {
      const clients = await listClients({
        agencyId,
        type: input.mode ?? undefined,
        status: "active",
        search: input.search,
        limit: input.limit,
        signal: input.signal,
      });
      return {
        items: clients.map((client) => ({
          id: client.id,
          name: `${client.firstName || ""} ${client.lastName || ""}`.trim() || client.id,
          mode: client.type ?? "ddd",
        })),
        truncated: false,
        scanLimit: null,
      };
    },
    async searchStaff(input = {}) {
      const response = await listEmployees({
        agencyId,
        search: input.search,
        role: input.mode === "hha" ? "hha" : input.mode === "ddd" ? "dsp" : undefined,
        limit: input.limit,
        signal: input.signal,
      });
      return {
        items: response.employees.map((employee) => ({
          id: employee.id,
          name: employee.fullName?.trim() || employee.id,
          role: employee.role || (input.mode === "hha" ? "hha" : "dsp"),
        })),
        truncated: false,
        scanLimit: null,
      };
    },
    async listServices(input = {}) {
      const services = await listServices({
        program: input.mode ?? undefined,
        search: input.search,
        limit: input.limit,
      });
      if (input.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      return {
        items: services.map((service) => ({
          id: service.id,
          name: service.name,
          code: service.code,
        })),
        truncated: false,
        scanLimit: null,
      };
    },
    getClientSchedulingContext: (clientId, options = {}) =>
      getClientById(clientId, agencyId, options),
    getStaffSchedulingContext: (staffId, options = {}) =>
      getEmployeeById(staffId, agencyId, options),
    createStaffActivity: (staffId, payload, options = {}) =>
      createEmployeeActivityLog({
        ...payload,
        employeeId: staffId,
        agencyId,
      }, options),
    async createGoalDocument(clientId, shiftId, input, options = {}) {
      const response = await createGoalDocument({
        agencyId,
        clientId,
        shiftId,
        status: GoalDocumentStatus.DRAFT,
        ...input,
      }, options);
      return { id: response.document.id, status: "draft" };
    },
  };
}

export function createSuperAdminOperationalDataAdapter(
  feature: OperationalFeature,
  agencyId: string,
): OperationalAgencyDataAdapter {
  return {
    searchClients: (input = {}) => searchOperationalClients(feature, { agencyId, ...input }),
    searchStaff: (input = {}) => searchOperationalStaff(feature, { agencyId, ...input }),
    listServices: (input = {}) => listOperationalServices(feature, { agencyId, ...input }),
    getClientSchedulingContext: (clientId, options = {}) =>
      getOperationalClientSchedulingContext(agencyId, clientId, options.signal),
    getStaffSchedulingContext: (staffId, options = {}) =>
      getOperationalStaffSchedulingContext(agencyId, staffId, options.signal),
    createStaffActivity: (staffId, payload, options = {}) =>
      createOperationalStaffActivity(agencyId, staffId, {
        ...payload,
        employeeId: staffId,
        agencyId,
      }, options.signal),
    createGoalDocument: (clientId, shiftId, input, options = {}) =>
      createOperationalShiftGoalDocument(agencyId, clientId, shiftId, input, options.signal),
  };
}
