import React, { useEffect, useMemo, useState } from "react";
import { parseISO } from "date-fns";
import { ArrowUpRight, ChevronLeft, ChevronRight, Loader2, Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listShifts, Shift, ShiftStatus } from "@/lib/api/shifts";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AddScheduleModal, { ScheduleFormData } from "../components/AddScheduleModal";
import { useAuth } from "@/utils/auth";
import ShiftDetailsModal from "@/components/ShiftDetailsModal";
import { detectShiftAnomalyCodes } from "@/lib/shift-anomaly-detection";

type ActivityFilter = "all" | "active" | "completed" | "missed" | "incomplete";

/** Normalize timestamp-like values to a display-safe string. Never returns an object. */
function normalizeTimestampToDisplayString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const seconds = obj._seconds ?? obj.seconds;
    if (typeof seconds === "number") {
      const ns = (obj._nanoseconds ?? obj.nanoseconds ?? 0) as number;
      const ms = seconds * 1000 + (typeof ns === "number" ? ns / 1_000_000 : 0);
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? "" : d.toISOString();
    }
  }
  return "";
}

/** Format time for display. Accepts string, Date, or Firestore timestamp. Always returns a string. */
const formatTime = (time?: unknown): string => {
  const str = normalizeTimestampToDisplayString(time);
  if (!str) return "-";
  try {
    if (str.includes("AM") || str.includes("PM")) return str;
    const timePart = str.split("T")[1];
    if (!timePart) return "-";
    const [hours, minutes] = timePart.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${(minutes || "00").split(".")[0]} ${ampm}`;
  } catch {
    return "-";
  }
};

const parseTimeToParts = (time: string): { hours: number; minutes: number } | null => {
  const match = time.match(/(\d{1,2})[.:](\d{2})[:]?([AaPp][Mm])/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
};

const isShiftMissed = (shift: Shift): boolean => {
  if (shift.status === ShiftStatus.COMPLETED) return false;
  if (shift.clockedInAt) return false;
  if (!shift.date) return false;

  const date = parseISO(shift.date);
  let endDateTime: Date;

  if (shift.endTime) {
    const parsedTime = parseTimeToParts(shift.endTime);
    if (parsedTime) {
      endDateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        parsedTime.hours,
        parsedTime.minutes
      );
    } else {
      // If endTime exists but can't be parsed, use end of day
      endDateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59
      );
    }
  } else {
    // If no endTime, use end of day
    endDateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59
    );
  }

  return endDateTime.getTime() < Date.now();
};

const INCOMPLETE_PILL_STYLE = {
  label: "Incomplete",
  color: "#B45309",
  bgColor: "rgba(254, 243, 199, 0.65)",
};

const getStatusInfoByStatus = (status: ShiftStatus, _approved?: boolean) => {
  switch (status) {
    case ShiftStatus.ONGOING:
      return { label: "Active", color: "#0EAF52", bgColor: "rgba(14,175,82,0.05)" };
    case ShiftStatus.COMPLETED:
      return { label: "Completed", color: "#525253", bgColor: "rgba(178,178,179,0.05)" };
    case ShiftStatus.EXPIRED:
      return { label: "Missed", color: "#FF6C10", bgColor: "rgba(255,108,16,0.05)" };
    case ShiftStatus.PENDING:
      return { label: "Pending", color: "#808081", bgColor: "rgba(128,128,129,0.05)" };
    case ShiftStatus.AVAILABLE:
      return { label: "Available", color: "#00b4b8", bgColor: "rgba(0,180,184,0.05)" };
    default:
      return { label: status, color: "#808081", bgColor: "rgba(128,128,129,0.05)" };
  }
};

const getActivityRowStatusInfo = (shift: Shift) => {
  if (isShiftMissed(shift)) {
    return { label: "Missed", color: "#FF6C10", bgColor: "rgba(255,108,16,0.05)" };
  }
  if (detectShiftAnomalyCodes(shift).includes("incomplete_clock")) {
    return INCOMPLETE_PILL_STYLE;
  }
  return getStatusInfoByStatus(shift.status, shift.approved);
};

const getStatusInfoForTab = (shift: Shift, tab: ActivityFilter) => {
  switch (tab) {
    case "all":
      return getActivityRowStatusInfo(shift);
    case "active":
      if (detectShiftAnomalyCodes(shift).includes("incomplete_clock")) {
        return INCOMPLETE_PILL_STYLE;
      }
      if (shift.status === ShiftStatus.ONGOING) {
        return { label: "Active", color: "#0EAF52", bgColor: "rgba(14,175,82,0.05)" };
      }
      return { label: "Available", color: "#00b4b8", bgColor: "rgba(0,180,184,0.05)" };
    case "completed":
      return { label: "Completed", color: "#525253", bgColor: "rgba(178,178,179,0.05)" };
    case "missed":
      return { label: "Missed", color: "#FF6C10", bgColor: "rgba(255,108,16,0.05)" };
    case "incomplete":
      return INCOMPLETE_PILL_STYLE;
    default:
      return getActivityRowStatusInfo(shift);
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
  const [showShiftDetails, setShowShiftDetails] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [editFormData, setEditFormData] = useState<ScheduleFormData | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [activityPage, setActivityPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>("all");
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
      clientLocation: shift.location || null,
      assignedDsp: employeeName,
      assignedDspId: (shift.employee as any)?.id || "",
      billingRate: "",
      serviceCode: shift.serviceCode || "183535",
      notesType: anyShift.notesType || "",
      comment: anyShift.comment || "",
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

  const incompleteShifts = useMemo(() => {
    return shifts.filter(
      (shift) =>
        shift.status === ShiftStatus.COMPLETED &&
        Boolean(shift.clockedInAt) &&
        Boolean(shift.clockedOutAt)
    );
  }, [shifts]);

  const filteredShifts = useMemo(() => {
    switch (activeFilter) {
      case "all":
        return shifts;
      case "active":
        return shifts.filter(
          (shift) =>
            (shift.status === ShiftStatus.ONGOING || shift.status === ShiftStatus.AVAILABLE) &&
            !isShiftMissed(shift)
        );
      case "completed":
        return shifts.filter((shift) => shift.status === ShiftStatus.COMPLETED);
      case "missed":
        return shifts.filter(isShiftMissed);
      case "incomplete":
        return incompleteShifts;
      default:
        return shifts;
    }
  }, [activeFilter, incompleteShifts, shifts]);

  const totalActivityPages = Math.max(1, Math.ceil(filteredShifts.length / itemsPerPage));

  const paginatedShifts = filteredShifts.slice(
    (activityPage - 1) * itemsPerPage,
    activityPage * itemsPerPage
  );

  useEffect(() => {
    setActivityPage(1);
  }, [activeFilter]);

  const filterButtons: { key: ActivityFilter; label: string }[] = [
    { key: "all", label: "All" },
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
            Shift Management
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
                      className={`px-4 py-2 rounded-full text-[14px] font-medium leading-[1.4] transition-colors cursor-pointer ${isActive
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

            {/* Cross-link to Shift Maintenance for relevant filters */}
            {(activeFilter === "missed" || activeFilter === "incomplete") && filteredShifts.length > 0 && (
              <div
                className="flex items-center gap-3 mb-4 px-4 py-3 rounded-2xl border border-[#00b4b8]/20 bg-[#00b4b8]/5 cursor-pointer hover:bg-[#00b4b8]/10 transition-colors"
                onClick={() => navigate(Routes.agency.shiftMaintenance)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(Routes.agency.shiftMaintenance); }}
              >
                <Wrench className="w-4 h-4 text-[#00b4b8] shrink-0" />
                <span className="text-[13px] font-medium text-[#10141a]">
                  Need a written note on file when you fix or remove shifts?{" "}
                  <span className="text-[#00b4b8] font-semibold">
                    Open shift maintenance
                    <ArrowUpRight className="inline w-3.5 h-3.5 ml-0.5 -mt-0.5" />
                  </span>
                </span>
              </div>
            )}

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
                  const statusInfo = getStatusInfoForTab(shift, activeFilter);
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
                            {shift.clockedInAt ? formatTime(shift.clockedInAt) : "--:-- --"}
                          </span>
                        </div>

                        <div className="text-[14px] font-medium leading-[1.4] flex flex-col">
                          <span className="text-[#808081] whitespace-nowrap">Clocked Out </span>
                          <span className="text-[#10141a]">
                            {shift.clockedOutAt ? formatTime(shift.clockedOutAt) : "--:-- --"}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedShift(shift);
                          setShowShiftDetails(true);
                        }}
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
      <ShiftDetailsModal
        isOpen={showShiftDetails}
        shift={selectedShift}
        onClose={() => {
          setShowShiftDetails(false);
          setSelectedShift(null);
        }}
        onShiftUpdated={(updatedShift) =>
          setShifts((prev) => prev.map((shift) => (shift.id === updatedShift.id ? updatedShift : shift)))
        }
      />
    </>
  );
}
