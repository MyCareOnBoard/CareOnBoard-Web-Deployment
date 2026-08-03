import StaffTimesheetsApprovalPage from "@/pages/agency/billing/staff-timesheets";
import { useBillingWorkspaceContext } from "./BillingWorkspaceContext";
import NetworkTimesheets from "./network/NetworkTimesheets";

export default function SuperAdminBillingTimesheets() {
  return useBillingWorkspaceContext().scope.kind === "network" ? <NetworkTimesheets /> : <StaffTimesheetsApprovalPage />;
}
