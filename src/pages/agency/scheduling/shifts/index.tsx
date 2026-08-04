import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight, Search, Pencil, X, Calendar, CheckCircle, ChevronDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { listShifts, Shift, deleteShift, updateShift, ShiftType, SubmissionStatus, formatShiftLocation } from "@/lib/api/shifts";
import { useToast } from "@/hooks/use-toast";
import AddScheduleModal, { ScheduleFormData } from "../components/AddScheduleModal";
import { shiftToScheduleFormData } from "../shift-to-schedule-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ConfirmDialog,
  ConfirmDialogContent,
} from "@/components/ui/confirm-dialog";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import { staffLabels } from "@/lib/roleLabel";
import { useLocation, useNavigate } from "react-router";
import { menuItemClassName } from "@/components/ui/dot-grid-menu";
import {
  loadAllShiftPages,
  operationAgencyId,
  scopedShiftListParams,
} from "@/lib/operational-agency/shiftScope";
import { matchesShiftCategory, parseShiftCategory } from "@/lib/shift-category";

const getInitialsFromName = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
};

function ShiftListRowsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading shift list">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          data-testid="shift-list-skeleton-row"
          className="flex min-h-[76px] flex-wrap items-center gap-4 rounded-[20px] px-1 py-2"
        >
          <div className="flex w-[256px] items-center gap-4">
            <Skeleton className="h-[60px] w-[52px] shrink-0 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex w-[256px] items-center gap-4">
            <Skeleton className="h-[60px] w-[52px] shrink-0 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex min-w-[240px] flex-1 items-center gap-10">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          <div className="ml-auto flex min-w-[8rem] justify-end">
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export interface ShiftsListPageProps {
  clientId?: string;
  dateRange?: { startDate: string; endDate: string };
  readOnly?: boolean;
  embedded?: boolean;
}

