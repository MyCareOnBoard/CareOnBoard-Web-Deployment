import { useAuth } from "@/utils/auth";
import SupportCoordinatorClientsPage from "./SupportCoordinatorClientsPage";
import FieldStaffClientsPage from "./FieldStaffClientsPage";

export default function ClientsAndServicesPage() {
  const { user } = useAuth();
  return user?.applicantType === "support_coordinator" || user?.profile?.role === "support_coordinator" || user?.role === "support_coordinator"
    ? <SupportCoordinatorClientsPage /> : <FieldStaffClientsPage />;
}
