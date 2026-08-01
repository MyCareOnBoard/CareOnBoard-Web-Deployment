import type {
  OperationalBillingRoutes,
  OperationalDirectoryRoutes,
  OperationalShiftRoutes,
} from "./types";

function withSearch(path: string, search?: string): string {
  if (!search) return path;
  return `${path}${search.startsWith("?") ? search : `?${search}`}`;
}

function createShiftRoutes(paths: {
  index: string;
  list: string;
  approvals: string;
  activityLogs: string;
  maintenance: string;
  details: string;
}): OperationalShiftRoutes {
  return {
    index: (search) => withSearch(paths.index, search),
    list: (search) => withSearch(paths.list, search),
    approvals: (search) => withSearch(paths.approvals, search),
    activityLogs: (search) => withSearch(paths.activityLogs, search),
    maintenance: (search) => withSearch(paths.maintenance, search),
    details: (shiftId, search) => withSearch(
      paths.details.replace(":shiftId", encodeURIComponent(shiftId)),
      search,
    ),
  };
}

export const agencyShiftRoutes = createShiftRoutes({
  index: "/agency/dashboard/shifts",
  list: "/agency/shifts/shifts",
  approvals: "/agency/shifts/approvals",
  activityLogs: "/agency/shifts/activity-logs",
  maintenance: "/agency/shifts/maintenance",
  details: "/agency/shifts/:shiftId",
});

export const superAdminShiftRoutes = createShiftRoutes({
  index: "/super-admin/shifts",
  list: "/super-admin/shifts/list",
  approvals: "/super-admin/shifts/approvals",
  activityLogs: "/super-admin/shifts/activity-logs",
  maintenance: "/super-admin/shifts/maintenance",
  details: "/super-admin/shifts/:shiftId",
});

function createBillingRoutes(basePath: string): OperationalBillingRoutes {
  return {
    index: (search) => withSearch(basePath, search),
    financialOverview: (search) => withSearch(`${basePath}/financial-overview`, search),
    payroll: (search) => withSearch(`${basePath}/payroll-management`, search),
    claims: (search) => withSearch(`${basePath}/claims`, search),
    expenses: (search) => withSearch(`${basePath}/expenses`, search),
    timesheets: (search) => withSearch(`${basePath}/staff-timesheets`, search),
  };
}

export const agencyBillingRoutes = createBillingRoutes("/agency/billing");
export const superAdminBillingRoutes = createBillingRoutes("/super-admin/billing");

export const agencyDirectoryRoutes: OperationalDirectoryRoutes = {
  clientDetails: (clientId) => `/agency/clients/${encodeURIComponent(clientId)}`,
  staffDetails: (staffId) => `/agency/dsp-management/${encodeURIComponent(staffId)}`,
};

export function createSuperAdminDirectoryRoutes(
  agencyId: string,
): OperationalDirectoryRoutes {
  return {
    clientDetails: (clientId) => {
      const search = new URLSearchParams({ agencyId }).toString();
      return `/super-admin/clients/${encodeURIComponent(clientId)}?${search}`;
    },
  };
}
