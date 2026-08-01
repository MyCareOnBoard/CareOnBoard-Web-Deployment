import ShiftMaintenancePage from "@/pages/shared/shift-maintenance";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import { useOutletContext } from "react-router";

export default function SuperAdminShiftMaintenance() {
  const context = useOutletContext<{ agencies?: OperationalAgencySummary[] }>();
  return <ShiftMaintenancePage isSuperAdmin embedded agencies={context?.agencies ?? []} />;
}
