import { useState } from "react";
import { DSP } from "./types";
import { useDSPList } from "./useDSPManagement";
import { DSPList } from "./DSPList";
import { DSPProfile } from "./DSPProfile";
import AddScheduleModal from "@/pages/agency/scheduling/components/AddScheduleModal";

export default function DSPManagementPage() {
  const [selectedDsp, setSelectedDsp] = useState<DSP | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Fetch DSPs from API
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">DSP Management</h1>
          {selectedDsp && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#00B4B8] text-white text-sm font-medium rounded-full hover:bg-[#00A0A4] transition-colors"
            >
              <span className="text-lg">+</span>
              Add new Schedule
            </button>
          )}
        </div>

        {/* DSP List or Profile */}
        {!selectedDsp ? (
          <DSPList 
            dsps={dsps} 
            stats={stats}
            isLoading={isLoading}
            onSelectDsp={setSelectedDsp} 
          />
        ) : (
          <DSPProfile
            dsp={selectedDsp}
            onBack={() => setSelectedDsp(null)}
          />
        )}
      </div>

      {/* Modals */}
      {selectedDsp && (
        <>
          <AddScheduleModal
            isOpen={showScheduleModal}
            onClose={() => setShowScheduleModal(false)}
          />
        </>
      )}
    </div>
  );
}
