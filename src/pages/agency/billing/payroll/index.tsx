import { lazy, Suspense } from "react";

import { useAuth } from "@/utils/auth";

import { PayrollWorkspaceCutoverBoundary } from "@/features/payroll/runs/pages/PayrollWorkspaceCutoverBoundary";

const LegacyPayrollDashboardPage = lazy(() => import("./legacy").then((module) => ({
  default: module.default,
})));

export default function PayrollDashboardPage() {
  return (
    <Suspense fallback={<p role="status" className="px-4 py-8 text-sm text-[#62686f]">Loading payroll…</p>}>
      <LegacyPayrollDashboardPage />
    </Suspense>
  );
}

export function AgencyPayrollDashboardPage() {
  const { user } = useAuth();
  const actorUid = user?.uid ?? "";
  const agencyId = user?.agencyId || user?.agency?.id || "";

  if (!actorUid || !agencyId) {
    return (
      <p role="alert" className="px-4 py-8 text-sm text-[#62686f]">
        Sign in again to manage payroll.
      </p>
    );
  }

  return (
    <PayrollWorkspaceCutoverBoundary
      scope={{ audience: "agency", actorUid, agencyId }}
    />
  );
}
