import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpRight } from "lucide-react";
import AddMileageModal from "./components/AddMileageModal";

interface MileageEntry {
  id: string;
  client: {
    name: string;
    avatar: string;
    role: string;
  };
  dsp: {
    name: string;
    avatar: string;
    role: string;
  };
  checkInLocation: string;
  dropOffLocation: string;
  distance: string;
  duration: string;
  date: string;
  time: string;
}

export default function MileagePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data - replace with actual data
  const mileageHistory: MileageEntry[] = [];

  const handleMileageCreated = () => {
    // Refresh mileage list or update state
    console.log("Mileage created successfully");
  };

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-bold leading-[1.4] text-[#10141a]">
            Mileage
          </h1>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#00b8d4] hover:bg-[#00a0bd] text-white rounded-full px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 h-auto text-[13px] sm:text-[14px] lg:text-[15px] font-semibold shadow-none"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          Add Mileage
        </Button>
      </div>

      {/* Mileage Overview Section */}
      <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-[16px] sm:rounded-[20px] lg:rounded-[24px] backdrop-blur-[50px] bg-[rgba(255,255,255,0.4)] shadow-sm">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-0">
          <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-bold text-[#10141a] mb-1">
            Mileage
          </h2>
          <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
            Insightful overview of patient recovery and ongoing care
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 lg:flex lg:justify-end">
          <div className="text-center p-3 sm:p-0">
            <div className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-[#10141a] mb-1 sm:mb-2">0</div>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#22c55e]"></div>
              <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">Active</span>
            </div>
          </div>
          <div className="text-center p-3 sm:p-0">
            <div className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-[#10141a] mb-1 sm:mb-2">0</div>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#3b82f6]"></div>
              <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">Completed</span>
            </div>
          </div>
          <div className="text-center p-3 sm:p-0">
            <div className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-[#10141a] mb-1 sm:mb-2">0</div>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#3b82f6]"></div>
              <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">Missed</span>
            </div>
          </div>
          <div className="text-center p-3 sm:p-0">
            <div className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-[#10141a] mb-1 sm:mb-2">0</div>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#3b82f6]"></div>
              <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">Incomplete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mileage History */}
      <div className="backdrop-blur-[50px] bg-[rgba(255,255,255,0.4)] shadow-sm rounded-[16px] sm:rounded-[20px] lg:rounded-[24px]">
        <div className="p-4 sm:p-6 border-b border-[#e5e7eb]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-bold text-[#10141a] mb-1">
                Mileage history
              </h2>
              <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
                These are your Past Mileage
              </p>
            </div>
            <button className="p-2 hover:bg-[#f3f4f6] rounded-lg transition-colors cursor-pointer">
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {mileageHistory.length > 0 ? (
            <div className="divide-y divide-[#e5e7eb]">
              {mileageHistory.map((entry) => (
                <div key={entry.id} className="p-6 hover:bg-[#f9fafb] transition-colors">
                  <div className="flex items-center gap-8">
                    {/* Client & DSP */}
                    <div className="flex items-center gap-6 min-w-[300px]">
                      <div className="flex items-center gap-3">
                        <img
                          src={entry.client.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.client.name)}&background=e5e7eb&color=374151`}
                          alt={entry.client.name}
                          className="object-cover w-12 h-12 rounded-full"
                        />
                        <div>
                          <div className="font-semibold text-[15px] text-[#10141a]">
                            {entry.client.name}
                          </div>
                          <div className="text-[13px] text-[#9ca3af]">
                            {entry.client.role}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <img
                          src={entry.dsp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.dsp.name)}&background=e5e7eb&color=374151`}
                          alt={entry.dsp.name}
                          className="object-cover w-12 h-12 rounded-full"
                        />
                        <div>
                          <div className="font-semibold text-[15px] text-[#10141a]">
                            {entry.dsp.name}
                          </div>
                          <div className="text-[13px] text-[#9ca3af]">
                            {entry.dsp.role}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Locations */}
                    <div className="grid flex-1 grid-cols-4 gap-6">
                      <div>
                        <div className="text-[13px] text-[#9ca3af] mb-1">
                          Check In Location
                        </div>
                        <div className="text-[15px] text-[#10141a]">
                          {entry.checkInLocation}
                        </div>
                      </div>
                      <div>
                        <div className="text-[13px] text-[#9ca3af] mb-1">
                          Drop Off Location
                        </div>
                        <div className="text-[15px] text-[#10141a]">
                          {entry.dropOffLocation}
                        </div>
                      </div>
                      <div>
                        <div className="text-[13px] text-[#9ca3af] mb-1">Distance</div>
                        <div className="text-[15px] text-[#10141a]">
                          {entry.distance}
                        </div>
                      </div>
                      <div>
                        <div className="text-[13px] text-[#9ca3af] mb-1">Duration</div>
                        <div className="text-[15px] text-[#10141a]">
                          {entry.duration}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 sm:p-10 lg:p-12 text-center">
              <p className="text-[#9ca3af] text-[13px] sm:text-[14px] lg:text-[15px]">No mileage history yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Mileage Modal */}
      <AddMileageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onMileageCreated={handleMileageCreated}
      />
    </div>
  );
}
