import { canManageEmployeePayroll } from "@/lib/agency/agency-billing-permissions";
import { useAuth } from "@/utils/auth";

import { AgencyPayrollWorkspaceBoundary } from "@/features/payroll/runs/pages/AgencyPayrollWorkspaceBoundary";

export default function PayrollDashboardPage() {
  return <AgencyPayrollDashboardPage />;
}

export function AgencyPayrollDashboardPage() {
  const { user } = useAuth();
  const actorUid = user?.uid ?? "";
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const setupAuthorized = canManageEmployeePayroll(
    user?.userType,
    user?.profile?.accessList ?? [],
  ) || user?.canOpenAgencyPayrollSetup === true;

  if (!actorUid || !agencyId) {
    return (
      <p role="alert" className="px-4 py-8 text-sm text-[#62686f]">
        Sign in again to manage payroll.
      </p>
    );
  }

  return (
    <AgencyPayrollWorkspaceBoundary
      scope={{ audience: "agency", actorUid, agencyId }}
      setupAuthorized={setupAuthorized}
    />
  );
}
