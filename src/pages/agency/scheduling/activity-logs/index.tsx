import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listShifts, Shift, ShiftStatus } from "@/lib/api/shifts";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AddScheduleModal, { ScheduleFormData } from "../components/AddScheduleModal";
import { useAuth } from "@/utils/auth";

type ActivityFilter = "active" | "completed" | "missed" | "incomplete";

const formatTime = (time?: string): string => {
  if (!time) return "-";
  try {
    if (time.includes("AM") || time.includes("PM")) return time;
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}.${minutes || "00"} ${ampm}`;
  } catch {
    return time;
  }
};

const getStatusInfo = (status: ShiftStatus) => {
  switch (status) {
    case ShiftStatus.ONGOING:
      return { label: "Active", color: "#0EAF52", bgColor: "rgba(14,175,82,0.05)" };
    case ShiftStatus.COMPLETED:
      return { label: "Completed", color: "#2B82FF", bgColor: "rgba(43,130,255,0.05)" };
    case ShiftStatus.EXPIRED:
      return { label: "Missed", color: "#D53411", bgColor: "rgba(213,52,17,0.05)" };
    case ShiftStatus.PENDING:
      return { label: "Pending", color: "#808081", bgColor: "rgba(128,128,129,0.05)" };
    case ShiftStatus.AVAILABLE:
      return { label: "Available", color: "#00b4b8", bgColor: "rgba(0,180,184,0.05)" };
    default:
      return { label: status, color: "#808081", bgColor: "rgba(128,128,129,0.05)" };
  }
};

const getInitialsFromName = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
};

export default function ActivityLogsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [editFormData, setEditFormData] = useState<ScheduleFormData | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [activityPage, setActivityPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>("active");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const itemsPerPage = 6;

  const handleEdit = (shift: Shift) => {
    const clientName = shift.client
      ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() || "Unknown Client"
      : "Unknown Client";
    const employeeName = shift.employee?.fullName || "";
    const anyShift = shift as any;

    const formData: ScheduleFormData = {
      client: clientName,
      clientId: shift.client?.id || "",
      clientLocation: shift.location || "",
      assignedDsp: employeeName,
      assignedDspId: (shift.employee as any)?.id || "",
      billingRate: "",
      serviceCode: shift.serviceCode || "183535",
      notesType: anyShift.notesType || "",
      schedulingType: (shift.schedulingType as "one-time" | "recurring" | "") || "one-time",
      date: shift.date ? new Date(shift.date) : null,
      startDate: null,
      endDate: null,
      clockInTime: shift.startTime,
      clockOutTime: shift.endTime || "",
      ispOutcome: shift.ispOutcome || "",
      planOfCare: null,
      submissionStatus: shift.submissionStatus,
    } as ScheduleFormData;

    (formData as any).shiftId = shift.id;

    setEditFormData(formData);
    setModalMode("edit");
    setShowAddScheduleModal(true);
  };

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        setLoading(true);
        const response = await listShifts({
          limit: 100,
          agencyId: user?.agencyId,
          client: true,
          employee: true,
        });
        setShifts(response.shifts || []);
      } catch (error) {
        console.error("Failed to fetch shifts:", error);
        toast({
          title: "Error",
          description: "Failed to load shifts. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.agencyId) {
      fetchShifts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.agencyId]);

  const pendingApprovals = useMemo(() => {
    return shifts.filter(
      (shift) =>
        shift.status === ShiftStatus.COMPLETED &&
        (shift.approved === false || shift.approved === null || shift.approved === undefined)
    );
  }, [shifts]);

  const filteredShifts = useMemo(() => {
    switch (activeFilter) {
      case "active":
        return shifts.filter((shift) => shift.status === ShiftStatus.ONGOING);
      case "completed":
        return shifts.filter((shift) => shift.status === ShiftStatus.COMPLETED);
      case "missed":
        return shifts.filter((shift) => shift.status === ShiftStatus.EXPIRED);
      case "incomplete":
        return pendingApprovals;
      default:
        return shifts;
    }
  }, [activeFilter, pendingApprovals, shifts]);

  const totalActivityPages = Math.max(1, Math.ceil(filteredShifts.length / itemsPerPage));

  const paginatedShifts = filteredShifts.slice(
    (activityPage - 1) * itemsPerPage,
    activityPage * itemsPerPage
  );

  useEffect(() => {
    setActivityPage(1);
  }, [activeFilter]);

  const filterButtons: { key: ActivityFilter; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "missed", label: "Missed" },
    { key: "incomplete", label: "Incomplete" },
  ];

  return (
    <>
      <div className="min-h-[calc(100vh-200px)] pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
            Scheduling
          </h1>
          <Button
            onClick={() => {
              setEditFormData(null);
              setModalMode("create");
              setShowAddScheduleModal(true);
            }}
            className="flex items-center gap-3 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-4 py-3 h-auto font-semibold text-[14px]"
          >
            <Plus className="w-5 h-5" />
            Add Schedule
          </Button>
        </div>

        {/* Activity Log Card */}
        <div className="relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.3)] backdrop-blur bg-[rgba(255,255,255,0.3)]">
          <div className="p-5">
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
              <div className="flex flex-col gap-1">
                <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                  Activity Log
                </h2>
                <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                  These are your Shifts
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {filterButtons.map((filter) => {
                  const isActive = activeFilter === filter.key;
                  return (
                    <button
                      key={filter.key}
                      onClick={() => setActiveFilter(filter.key)}
                      className={`px-4 py-2 rounded-full text-[14px] font-medium leading-[1.4] transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#00b4b8] text-white"
                          : "border border-[#808081] text-[#808081] hover:bg-white/60"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Activity Items */}
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00b4b8]" />
                </div>
              ) : paginatedShifts.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-[14px] text-[#808081]">No shifts found</p>
                </div>
              ) : (
                paginatedShifts.map((shift) => {
                  const statusInfo = getStatusInfo(shift.status);
                  const clientName = shift.client
                    ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() || "Unknown Client"
                    : "Unknown Client";
                  const employeeName = shift.employee?.fullName || "Unknown DSP";

                  return (
                    <div
                      key={shift.id}
                      className="flex flex-wrap items-center gap-4 backdrop-blur-[20px] rounded-[20px]"
                    >
                      {/* Client Info */}
                      <div className="flex items-center gap-4 w-[256px]">
                        <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
                          {shift.client?.profileImage && (
                            <AvatarImage
                              src={shift.client.profileImage}
                              alt={clientName}
                              className="w-full h-full object-cover aspect-auto"
                            />
                          )}
                          <AvatarFallback className="w-full h-full rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                            {getInitialsFromName(clientName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[16px] font-semibold leading-[1.6] text-black">
                            {clientName}
                          </span>
                          <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                            Client
                          </span>
                        </div>
                      </div>

                      {/* DSP/Employee Info */}
                      <div className="flex items-center gap-4 w-[256px]">
                        <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
                          {shift.employee?.profilePicture && (
                            <AvatarImage
                              src={shift.employee.profilePicture}
                              alt={employeeName}
                              className="w-full h-full object-cover aspect-auto"
                            />
                          )}
                          <AvatarFallback className="w-full h-full rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                            {getInitialsFromName(employeeName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[16px] font-semibold leading-[1.6] text-black">
                            {employeeName}
                          </span>
                          <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                            DSP
                          </span>
                        </div>
                      </div>

                      {/* Status & Times */}
                      <div className="flex items-center gap-16 flex-1 w-[256px]">
                        <div
                          className="rounded-full min-w-[54px] min-h-7 flex items-center justify-center gap-1 px-2.5"
                          style={{
                            backgroundColor: statusInfo.bgColor,
                            border: `1px solid ${statusInfo.color}`,
                          }}
                        >
                          <span className="text-[12px] font-semibold" style={{ color: statusInfo.color }}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <div className="text-[14px] font-medium leading-[1.4] flex flex-col">
                          <span className="text-[#808081] whitespace-nowrap">Clocked In </span>
                          <span className="text-[#10141a]">
                            {formatTime(shift.clockedInAt || shift.startTime)}
                          </span>
                        </div>

                        <div className="text-[14px] font-medium leading-[1.4] flex flex-col">
                          <span className="text-[#808081] whitespace-nowrap">Clocked Out </span>
                          <span className="text-[#10141a]">
                            {formatTime(shift.clockedOutAt || shift.endTime)}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => handleEdit(shift)}
                        className="bg-[#b2b2b3] border-[#b2b2b3] text-white rounded-full px-6 py-2.5 h-9 w-[121px] text-[14px] font-semibold hover:bg-[#9a9a9b] hover:text-white"
                      >
                        Details
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            {filteredShifts.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <span className="text-[16px] font-medium leading-[1.6] text-[#10141a]">
                  {activityPage}
                  <span className="text-[14px] text-[#808081]">/{totalActivityPages}</span>
                </span>
                <button
                  onClick={() => setActivityPage(Math.max(1, activityPage - 1))}
                  disabled={activityPage === 1}
                  className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-[#10141a]" />
                </button>
                <button
                  onClick={() => setActivityPage(Math.min(totalActivityPages, activityPage + 1))}
                  disabled={activityPage === totalActivityPages}
                  className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-[#10141a]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddScheduleModal
        isOpen={showAddScheduleModal}
        onClose={() => {
          setShowAddScheduleModal(false);
          setEditFormData(null);
          setModalMode("create");
        }}
        onShiftsUpdated={(updatedShifts) => setShifts(updatedShifts)}
        editData={editFormData}
        mode={modalMode}
      />
    </>
  );
}
