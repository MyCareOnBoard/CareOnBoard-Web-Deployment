import type { AppDispatch } from "@/store/redux/store";
import { superAdminApi } from "@/pages/super-admin/agencies/api";
import { superAdminDashboardApi } from "@/pages/super-admin/dashboard/api";
import { complianceApi } from "@/pages/super-admin/compliance-monitor/complianceApi";
import { billingMonitorApi } from "@/pages/super-admin/agency-billing-monitor/api";
import { clientsApi } from "@/lib/api/clients";
import { reportsApi } from "@/lib/api/reports";
import { agencyStaffApi } from "@/lib/api/agency-staff";
import { userMessagingApi } from "@/lib/api/userMessaging";
import { billingExpensesApi } from "@/lib/api/billing-expenses";
import { servicesApi } from "@/lib/api/services";

const scopedApis = [
  superAdminApi,
  superAdminDashboardApi,
  complianceApi,
  billingMonitorApi,
  clientsApi,
  reportsApi,
  agencyStaffApi,
  userMessagingApi,
  billingExpensesApi,
  servicesApi,
] as const;

export function resetSuperAdminCaches(dispatch: AppDispatch): void {
  scopedApis.forEach((api) => dispatch(api.util.resetApiState()));
}
