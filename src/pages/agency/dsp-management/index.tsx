import { useDSPList } from "./useDSPManagement";
import { DSPList } from "./DSPList";

export default function DSPManagementPage() {
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
        <h1 className="text-3xl font-bold text-gray-900">DSP Management</h1>
        <DSPList
          dsps={dsps}
          stats={stats}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
