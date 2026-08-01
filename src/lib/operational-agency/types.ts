import type { AgencyMode } from "@/store/redux/agencyModeSlice";
import type { Client } from "@/lib/api/clients";
import type {
  CreateActivityLogRequest,
  Employee,
} from "@/lib/api/employees";
import type { CreateGoalDocumentRequest } from "@/lib/api/goals-and-documents";

export type OperationalActor = "agency" | "super_admin";
export type OperationalFeature = "shift-management" | "billing-management";
export type OperationalAgencyDiscoveryFeature = OperationalFeature | "shift-maintenance";

export interface OperationalBillingRequestContext {
  agencyId: string;
}

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

export interface OperationalRequestOptions {
  signal?: AbortSignal;
}

export type OperationalStaffSchedulingContext = Pick<Employee, "id" | "workAvailability">;

export type OperationalGoalDocumentInput = Pick<
  CreateGoalDocumentRequest,
  "documentType" | "metadata"
>;

export interface OperationalGoalDocumentResult {
  id: string;
  status: "draft";
}

export interface OperationalAgencyDataAdapter {
  searchClients(input?: OperationalLookupInput): Promise<OperationalOptionPage<OperationalClientOption>>;
  searchStaff(input?: OperationalLookupInput): Promise<OperationalOptionPage<OperationalStaffOption>>;
  listServices(input?: OperationalLookupInput): Promise<OperationalOptionPage<OperationalServiceOption>>;
  getClientSchedulingContext(clientId: string, options?: OperationalRequestOptions): Promise<Client>;
  getStaffSchedulingContext(
    staffId: string,
    options?: OperationalRequestOptions,
  ): Promise<OperationalStaffSchedulingContext>;
  createStaffActivity(
    staffId: string,
    payload: CreateActivityLogRequest,
    options?: OperationalRequestOptions,
  ): Promise<unknown>;
  createGoalDocument(
    clientId: string,
    shiftId: string,
    input: OperationalGoalDocumentInput,
    options?: OperationalRequestOptions,
  ): Promise<OperationalGoalDocumentResult>;
}

export interface OperationalCapabilities {
  canManageShifts: boolean;
  canManageBilling: boolean;
  shiftMaintenance: boolean;
  canAccessClientDirectory?: boolean;
  canAccessStaffDirectory?: boolean;
}

export interface OperationalDirectoryRoutes {
  clientDetails?: (clientId: string) => string;
  staffDetails?: (staffId: string) => string;
}

export interface OperationalShiftRoutes {
  index(search?: string): string;
  list(search?: string): string;
  approvals(search?: string): string;
  activityLogs(search?: string): string;
  maintenance(search?: string): string;
  details(shiftId: string, search?: string): string;
}

export interface OperationalBillingRoutes {
  index(search?: string): string;
  financialOverview(search?: string): string;
  payroll(search?: string): string;
  claims(search?: string): string;
  expenses(search?: string): string;
  timesheets(search?: string): string;
}

export interface OperationalAgencyContextValue {
  actor: OperationalActor;
  agencyId: string;
  agency: OperationalAgencySummary;
  mode: AgencyMode | null;
  routes: OperationalShiftRoutes;
  capabilities: OperationalCapabilities;
  directoryRoutes?: OperationalDirectoryRoutes;
  data: OperationalAgencyDataAdapter;
}
