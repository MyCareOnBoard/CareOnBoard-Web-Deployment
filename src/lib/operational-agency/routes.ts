import type { OperationalShiftRoutes } from "./types";

function withSearch(path: string, search?: string): string {
  if (!search) return path;
  return `${path}${search.startsWith("?") ? search : `?${search}`}`;
}

function createShiftRoutes(paths: {
  index: string;
  list: string;
  approvals: string;
  activityLogs: string;
  details: string;
}): OperationalShiftRoutes {
  return {
    index: (search) => withSearch(paths.index, search),
    list: (search) => withSearch(paths.list, search),
    approvals: (search) => withSearch(paths.approvals, search),
    activityLogs: (search) => withSearch(paths.activityLogs, search),
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
  details: "/agency/shifts/:shiftId",
});

export const superAdminShiftRoutes = createShiftRoutes({
  index: "/super-admin/shifts",
  list: "/super-admin/shifts/list",
  approvals: "/super-admin/shifts/approvals",
  activityLogs: "/super-admin/shifts/activity-logs",
  details: "/super-admin/shifts/:shiftId",
});