export default function ShiftsListPage({ clientId, dateRange, readOnly = false, embedded = false }: ShiftsListPageProps) {
  const { toast } = useToast();
  const { agencyId, agency, mode, data, actor, routes } = useOperationalAgency();
  const location = useLocation();
  const navigate = useNavigate();
  const labels = staffLabels(mode ? [mode] : [...agency.supportedClientTypes]);
  const operationScopeRef = useRef(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [shiftToCancel, setShiftToCancel] = useState<Shift | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelledModal, setShowCancelledModal] = useState(false);
  const [cancelledShiftInfo, setCancelledShiftInfo] = useState<{
    clientName: string;
    dspName: string;
    duration: string;
    date: string;
  } | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editFormData, setEditFormData] = useState<ScheduleFormData | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [shiftToApprove, setShiftToApprove] = useState<Shift | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const itemsPerPage = 7;
  const shiftCategory = parseShiftCategory(location.search);
  const shiftRequestSearch = useMemo(() => {
    const query = new URLSearchParams(location.search);
    query.delete("shiftCategory");
    const value = query.toString();
    return value ? `?${value}` : "";
  }, [location.search]);

  const fetchShifts = useCallback(async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        const loadedShifts = await loadAllShiftPages(
          (params) => listShifts(params, { signal }),
          {
            ...scopedShiftListParams(agencyId, shiftRequestSearch, mode ?? undefined),
            ...(clientId ? { clientId } : {}),
            ...(dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate, limit: 200 } : {}),
          },
        );
        if (signal?.aborted) return;
        // Filter out shifts with type="manual" and submissionStatus="draft"
        const filteredShifts = loadedShifts.filter(shift =>
          !(shift.type === ShiftType.MANUAL && shift.submissionStatus === SubmissionStatus.DRAFT)
        );
        setShifts(filteredShifts);
      } catch (error) {
        if (signal?.aborted) return;
        console.error("Failed to fetch shifts:", error);
        toast({
          title: "Error",
          description: "Failed to load shifts. Please try again.",
          variant: "destructive",
        });
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
  }, [agencyId, clientId, dateRange?.endDate, dateRange?.startDate, mode, shiftRequestSearch, toast]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchShifts(controller.signal);
    return () => controller.abort();
  }, [fetchShifts]);

  useEffect(() => {
    operationScopeRef.current += 1;
    setSearchQuery("");
    setCurrentPage(1);
    setSelectedDate(null);
    setShowDatePicker(false);
    setShifts([]);
    setShowAddScheduleModal(false);
    setShowCancelModal(false);
    setShiftToCancel(null);
    setIsCancelling(false);
    setShowCancelledModal(false);
    setCancelledShiftInfo(null);
    setEditFormData(null);
    setModalMode("create");
    setShowApproveModal(false);
    setShiftToApprove(null);
    setIsApproving(false);
    return () => {
      operationScopeRef.current += 1;
    };
  }, [agencyId]);

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  // Filter shifts based on search and date
  const filteredShifts = useMemo(() => {
    let result = shifts.filter((shift) => matchesShiftCategory(shift, shiftCategory));

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(shift =>
        shift.client?.firstName?.toLowerCase().includes(query) ||
        shift.client?.lastName?.toLowerCase().includes(query) ||
        formatShiftLocation(shift.location).toLowerCase().includes(query)
      );
    }

    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      result = result.filter(shift => shift.date === dateStr);
    }

    return result;
  }, [shiftCategory, shifts, searchQuery, selectedDate]);

  useEffect(() => setCurrentPage(1), [shiftCategory]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / itemsPerPage));
  const paginatedShifts = filteredShifts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEdit = (shift: Shift) => {
    if (!agencyId) {
      toast({
        title: "Select an agency",
        description: "Choose an agency before editing a shift.",
      });
      return;
    }
    setEditFormData(shiftToScheduleFormData(shift));
    setModalMode("edit");
    setShowAddScheduleModal(true);
  };

  const confirmCancelShift = async (shiftId: string) => {
    const operationScope = operationScopeRef.current;
    try {
      setIsCancelling(true);

      // Capture info for success modal before we remove the shift
      if (shiftToCancel) {
        const clientName = shiftToCancel.client
          ? `${shiftToCancel.client.firstName || ""} ${shiftToCancel.client.lastName || ""}`.trim() || "Unknown Client"
          : "Unknown Client";
        const dspName = shiftToCancel.employee?.fullName || `Unknown ${labels.noun}`;
        const duration = calculateDuration(
          shiftToCancel.date,
          shiftToCancel.startTime,
          shiftToCancel.endTime
        );
        const dateLabel = shiftToCancel.date
          ? format(new Date(shiftToCancel.date), "d MMMM")
          : format(new Date(), "d MMMM");

        setCancelledShiftInfo({
          clientName,
          dspName,
          duration,
          date: dateLabel,
        });
      }

      if (!shiftToCancel) throw new Error("Shift is missing.");
      await deleteShift(shiftId, { agencyId: operationAgencyId(shiftToCancel, agencyId) });
      if (operationScope !== operationScopeRef.current) return;
      setShifts(prev => prev.filter(s => s.id !== shiftId));
      setShowCancelledModal(true);
    } catch (error) {
      if (operationScope !== operationScopeRef.current) return;
      toast({
        title: "Error",
        description: "Failed to cancel shift. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (operationScope === operationScopeRef.current) {
        setIsCancelling(false);
        setShowCancelModal(false);
        setShiftToCancel(null);
      }
    }
  };

  const handleCancel = (shift: Shift) => {
    setShiftToCancel(shift);
    setShowCancelModal(true);
  };

  const handleApprove = (shift: Shift) => {
    setShiftToApprove(shift);
    setShowApproveModal(true);
  };

  const openShiftDetails = (shift: Shift) => {
    if (actor === "super_admin") {
      const params = new URLSearchParams({
        agencyId: operationAgencyId(shift, agencyId),
        returnTo: `${location.pathname}${location.search}`,
      });
      navigate(routes.details(shift.id, params.toString()));
      return;
    }
    navigate(routes.details(shift.id));
  };

  const confirmApproveShift = async (shiftId: string) => {
    const operationScope = operationScopeRef.current;
    try {
      setIsApproving(true);
      if (!shiftToApprove) throw new Error("Shift is missing.");
      await updateShift(
        shiftId,
        { type: ShiftType.AUTOMATIC },
        { agencyId: operationAgencyId(shiftToApprove, agencyId) },
      );
      if (operationScope !== operationScopeRef.current) return;

      // Update the shift in the local state
      setShifts(prev => prev.map(shift =>
        shift.id === shiftId
          ? { ...shift, type: ShiftType.AUTOMATIC }
          : shift
      ));

      toast({
        title: "Success",
        description: "Shift has been approved and converted to automatic.",
        variant: "default",
      });

      setShowApproveModal(false);
      setShiftToApprove(null);
    } catch (error) {
      if (operationScope !== operationScopeRef.current) return;
      console.error("Failed to approve shift:", error);
      toast({
        title: "Error",
        description: "Failed to approve shift. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (operationScope === operationScopeRef.current) setIsApproving(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
    setCurrentPage(1);
  };

  // Calculate shift duration from 12-hour times like "09:00:AM" or "11.30:AM"
  const calculateDuration = (date: string, startTime?: string, endTime?: string): string => {
    // Keep date in the signature for future use, but duration is based on time strings only
    if (!startTime || !endTime) return "2 hours";

    const parseTimeToMinutes = (time: string): number | null => {
      // Supports "HH:MM:AM", "HH.MM:AM", etc.
      const match = time.match(/(\d+)[.:](\d+):?(AM|PM)/i);
      if (!match) return null;

      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();

      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      return hours * 60 + minutes;
    };

    try {
      const startMinutes = parseTimeToMinutes(startTime);
      const endMinutes = parseTimeToMinutes(endTime);

      if (startMinutes == null || endMinutes == null) return "2 hours";

      let diffMinutes = endMinutes - startMinutes;
      // If negative or zero (e.g. overnight shift), fall back to default
      if (diffMinutes <= 0) return "2 hours";

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      if (minutes > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${hours} hours`;
    } catch {
      return "2 hours";
    }
  };

  return (
    <>
      <div className={embedded ? "" : "min-h-[calc(100vh-200px)]"}>
        {/* Header */}
        {!embedded ? <div className="flex items-center justify-between mb-8">
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
            Shift Management
          </h1>
          {!readOnly ? <Button
            disabled={!agencyId}
            title={!agencyId ? "Select an agency to add a schedule" : undefined}
            onClick={() => {
              setModalMode("create");
              setEditFormData(null);
              setShowAddScheduleModal(true);
            }}
            className="flex items-center gap-3 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-4 py-3 h-auto font-semibold text-[14px]"
          >
            <Plus className="w-5 h-5" />
            Add Schedule
          </Button>
          : null}
        </div> : null}

        {/* Main Content Card */}
        <div className="relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.3)] backdrop-blur bg-[rgba(255,255,255,0.3)]">
          <div className="p-5">
            {/* Card Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                  Shifts ( {selectedDate ? format(selectedDate, "d MMMM") : format(new Date(), "d MMMM")} )
                </h2>
                <p className="text-[14px] font-medium leading-[1.4] text-[#808081] capitalize">
                  All scheduled shifts for your agency.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                {/* Date Picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="flex items-center gap-3 bg-white border border-[rgba(255,255,255,0.3)] rounded-xl px-4 py-2 h-[36px] cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-[14px] font-normal text-[#10141a] whitespace-nowrap">
                      {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select date"}
                    </span>
                    <Calendar className="w-5 h-5 text-[#10141a]" />
                  </button>

                  {/* Date Picker Dropdown */}
                  {showDatePicker && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-[#e5e5e6] p-4 z-50 w-[280px]">
                      {/* Month Navigation */}
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                          className="p-1 hover:bg-gray-100 rounded cursor-pointer"
                        >
                          <ChevronLeft className="w-5 h-5 text-[#808081]" />
                        </button>
                        <span className="text-[14px] font-semibold text-[#10141a]">
                          {format(currentMonth, "MMMM yyyy")}
                        </span>
                        <button
                          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                          className="p-1 hover:bg-gray-100 rounded cursor-pointer"
                        >
                          <ChevronRight className="w-5 h-5 text-[#10141a]" />
                        </button>
                      </div>

                      {/* Week Days */}
                      <div className="grid grid-cols-7 mb-2">
                        {weekDays.map((day) => (
                          <div key={day} className="text-center text-[10px] font-medium text-[#808081] py-1">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, index) => {
                          const isCurrentMonth = isSameMonth(day, currentMonth);
                          const isSelected = selectedDate && isSameDay(day, selectedDate);
                          const isToday = isSameDay(day, new Date());

                          return (
                            <button
                              key={index}
                              onClick={() => handleDateSelect(day)}
                              className={`
                              p-2 text-[12px] font-medium rounded-[6px] cursor-pointer transition-colors
                              ${isSelected
                                  ? "bg-[#2B82FF] text-white"
                                  : isToday
                                    ? "bg-[#e5e5e6] text-[#10141a]"
                                    : isCurrentMonth
                                      ? "text-[#10141a] hover:bg-[#e5e5e6]"
                                      : "text-[#b2b2b3] hover:bg-[#f0f0f0]"
                                }
                            `}
                            >
                              {format(day, "d")}
                            </button>
                          );
                        })}
                      </div>

                      {/* Clear Button */}
                      {selectedDate && (
                        <button
                          onClick={clearDateFilter}
                          className="mt-3 w-full py-2 text-[12px] font-medium text-[#808081] hover:text-[#10141a] transition-colors cursor-pointer"
                        >
                          Clear filter
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full px-3 py-2 h-[36px] w-[320px]">
                  <Search className="w-5 h-5 text-[#808081]" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="flex-1 bg-transparent text-[12px] font-medium text-[#10141a] placeholder:text-[#808081] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Shifts List */}
            <div className="space-y-3">
              {loading ? (
                <ShiftListRowsSkeleton />
              ) : paginatedShifts.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-[14px] text-[#808081]">No shifts found</p>
                </div>
              ) : (
                paginatedShifts.map((shift) => {
                  const apiShift = shift as Shift;
                  const clientName = apiShift.client
                    ? `${apiShift.client.firstName || ""} ${apiShift.client.lastName || ""}`.trim() || "Unknown Client"
                    : "Unknown Client";
                  const clientAvatar = apiShift.client?.profileImage;
                  const employeeName = apiShift.employee?.fullName || `Unknown ${labels.noun}`;
                  const employeeAvatar = apiShift.employee?.profilePicture;
                  const location = formatShiftLocation(apiShift.location?.address || "") || "Unknown Location";
                  const duration = calculateDuration(apiShift.date, apiShift.startTime, apiShift.endTime);

                  return (
                    <div
                      key={apiShift.id}
                      className="flex flex-wrap items-center gap-4 backdrop-blur-[20px] rounded-[20px]"
                    >
                      {/* Client Info */}
                      <div className="flex items-center gap-4 w-[256px]">
                        <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
                          {clientAvatar && (
                            <AvatarImage
                              src={clientAvatar}
                              alt={clientName}
                              className="w-full h-full object-cover aspect-auto"
                            />
                          )}
                          <AvatarFallback className="w-full h-full rounded-[8px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                            {getInitialsFromName(clientName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[16px] font-semibold leading-[1.6] text-black">
                            {clientName}
                          </span>
                          <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                            {agencyId ? "Client" : apiShift.agency?.name || "Unknown agency"}
                          </span>
                        </div>
                      </div>

                      {/* DSP/Employee Info */}
                      <div className="flex items-center gap-4 w-[256px]">
                        <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
                          {employeeAvatar && (
                            <AvatarImage
                              src={employeeAvatar}
                              alt={employeeName}
                              className="w-full h-full object-cover aspect-auto"
                            />
                          )}
                          <AvatarFallback className="w-full h-full rounded-[8px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
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

                      {/* Location */}
                      <div className="flex-1 flex items-center gap-[55px] w-[256px]">
                        <div className="text-[12px] font-medium leading-[1.4] w-[123px]">
                          <p className="text-[#808081]">Location</p>
                          <p className="text-[#10141a]">{location}</p>
                        </div>

                        {/* Duration Badge */}
                        <div className="bg-[rgba(14,175,82,0.05)] border border-[#0eaf52] rounded-full min-w-[59px] min-h-[28px] flex items-center justify-center gap-[4px] px-2.5">
                          <span className="text-[12px] font-semibold text-[#0eaf52] whitespace-nowrap">
                            {duration}
                          </span>
                        </div>
                      </div>
                      <div className="ml-auto flex min-w-[9rem] flex-1 items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 gap-1.5 rounded-full border-[#dce3e3] bg-white px-4 text-[14px] font-semibold text-[#10141a] shadow-sm hover:bg-[#f5f9f9]"
                              aria-label={`Shift actions for ${clientName}`}
                            >
                              Actions
                              <ChevronDown className="size-4 opacity-70" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[100] min-w-[180px] rounded-xl border-0 bg-white p-0 shadow-lg">
                            <DropdownMenuItem
                              className={menuItemClassName}
                              aria-label="Open full shift details page"
                              onClick={() => openShiftDetails(apiShift)}
                            >
                              <FileText className="text-[#808081]" aria-hidden />
                              Details
                            </DropdownMenuItem>
                            {!readOnly ? <DropdownMenuItem
                              className={menuItemClassName}
                              disabled={!agencyId}
                              title={!agencyId ? "Select an agency to edit this shift" : undefined}
                              onClick={() => handleEdit(apiShift)}
                            >
                              <Pencil className="text-[#808081]" aria-hidden />
                              Edit
                            </DropdownMenuItem> : null}
                            {!readOnly && apiShift.type === ShiftType.MANUAL && apiShift.submissionStatus === SubmissionStatus.SUBMITTED ? (
                              <DropdownMenuItem className={menuItemClassName} onClick={() => handleApprove(apiShift)}>
                                <CheckCircle className="text-[#0eaf52]" aria-hidden />
                                Approve
                              </DropdownMenuItem>
                            ) : null}
                            {!readOnly ? <DropdownMenuItem
                              className={`${menuItemClassName} text-[#d53411] hover:bg-[#fff2ef] focus:bg-[#fff2ef] focus:text-[#d53411]`}
                              onClick={() => handleCancel(apiShift)}
                            >
                              <X className="text-[#d53411]" aria-hidden />
                              Cancel
                            </DropdownMenuItem> : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {filteredShifts.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <span className="text-[16px] font-medium leading-[1.6] text-[#10141a]">
                  {currentPage}
                  <span className="text-[14px] text-[#808081]">/{totalPages}</span>
                </span>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5 text-[#10141a]" />
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5 text-[#10141a]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Schedule Modal */}
      {!readOnly ? <AddScheduleModal
        isOpen={showAddScheduleModal}
        agencyId={agencyId}
        agencyName={agency.name}
        agencyMode={mode}
        supportedClientTypes={agency.supportedClientTypes}
        data={data}
        onClose={() => {
          setShowAddScheduleModal(false);
          setModalMode("create");
          setEditFormData(null);
        }}
        onShiftsUpdated={(updatedShifts) => setShifts(updatedShifts)}
        mode={modalMode}
        editData={editFormData || undefined}
      /> : null}

      {/* Cancel Shift Confirmation Dialog */}
      {!readOnly ? <ConfirmDialog
        open={showCancelModal && !!shiftToCancel}
        onOpenChange={(open: boolean) => {
          if (isCancelling) return;
          setShowCancelModal(open);
          if (!open) {
            setShiftToCancel(null);
          }
        }}
      >
        <ConfirmDialogContent
          title="Cancel shift?"
          description={shiftToCancel ? `Are you sure you want to cancel this shift for ${shiftToCancel.client
            ? `${shiftToCancel.client.firstName || ""} ${shiftToCancel.client.lastName || ""}`.trim() || "Unknown Client"
            : "Unknown Client"
            } at ${agency.name}? This action cannot be undone.` : ""}
          confirmText="Cancel Shift"
          cancelText="Keep Shift"
          onConfirm={() => shiftToCancel && confirmCancelShift(shiftToCancel.id)}
          onCancel={() => setShowCancelModal(false)}
          isLoading={isCancelling}
          loadingText="Cancelling..."
        />
      </ConfirmDialog> : null}

      {/* Shift Cancelled Success Dialog */}
      {!readOnly ? <ConfirmDialog
        open={showCancelledModal && !!cancelledShiftInfo}
        onOpenChange={(open: boolean) => {
          setShowCancelledModal(open);
          if (!open) {
            setCancelledShiftInfo(null);
          }
        }}
      >
        <ConfirmDialogContent
          title="Cancelled"
          description={cancelledShiftInfo
            ? `You have cancelled a shift between ${cancelledShiftInfo.clientName} (Client) & ${cancelledShiftInfo.dspName} (${labels.noun}) for ${cancelledShiftInfo.duration} on ${cancelledShiftInfo.date}`
            : ""}
          confirmText="Close"
          cancelText=""
          onConfirm={() => setShowCancelledModal(false)}
          onCancel={() => setShowCancelledModal(false)}
        />
      </ConfirmDialog> : null}

      {/* Approve Shift Confirmation Dialog */}
      {!readOnly ? <ConfirmDialog
        open={showApproveModal && !!shiftToApprove}
        onOpenChange={(open: boolean) => {
          if (isApproving) return;
          setShowApproveModal(open);
          if (!open) {
            setShiftToApprove(null);
          }
        }}
      >
        <ConfirmDialogContent
          title="Approve shift?"
          description={shiftToApprove ? `Are you sure you want to approve this manual shift for ${shiftToApprove.client
            ? `${shiftToApprove.client.firstName || ""} ${shiftToApprove.client.lastName || ""}`.trim() || "Unknown Client"
            : "Unknown Client"
            } at ${agency.name}? This will convert it to an automatic shift.` : ""}
          confirmText="Approve Shift"
          cancelText="Cancel"
          onConfirm={() => shiftToApprove && confirmApproveShift(shiftToApprove.id)}
          onCancel={() => setShowApproveModal(false)}
          isLoading={isApproving}
          loadingText="Approving..."
        />
      </ConfirmDialog> : null}
    </>
  );
}
