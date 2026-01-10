import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Routes } from "@/routes/constants";

interface AttendanceRow {
  id: string;
  name: string;
  signIn: string;
  signOut: string;
}

export default function CommunityInclusionsPage() {
  const navigate = useNavigate();
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([
    { id: "1", name: "", signIn: "", signOut: "" },
    { id: "2", name: "", signIn: "", signOut: "" },
    { id: "3", name: "", signIn: "", signOut: "" },
    { id: "4", name: "", signIn: "", signOut: "" },
    { id: "5", name: "", signIn: "", signOut: "" },
    { id: "6", name: "", signIn: "", signOut: "" },
  ]);

  const handleInputChange = (
    id: string,
    field: keyof AttendanceRow,
    value: string
  ) => {
    setAttendanceRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleSave = () => {
    console.log("Saving attendance data:", attendanceRows);
    // TODO: Implement save functionality
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          Client Management
        </h1>
        <Button
          size="lg"
          className="h-[52px] px-[16px] py-[12px]"
          onClick={() => navigate(Routes.agency.addClient)}
        >
          <Plus className="w-5 h-5 text-white" />
          Add Client
        </Button>
      </div>

      {/* Community Inclusions Card */}
      <div className="relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.3)] backdrop-blur bg-[rgba(255,255,255,0.3)]">
        <div className="relative p-[19px]">
          {/* Section Header */}
          <div className="flex flex-col gap-[4px] mb-[20px]">
            <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
              Community Inclusions
            </h2>
            <p className="text-[14px] font-medium leading-[1.4] text-[#808081] capitalize">
              List Of Attendances
            </p>
          </div>

          {/* Attendance Form */}
          <div className="space-y-[22px]">
            {attendanceRows.map((row) => (
              <div key={row.id} className="grid grid-cols-[377px_351px_351px] gap-[14px] items-end">
                {/* Name Field */}
                <div className="flex flex-col gap-[4px]">
                  <label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                    Name
                  </label>
                  <Input
                    value={row.name}
                    onChange={(e) =>
                      handleInputChange(row.id, "name", e.target.value)
                    }
                    className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white px-[16px] text-[14px] font-normal text-[#525253] placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8]"
                  />
                </div>

                {/* Sign In Field */}
                <div className="flex flex-col gap-[4px]">
                  <label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                    Sign In
                  </label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={row.signIn}
                      onChange={(e) =>
                        handleInputChange(row.id, "signIn", e.target.value)
                      }
                      className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white px-[16px] pr-[44px] text-[14px] font-normal text-[#525253] placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8] [&::-webkit-calendar-picker-indicator]:opacity-0"
                    />
                    <Clock className="absolute right-[16px] top-1/2 -translate-y-1/2 w-5 h-5 text-[#808081] pointer-events-none" />
                  </div>
                </div>

                {/* Sign Out Field */}
                <div className="flex flex-col gap-[4px]">
                  <label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                    Sign Out
                  </label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={row.signOut}
                      onChange={(e) =>
                        handleInputChange(row.id, "signOut", e.target.value)
                      }
                      className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white px-[16px] pr-[44px] text-[14px] font-normal text-[#525253] placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8] [&::-webkit-calendar-picker-indicator]:opacity-0"
                    />
                    <Clock className="absolute right-[16px] top-1/2 -translate-y-1/2 w-5 h-5 text-[#808081] pointer-events-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-[24px]">
            <button
              onClick={handleSave}
              className="h-[44px] w-[80px] rounded-[60px] bg-[#00b4b8] backdrop-blur-[22px] text-[14px] font-semibold text-white hover:bg-[#00a0a3] transition-colors cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
