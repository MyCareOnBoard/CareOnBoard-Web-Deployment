import type { AgencyMode } from "@/store/redux/agencyModeSlice";

export type OperationalActor = "agency" | "super_admin";
export type OperationalFeature = "shift-management" | "billing-management";

export interface OperationalAgencySummary {
  id: string;
  name: string;
  status: "active" | string;
  supportedClientTypes: readonly ("ddd" | "hha")[];
  timezone: string;
}

export interface OperationalClientOption {
  id: string;
  name: string;
  mode: string;
}

export interface OperationalStaffOption {
  id: string;
  name: string;
  role: string;
}

export interface OperationalServiceOption {
  id: string;
  name: string;
  code: string;
}

export interface OperationalOptionPage<T> {
  items: T[];
  truncated: boolean;
  scanLimit: number | null;
}

export interface OperationalLookupInput {
  search?: string;
  mode?: AgencyMode;
  limit?: number;
  signal?: AbortSignal;
}

export interface OperationalAgencyDataAdapter {
  searchClients(input?: OperationalLookupInput): Promise<OperationalOptionPage<OperationalClientOption>>;
  searchStaff(input?: OperationalLookupInput): Promise<OperationalOptionPage<OperationalStaffOption>>;
  listServices(input?: OperationalLookupInput): Promise<OperationalOptionPage<OperationalServiceOption>>;
}

export interface OperationalCapabilities {
  canManageShifts: boolean;
  canManageBilling: boolean;
  shiftMaintenance: boolean;
}

export interface OperationalShiftRoutes {
  index(search?: string): string;
  list(search?: string): string;
  approvals(search?: string): string;
  activityLogs(search?: string): string;
  maintenance(search?: string): string;
  details(shiftId: string, search?: string): string;
}

export interface OperationalAgencyContextValue {
  actor: OperationalActor;
  agencyId: string;
  agency: OperationalAgencySummary;
  mode: AgencyMode | null;
  routes: OperationalShiftRoutes;
  capabilities: OperationalCapabilities;
  data: OperationalAgencyDataAdapter;
}
