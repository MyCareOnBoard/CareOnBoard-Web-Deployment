import AgencyShiftDetailsPage from "@/pages/agency/shift-details";
import { SuperAdminShiftScope } from "./SuperAdminShiftList";

export default function SuperAdminShiftDetails() {
  return (
    <SuperAdminShiftScope>
      <AgencyShiftDetailsPage />
    </SuperAdminShiftScope>
  );
}
