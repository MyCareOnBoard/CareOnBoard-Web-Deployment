import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  Loader2,
  Wrench,
  CalendarDays,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isSameDay, parseISO } from "date-fns";
import { listShifts, deleteShift, Shift, ShiftStatus } from "@/lib/api/shifts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, generatePath } from "react-router";
import { Routes } from "@/routes/constants";
import AddScheduleModal, { ScheduleFormData } from "./components/AddScheduleModal";
import { shiftToScheduleFormData } from "./shift-to-schedule-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/utils/auth";
import ShiftDetailsModal from "@/components/ShiftDetailsModal";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";

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
// Helper function to get status display info
const getStatusInfo = (shift: Shift, approved?: boolean) => {
  // Check if shift is missed first, regardless of status
  if (isShiftMissed(shift)) {
    return { label: "Missed", color: "#FF6C10", bgColor: "rgba(255,108,16,0.05)" };
  }

  switch (shift.status) {
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
      return { label: shift.status, color: "#808081", bgColor: "rgba(128,128,129,0.05)" };
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

function shiftDeleteConfirmMessage(shift: Shift): string {
  const clientLabel = shift.client
    ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() || "this client"
    : "this client";
  const when = shift.date ? format(parseISO(shift.date), "MMMM d, yyyy") : "the scheduled date";
  return `Removes ${clientLabel}'s shift on ${when} from the schedule. This can't be undone.`;
}

export default function SchedulingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showShiftDetails, setShowShiftDetails] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [editFormData, setEditFormData] = useState<ScheduleFormData | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [shiftMenuOpenForId, setShiftMenuOpenForId] = useState<string | null>(null);
  const [shiftPendingDelete, setShiftPendingDelete] = useState<Shift | null>(null);
  const [isDeletingShift, setIsDeletingShift] = useState(false);

  // API data states
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 6;

  const handleEdit = (shift: Shift) => {
    setEditFormData(shiftToScheduleFormData(shift));
    setModalMode("edit");
    setShowAddScheduleModal(true);
  };

  const closeShiftRowMenu = () => setShiftMenuOpenForId(null);

  const goToShiftDetailsPage = (shift: Shift) => {
    closeShiftRowMenu();
    navigate(generatePath(Routes.agency.shiftDetails, { shiftId: shift.id }));
  };

  const openShiftMaintenanceModal = (shift: Shift) => {
    closeShiftRowMenu();
    setSelectedShift(shift);
    setShowShiftDetails(true);
  };

  const openEditScheduleFromMenu = (shift: Shift) => {
    closeShiftRowMenu();
    handleEdit(shift);
  };

  const requestDeleteShiftFromMenu = (shift: Shift) => {
    closeShiftRowMenu();
    setShiftPendingDelete(shift);
  };

  const confirmDeleteShift = async () => {
    if (!shiftPendingDelete) return;
    setIsDeletingShift(true);
    try {
      await deleteShift(shiftPendingDelete.id);
      setShifts((prev) => prev.filter((s) => s.id !== shiftPendingDelete.id));
      toast({
        title: "Shift deleted",
        description: "This shift was removed from the schedule.",
      });
      setShiftPendingDelete(null);
    } catch (err) {
      console.error(err);
      toast({
        title: "Couldn't delete shift",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingShift(false);
    }
  };

  // Fetch all shifts for activity log
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

  // Calculate shift statistics
  const shiftStats = useMemo(() => {
    const targetDate = selectedDate || new Date();
    const filteredShifts = shifts.filter(shift => {
      if (!shift.date) return false;
      try {
        const shiftDate = parseISO(shift.date);
        return isSameDay(shiftDate, targetDate);
      } catch {
        return false;
      }
    });

    const active = filteredShifts.filter(s => s.status === ShiftStatus.ONGOING).length;
    const completed = filteredShifts.filter(s => s.status === ShiftStatus.COMPLETED).length;
    const missed = filteredShifts.filter(isShiftMissed).length;

    return {
      active,
      completed,
      missed,
      date: format(targetDate, "d MMMM"),
      total: filteredShifts.length,
    };
  }, [shifts, selectedDate]);

  const shiftDatesWithShifts = useMemo(() => {
    const s = new Set<string>();
    for (const sh of shifts) {
      if (sh.date) s.add(sh.date);
    }
    return s;
  }, [shifts]);

  const filteredActivityShifts = useMemo(() => {
    if (!selectedDate) return shifts;
    return shifts.filter(shift => {
      if (!shift.date) return false;
      try {
        const shiftDate = parseISO(shift.date);
        return isSameDay(shiftDate, selectedDate);
      } catch {
        return false;
      }
    });
  }, [shifts, selectedDate]);

  const totalActivityPages = Math.max(1, Math.ceil(filteredActivityShifts.length / itemsPerPage));

  useEffect(() => {
    setActivityPage(1);
  }, [selectedDate]);

  useEffect(() => {
    setActivityPage((p) => Math.min(Math.max(1, p), totalActivityPages));
  }, [totalActivityPages]);

  const paginatedShifts = filteredActivityShifts.slice(
    (activityPage - 1) * itemsPerPage,
    activityPage * itemsPerPage
  );

  return (
    <>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
            Shift Management
          </h1>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(Routes.agency.shiftMaintenance)}
              className="flex items-center gap-2 rounded-full border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.5)] px-4 py-3 h-auto text-[14px] font-semibold text-[#10141a] shadow-sm hover:bg-white/80"
              aria-label="Open shift maintenance: review problem shifts and activity history"
            >
              <Wrench className="size-5 shrink-0" aria-hidden />
              Maintenance
            </Button>
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
        </div>

        {/* Main Content */}
        <div className="space-y-5">
          {/* Shifts Summary Card */}
          <div className="rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
            <div className="flex items-center gap-2">
              {/* Title Section */}
              <div className="flex flex-col gap-1 w-[214px]">
                <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                  Shifts ({shiftStats.date})
                </h2>
                <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                  Shifts data of {shiftStats.date}
                </p>
              </div>

              {/* Stats Section */}
              <div className="flex gap-12 px-6 cursor-pointer" onClick={() => navigate(Routes.agency.shiftsList)}>
                {/* Active */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[40px] font-semibold leading-normal text-[#10141a]">
                    {loading ? "-" : shiftStats.active}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#0EAF52]" />
                    <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                      Active
                    </span>
                  </div>
                </div>

                {/* Completed */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[40px] font-semibold leading-normal text-[#10141a]">
                    {loading ? "-" : shiftStats.completed}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#2B82FF]" />
                    <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                      Completed
                    </span>
                  </div>
                </div>

                {/* Missed */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[40px] font-semibold leading-normal text-[#10141a]">
                    {loading ? "-" : shiftStats.missed}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#D53411]" />
                    <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                      Missed
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[40px] font-semibold leading-normal text-[#10141a]">
                    {loading ? "-" : shiftStats.total}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#808081]" />
                    <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                      Total
                    </span>
                  </div>
                </div>
              </div>

              {/* Expand Button */}
              <button
                onClick={() => navigate(Routes.agency.shiftsList)}
                className="ml-auto bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full w-[38px] h-[38px] flex items-center justify-center hover:bg-white/70 transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-[#10141a]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent shifts */}
      <div className="mt-5 rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
        <div>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                Recent Shifts
              </h2>
              <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                Recent clock-in and clock-out activity. Pick a day with the calendar filter, or open the full log to search older shifts.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start sm:mt-0.5">
              <Popover
                open={calendarOpen}
                onOpenChange={(open) => {
                  setCalendarOpen(open);
                  if (open) setCalendarMonth(selectedDate ?? new Date());
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex h-10 items-center gap-2 rounded-full border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.5)] px-3 text-[14px] font-semibold text-[#10141a] shadow-sm hover:bg-white/80"
                    aria-expanded={calendarOpen}
                    aria-haspopup="dialog"
                    aria-label={
                      selectedDate
                        ? `Date filter: ${format(selectedDate, "MMMM d, yyyy")}. Open calendar to change`
                        : "Filter recent shifts by date"
                    }
                  >
                    <CalendarDays className="size-4 shrink-0 text-[#10141a]" aria-hidden />
                    <span className="max-w-[140px] truncate sm:max-w-[180px]">
                      {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Filter by date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border border-white/40 bg-[#FFFFFFF2] p-0 shadow-lg backdrop-blur-md" align="end">
                  <div className="p-1">
                    <Calendar
                      mode="single"
                      weekStartsOn={1}
                      captionLayout="dropdown"
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      selected={selectedDate ?? undefined}
                      onSelect={(d) => {
                        setSelectedDate(d ?? null);
                        if (d) setCalendarMonth(d);
                        setCalendarOpen(false);
                      }}
                      modifiers={{
                        hasShift: (date) => shiftDatesWithShifts.has(format(date, "yyyy-MM-dd")),
                      }}
                      modifiersClassNames={{
                        hasShift:
                          "relative after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary data-[selected-single=true]:after:bg-primary-foreground",
                      }}
                    />
                  </div>
                  {selectedDate ? (
                    <div className="border-t border-[#e5e5e6] p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 w-full text-[14px] font-medium text-[#10141a]"
                        onClick={() => {
                          setSelectedDate(null);
                          setCalendarOpen(false);
                        }}
                      >
                        Show all days
                      </Button>
                    </div>
                  ) : null}
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => navigate(Routes.agency.activityLogs)}
                className="size-10 shrink-0 rounded-full border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.5)] shadow-sm hover:bg-white/80"
                aria-label="Open full activity log: search and browse all shift history"
              >
                <ArrowUpRight className="size-4 text-[#10141a]" />
              </Button>
            </div>
          </div>

          {/* Activity Items */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#00b4b8]" />
              </div>
            ) : filteredActivityShifts.length === 0 ? (
              <div className="flex items-center justify-center py-8 px-4 text-center">
                <p className="text-[14px] text-[#808081] max-w-md">
                  {shifts.length === 0
                    ? "No shifts yet. Add a schedule to get started."
                    : selectedDate
                      ? `No shifts on ${format(selectedDate, "MMMM d, yyyy")}. Try another date, or open the calendar filter and choose Show all days.`
                      : "No shifts to show."}
                </p>
              </div>
            ) : (
              paginatedShifts.map((shift) => {
                const statusInfo = getStatusInfo(shift, shift.approved);
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
                      {/* Status Badge */}
                      <div
                        className="rounded-full min-w-[54px] min-h-7 flex items-center justify-center gap-1 px-2.5"
                        style={{
                          backgroundColor: statusInfo.bgColor,
                          border: `1px solid ${statusInfo.color}`
                        }}
                      >
                        <span
                          className="text-[12px] font-semibold"
                          style={{ color: statusInfo.color }}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Clocked In */}
                      <div className="text-[14px] font-medium leading-[1.4] flex flex-col">
                        <span className="text-[#808081] whitespace-nowrap">Clocked In </span>
                        <span className="text-[#10141a]">
                          {shift.clockedInAt ? formatTime(shift.clockedInAt) : "--:-- --"}
                        </span>
                      </div>

                      {/* Clocked Out */}
                      <div className="text-[14px] font-medium leading-[1.4] flex flex-col">
                        <span className="text-[#808081] whitespace-nowrap">Clocked Out </span>
                        <span className="text-[#10141a]">
                          {shift.clockedOutAt ? formatTime(shift.clockedOutAt) : "--:-- --"}
                        </span>
                      </div>
                    </div>

                    <Popover
                      open={shiftMenuOpenForId === shift.id}
                      onOpenChange={(open) => setShiftMenuOpenForId(open ? shift.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 gap-1.5 rounded-full border-[rgba(255,255,255,0.6)] bg-white px-4 text-[14px] font-semibold text-[#10141a] shadow-sm hover:bg-white"
                          aria-expanded={shiftMenuOpenForId === shift.id}
                          aria-haspopup="dialog"
                          aria-label={`Shift actions for ${clientName}`}
                        >
                          Actions
                          <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[min(calc(100vw-2rem),15.5rem)] border border-white/40 bg-[#FFFFFFF2] p-1 shadow-lg backdrop-blur-md"
                        align="end"
                      >
                        <div className="flex flex-col gap-0.5" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#10141a] hover:bg-black/[0.06]"
                            aria-label="Open full shift details page"
                            onClick={() => goToShiftDetailsPage(shift)}
                          >
                            <FileText className="size-4 shrink-0 text-[#808081]" aria-hidden />
                            Details
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#10141a] hover:bg-black/[0.06]"
                            aria-label="Edit this shift in the schedule"
                            onClick={() => openEditScheduleFromMenu(shift)}
                          >
                            <Pencil className="size-4 shrink-0 text-[#808081]" aria-hidden />
                            Edit
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#10141a] hover:bg-black/[0.06]"
                            aria-label="Adjust clock times, notes, or mark shift completed"
                            onClick={() => openShiftMaintenanceModal(shift)}
                          >
                            <Wrench className="size-4 shrink-0 text-[#808081]" aria-hidden />
                            Maintenance
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#D53411] hover:bg-red-50"
                            aria-label="Delete this shift from the schedule"
                            onClick={() => requestDeleteShiftFromMenu(shift)}
                          >
                            <Trash2 className="size-4 shrink-0" aria-hidden />
                            Delete
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {filteredActivityShifts.length > 0 && totalActivityPages > 1 && (
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

      {/* Add Schedule Modal */}
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
        onShiftDeleted={(shiftId) =>
          setShifts((prev) => prev.filter((shift) => shift.id !== shiftId))
        }
      />
      <DeleteConfirmationModal
        isOpen={!!shiftPendingDelete}
        onClose={() => {
          if (!isDeletingShift) setShiftPendingDelete(null);
        }}
        onConfirm={confirmDeleteShift}
        isDeleting={isDeletingShift}
        title="Delete this shift?"
        message={shiftPendingDelete ? shiftDeleteConfirmMessage(shiftPendingDelete) : ""}
        confirmText="Delete shift"
        cancelText="Cancel"
      />
    </>
  );
}
