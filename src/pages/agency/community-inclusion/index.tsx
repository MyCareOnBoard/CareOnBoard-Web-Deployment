import React, { useState } from "react";
import { Clock, Plus, Loader2, FileClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import TimePicker from "@/components/TimePicker";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { createCommunityInclusion, type Attendee } from "@/lib/api/community-inclusions";
import { Routes } from "@/routes/constants";

import { useNavigate } from "react-router";

interface AttendanceRow {
  id: string;
  name: string;
  signIn: string;
  signOut: string;
}

export default function CommunityInclusionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([
    { id: "1", name: "", signIn: "", signOut: "" },
    { id: "2", name: "", signIn: "", signOut: "" },
    { id: "3", name: "", signIn: "", signOut: "" },
    { id: "4", name: "", signIn: "", signOut: "" },
    { id: "5", name: "", signIn: "", signOut: "" },
    { id: "6", name: "", signIn: "", signOut: "" },
  ]);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (
    id: string,
    field: keyof AttendanceRow,
    value: string
  ) => {
    setAttendanceRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const validateForm = () => {
    // Filter out empty rows and validate
    const validAttendees = attendanceRows.filter(
      (row) => row.name.trim() && row.signIn && row.signOut
    );

    if (validAttendees.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one attendee with complete information.",
        variant: "destructive",
      });
      return null;
    }
    return validAttendees;
  };

  const saveToApi = async () => {
    const validAttendees = validateForm();
    if (!validAttendees) return;

    setIsSaving(true);

    try {
      // Convert AttendanceRow[] to Attendee[] format expected by API
      const attendees: Attendee[] = validAttendees.map((row) => ({
        id: row.id,
        name: row.name,
        signIn: row.signIn,
        signOut: row.signOut,
      }));

      // Call API to create community inclusion
      await createCommunityInclusion({
        attendees,
      });

      toast({
        title: status === 'submitted' ? "Submitted Successfully" : "Saved Successfully",
        description: `Community inclusion ${status} successfully!`,
      });

      // Reset form after successful save
      setAttendanceRows([
        { id: "1", name: "", signIn: "", signOut: "" },
        { id: "2", name: "", signIn: "", signOut: "" },
        { id: "3", name: "", signIn: "", signOut: "" },
        { id: "4", name: "", signIn: "", signOut: "" },
        { id: "5", name: "", signIn: "", signOut: "" },
        { id: "6", name: "", signIn: "", signOut: "" },
      ]);
    } catch (error: any) {
      console.error(`Failed to ${status} community inclusion:`, error);
      toast({
        title: `${status === 'submitted' ? "Submission" : "Save"} Failed`,
        description:
          error?.response?.data?.message ||
          `Failed to ${status} community inclusion. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAttendee = () => {
    const newId = (attendanceRows.length + 1).toString();
    setAttendanceRows((prev) => [
      { id: newId, name: "", signIn: "", signOut: "" },
      ...prev,
    ]);
  };

  // Convert 24-hour format (HH:mm) to display format
  const formatTimeDisplay = (time24h: string): string => {
    if (!time24h) return "";

    const [hoursStr, minutes] = time24h.split(":");
    let hours = parseInt(hoursStr);
    const period = hours >= 12 ? "PM" : "AM";

    if (hours === 0) {
      hours = 12;
    } else if (hours > 12) {
      hours -= 12;
    }

    return `${hours.toString().padStart(2, "0")}:${minutes} ${period}`;
  };

  return (
    <div className="min-h-[calc(100vh-200px)] px-3 sm:px-4 md:px-6 lg:px-0">
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-[24px] sm:text-[28px] md:text-[32px] lg:text-[40px] font-semibold leading-[1.4] sm:leading-[1.6] text-[#10141a]">
          Community Inclusion
        </h1>
      </div>

      {/* Community Inclusions Card */}
      <div className="relative overflow-hidden rounded-[16px] sm:rounded-[20px] lg:rounded-[30px] border border-[rgba(255,255,255,0.3)] backdrop-blur bg-[rgba(255,255,255,0.3)]">
        <div className="relative p-3 sm:p-4 md:p-[19px]">
          {/* Section Header */}
          <div className="mb-4 sm:mb-[20px] flex flex-wrap justify-between items-start gap-3">
            <div>
              <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-medium leading-[1.4] sm:leading-[1.6] text-[#10141a]">
                Community Inclusions
              </h2>
              <p className="text-[14px] text-[#808081] font-normal mt-1">
                List Of Attendees on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <button
              onClick={() => navigate(Routes.agency.communityInclusionHistory)}
              className="flex items-center gap-2 text-[#808081] hover:text-[#00b4b8] transition-colors cursor-pointer"
            >
              <FileClock className="w-5 h-5" />
              <span className="hidden sm:inline text-[14px] font-normal">Community Inclusion History</span>
            </button>
          </div>

          {/* Attendance Form */}
          <div className="space-y-4 sm:space-y-5 md:space-y-[22px]">
            {attendanceRows.map((row, index) => (
              <div key={row.id}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3.5 md:gap-[14px] items-end">
                  {/* Name Field */}
                  <div className="flex flex-col gap-[4px] sm:col-span-2 xl:col-span-1">
                    <label className="text-[11px] sm:text-[12px] font-normal leading-[normal] text-[#10141a]">
                      Name
                    </label>
                    <Input
                      value={row.name}
                      onChange={(e) =>
                        handleInputChange(row.id, "name", e.target.value)
                      }
                      placeholder="Enter attendee name"
                      className="h-[42px] sm:h-[44px] rounded-[10px] sm:rounded-[12px] border border-[#cccccd] bg-white px-[14px] sm:px-[16px] text-[13px] sm:text-[14px] font-normal text-[#525253] placeholder:text-[#b2b2b3] focus-visible:ring-1 focus-visible:ring-[#00b4b8]"
                    />
                  </div>

                  {/* Sign In Field */}
                  <div className="flex flex-col gap-[4px]">
                    <label className="text-[11px] sm:text-[12px] font-normal leading-[normal] text-[#10141a]">
                      Sign In
                    </label>
                    <TimePicker
                      value={row.signIn}
                      onChange={(time24h) => handleInputChange(row.id, "signIn", time24h)}
                    >
                      <div className="relative h-[42px] sm:h-[44px] rounded-[10px] sm:rounded-[12px] border border-[#cccccd] bg-white px-[14px] sm:px-[16px] pr-[40px] sm:pr-[44px] flex items-center cursor-pointer hover:border-[#00b4b8] transition-colors active:border-[#00b4b8]">
                        <span className="text-[13px] sm:text-[14px] font-normal text-[#525253] truncate">
                          {row.signIn ? formatTimeDisplay(row.signIn) : "Select time"}
                        </span>
                        <Clock className="absolute right-[12px] sm:right-[16px] top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[#808081]" />
                      </div>
                    </TimePicker>
                  </div>

                  {/* Sign Out Field */}
                  <div className="flex flex-col gap-[4px]">
                    <label className="text-[11px] sm:text-[12px] font-normal leading-[normal] text-[#10141a]">
                      Sign Out
                    </label>
                    <TimePicker
                      value={row.signOut}
                      onChange={(time24h) => handleInputChange(row.id, "signOut", time24h)}
                    >
                      <div className="relative h-[42px] sm:h-[44px] rounded-[10px] sm:rounded-[12px] border border-[#cccccd] bg-white px-[14px] sm:px-[16px] pr-[40px] sm:pr-[44px] flex items-center cursor-pointer hover:border-[#00b4b8] transition-colors active:border-[#00b4b8]">
                        <span className="text-[13px] sm:text-[14px] font-normal text-[#525253] truncate">
                          {row.signOut ? formatTimeDisplay(row.signOut) : "Select time"}
                        </span>
                        <Clock className="absolute right-[12px] sm:right-[16px] top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[#808081]" />
                      </div>
                    </TimePicker>
                  </div>
                </div>

                {/* Divider on mobile/tablet */}
                {index < attendanceRows.length - 1 && (
                  <div className="xl:hidden mt-4 sm:mt-5 border-t border-[rgba(204,204,205,0.3)]" />
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-4 items-center">
            <button
              onClick={handleAddAttendee}
              className="h-[44px] px-6 rounded-[60px] border border-[#cccccd] bg-[#f0f0f1] text-[#808081] text-[14px] font-medium hover:bg-[#e0e0e1] transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Add
            </button>

            <button
              onClick={saveToApi}
              disabled={isSaving}
              className="h-[44px] min-w-[120px] rounded-[60px] bg-[#00b4b8] text-[14px] font-semibold text-white hover:bg-[#00a0a3] active:bg-[#008f92] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? "Saving" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
