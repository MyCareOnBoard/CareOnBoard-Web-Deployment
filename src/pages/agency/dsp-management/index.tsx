import { useNavigate } from "react-router";
import { useDSPList } from "./useDSPManagement";
import { DSPList } from "./DSPList";
import { Button } from "@/components/ui/button";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { staffLabels } from "@/lib/roleLabel";

export default function DSPManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const labels = staffLabels(user?.agency?.supportedClientTypes);
  const { dsps, stats, isLoading, error } = useDSPList();

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load DSPs</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{labels.title} Management</h1>
          <Button
            type="button"
            onClick={() => navigate(Routes.agency.manualStaffOnboarding)}
            className="px-6 py-3"
          >
            Manual Staff Onboarding
          </Button>
        </div>
        <DSPList
          dsps={dsps}
          stats={stats}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
