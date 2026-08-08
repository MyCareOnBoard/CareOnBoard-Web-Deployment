import { useCallback } from "react";
import { SuperAdminStaffActivityShifts } from "@/pages/super-admin/clients-directory/client-details/SuperAdminClientActivityShifts";
import { fetchStaffShiftsPage } from "@/lib/api/staff-directory";
import type { ListShiftsParams, ShiftRequestOptions } from "@/lib/api/shifts";

export function StaffShiftsTab({ staffId, employeeId, agencyId }: { staffId: string; employeeId: string; agencyId: string }) {
  const loadPage = useCallback((params: ListShiftsParams, options?: ShiftRequestOptions) => (
    fetchStaffShiftsPage(staffId, params, options)
  ), [staffId]);

  return <SuperAdminStaffActivityShifts employeeId={employeeId} agencyId={agencyId} loadPage={loadPage} />;
}
