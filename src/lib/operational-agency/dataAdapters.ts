import { listClients } from "@/lib/api/clients";
import { listEmployees } from "@/lib/api/employees";
import { listServices } from "@/lib/api/services";
import {
  listOperationalServices,
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
  };
}
