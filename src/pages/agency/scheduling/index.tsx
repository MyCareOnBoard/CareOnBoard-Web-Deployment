import React, { useState, useMemo, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { listShifts, Shift, ShiftStatus, deleteShift } from "@/lib/api/shifts";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import AddScheduleModal from "./components/AddScheduleModal";
import { seedClients } from "@/lib/api/clients";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/utils/auth";

// Helper function to format time for display
const formatTime = (time?: string): string => {
  if (!time) return "-";
  try {
    // If it's already in a readable format, return as-is
    if (time.includes("AM") || time.includes("PM")) return time;
    
    // Try to parse and format
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}.${minutes || "00"} ${ampm}`;
  } catch {
    return time;
  }
};

// Helper function to get status display info
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

export default function SchedulingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activityPage, setActivityPage] = useState(1);
  const [approvalPage, setApprovalPage] = useState(1);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  
  // API data states
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedingClients, setSeedingClients] = useState(false);
  
  const itemsPerPage = 6;
  
  // Month and year options
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

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
    const active = shifts.filter(s => s.status === ShiftStatus.ONGOING).length;
    const completed = shifts.filter(s => s.status === ShiftStatus.COMPLETED).length;
    const missed = shifts.filter(s => s.status === ShiftStatus.EXPIRED).length;
    
    return {
      active,
      completed,
      missed,
      date: format(new Date(), "d MMMM"),
      total: shifts.length,
    };
  }, [shifts]);

  // Get pending approvals (completed shifts that need approval)
  const pendingApprovals = useMemo(() => {
    return shifts.filter(shift => 
      shift.status === ShiftStatus.COMPLETED && 
      (shift.approved === false || shift.approved === null || shift.approved === undefined)
    );
  }, [shifts]);

  // Pagination calculations
  const totalActivityPages = Math.max(1, Math.ceil(shifts.length / itemsPerPage));
  const totalApprovalPages = Math.max(1, Math.ceil(pendingApprovals.length / itemsPerPage));

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const paginatedShifts = shifts.slice(
    (activityPage - 1) * itemsPerPage,
    activityPage * itemsPerPage
  );

  const paginatedApprovals = pendingApprovals.slice(
    (approvalPage - 1) * itemsPerPage,
    approvalPage * itemsPerPage
  );

  // Calculate shift duration
  const calculateDuration = (date: string, startTime?: string, endTime?: string): string => {
    if (!startTime || !endTime) return "2 hours";

    const parseTimeToMinutes = (time: string): number | null => {
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
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          Scheduling
        </h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowAddScheduleModal(true)}
            className="flex items-center gap-3 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-4 py-3 h-auto font-semibold text-[14px]"
          >
            <Plus className="w-5 h-5" />
            Add Schedule
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_527px] gap-5">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Shifts Summary Card */}
          <div className="relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.3)]">
            {/* Glassmorphism background */}
            <div className="absolute inset-0 backdrop-blur-[50px] bg-[rgba(255,255,255,0.4)]" />
            
            <div className="relative px-5 py-4 flex items-center gap-2">
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
                className="ml-auto bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full w-[38px] h-[38px] flex items-center justify-center hover:bg-white/70 transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-[#10141a]" />
              </button>
            </div>
          </div>

          {/* Calendar Card */}
          <div className="relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.3)] backdrop-blur bg-[rgba(255,255,255,0.3)]">
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                    Shifts Calendar View
                  </h2>
                  <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                    View and manage your scheduled shifts by date.
                  </p>
                </div>
              </div>

              {/* Calendar */}
              <div className="flex flex-col rounded-[12px] overflow-hidden w-full max-w-[575px] mx-auto">
                {/* Month Navigation */}
                <div className="flex items-center justify-center gap-2.5 px-5 py-2 relative">
                  <button
                    onClick={handlePrevMonth}
                    className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#808081]" />
                  </button>
                  <div className="flex-1 flex items-center justify-center gap-1 relative">
                    {/* Month Selector */}
                    <button
                      onClick={() => {
                        setShowMonthPicker(!showMonthPicker);
                        setShowYearPicker(false);
                      }}
                      className="text-[16px] font-semibold leading-[1.6] text-[#10141a] hover:text-[#2B82FF] cursor-pointer transition-colors"
                    >
                      {format(currentMonth, "MMMM")}
                    </button>
                    {/* Year Selector */}
                    <button
                      onClick={() => {
                        setShowYearPicker(!showYearPicker);
                        setShowMonthPicker(false);
                      }}
                      className="text-[16px] font-semibold leading-[1.6] text-[#10141a] hover:text-[#2B82FF] cursor-pointer transition-colors"
                    >
                      {format(currentMonth, "yyyy")}
                    </button>
                  </div>
                  <button
                    onClick={handleNextMonth}
                    className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5 text-[#10141a]" />
                  </button>
                  
                  {/* Month Picker Dropdown */}
                  {showMonthPicker && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-[12px] shadow-lg border border-[#e5e5e6] p-3 z-50 grid grid-cols-3 gap-2 w-[280px]">
                      {months.map((month, index) => (
                        <button
                          key={month}
                          onClick={() => {
                            const newDate = new Date(currentMonth);
                            newDate.setMonth(index);
                            setCurrentMonth(newDate);
                            setShowMonthPicker(false);
                          }}
                          className={`
                            px-3 py-2 text-[14px] font-medium rounded-[6px] cursor-pointer transition-colors
                            ${currentMonth.getMonth() === index 
                              ? "bg-[#2B82FF] text-white" 
                              : "text-[#10141a] hover:bg-[#e5e5e6]"
                            }
                          `}
                        >
                          {month.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Year Picker Dropdown */}
                  {showYearPicker && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-[12px] shadow-lg border border-[#e5e5e6] p-3 z-50 grid grid-cols-2 gap-2 w-[180px]">
                      {years.map((year) => (
                        <button
                          key={year}
                          onClick={() => {
                            const newDate = new Date(currentMonth);
                            newDate.setFullYear(year);
                            setCurrentMonth(newDate);
                            setShowYearPicker(false);
                          }}
                          className={`
                            px-3 py-2 text-[14px] font-medium rounded-[6px] cursor-pointer transition-colors
                            ${currentMonth.getFullYear() === year 
                              ? "bg-[#2B82FF] text-white" 
                              : "text-[#10141a] hover:bg-[#e5e5e6]"
                            }
                          `}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-[#e5e5e6] w-full" />

                {/* Week Days Header */}
                <div className="flex items-center justify-center pt-2 w-full">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="flex-1 px-2 py-0.5 text-center text-[12px] font-medium text-[#10141a]"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="flex flex-col w-full">
                  {/* Split calendar days into weeks */}
                  {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIndex) => (
                    <div key={weekIndex} className="flex items-center justify-center py-1 w-full">
                      {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isToday = isSameDay(day, new Date());
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        
                        // Check if there are shifts on this day
                        const dayStr = format(day, "yyyy-MM-dd");
                        const hasShifts = shifts.some(s => s.date === dayStr);

                        return (
                          <button
                            key={dayIndex}
                            onClick={() => setSelectedDate(day)}
                            className={`
                              flex-1 flex flex-col items-center justify-center p-2 text-center transition-colors relative cursor-pointer
                              ${isSelected 
                                ? "bg-[#2B82FF] text-white rounded-[6px] font-semibold" 
                                : isCurrentMonth 
                                  ? "text-[#10141a] font-medium hover:bg-[#e5e5e6] hover:rounded-[6px]" 
                                  : "text-[#b2b2b3] font-medium hover:bg-[#f0f0f0] hover:rounded-[6px]"
                              }
                            `}
                          >
                            <span className="text-[14px] leading-[1.4]">
                              {format(day, "d")}
                            </span>
                            {hasShifts && !isSelected && (
                              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#2B82FF]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Pending Approvals */}
        <div className="relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.3)] backdrop-blur bg-[rgba(255,255,255,0.3)]">
          <div className="p-5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                  Pending Approvals
                </h2>
                <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                  Completed shifts awaiting approval. Click Expand to manage.
                </p>
              </div>
              <button 
                onClick={() => navigate(Routes.agency.approvals)}
                className="backdrop-blur-[22px] bg-[rgba(178,178,179,0.1)] rounded-full px-4 py-2 flex items-center gap-2 hover:bg-[rgba(178,178,179,0.2)] transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-[#808081]" />
              </button>
            </div>

            {/* Approval Items */}
            <div className="flex-1 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00b4b8]" />
                </div>
              ) : paginatedApprovals.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-[14px] text-[#808081]">No pending approvals</p>
                </div>
              ) : (
                paginatedApprovals.map((shift) => {
                  const clientName = shift.client 
                    ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() || "Unknown Client"
                    : "Unknown Client";
                  const clientAvatar = shift.client?.profileImage;
                  const employeeName = shift.employee?.fullName || "Unknown DSP";
                  const employeeAvatar = shift.employee?.profilePicture;
                  const location = shift.location || "Unknown Location";
                  const duration = calculateDuration(shift.date, shift.startTime, shift.endTime);

                  return (
                    <div
                      key={shift.id}
                      className="flex flex-wrap items-center gap-4 backdrop-blur-[20px] rounded-[20px]"
                    >
                      {/* Client Info */}
                      <div className="flex items-center gap-4 w-[256px]">
                        <Avatar className="w-[52.5px] h-[60px] rounded-[8px] flex-shrink-0">
                          {clientAvatar && (
                            <AvatarImage
                              src={clientAvatar}
                              alt={clientName}
                              className="w-full h-full object-cover aspect-auto rounded-[8px]"
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
                            Client
                          </span>
                        </div>
                      </div>

                      {/* DSP/Employee Info */}
                      <div className="flex items-center gap-4 w-[256px]">
                        <Avatar className="w-[52.5px] h-[60px] rounded-[8px] flex-shrink-0">
                          {employeeAvatar && (
                            <AvatarImage
                              src={employeeAvatar}
                              alt={employeeName}
                              className="w-full h-full object-cover aspect-auto rounded-[8px]"
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
                        <div className="w-[123px]">
                          <p className="text-[12px] font-medium leading-[1.4] text-[#808081] mb-0">Location</p>
                          <p className="text-[12px] font-medium leading-[1.4] text-[#10141a]">{location}</p>
                        </div>

                        {/* Duration Badge */}
                        <div className="bg-[rgba(14,175,82,0.05)] border-[0.5px] border-[#0eaf52] rounded-[60px] px-[10px] py-[6px] min-w-[59px] flex items-center justify-center">
                          <span className="text-[12px] font-semibold text-[#0eaf52] whitespace-nowrap">
                            {duration}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {pendingApprovals.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="text-[16px] font-medium leading-[1.6] text-[#10141a]">
                  {approvalPage}
                  <span className="text-[14px] text-[#808081]">/{totalApprovalPages}</span>
                </span>
                <button
                  onClick={() => setApprovalPage(Math.max(1, approvalPage - 1))}
                  disabled={approvalPage === 1}
                  className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-[#10141a]" />
                </button>
                <button
                  onClick={() => setApprovalPage(Math.min(totalApprovalPages, approvalPage + 1))}
                  disabled={approvalPage === totalApprovalPages}
                  className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-[#10141a]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log Section */}
      <div className="mt-5 relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.3)] backdrop-blur bg-[rgba(255,255,255,0.3)]">
        <div className="p-5">
          {/* Header */}
          <div className="flex flex-col gap-1 mb-6">
            <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
              Activity Log
            </h2>
            <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
              Recent shift activities
            </p>
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
                      <Avatar className="w-[52.5px] h-[60px] rounded-[8px] flex-shrink-0">
                        {shift.client?.profileImage && (
                          <AvatarImage
                            src={shift.client.profileImage}
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
                          Client
                        </span>
                      </div>
                    </div>

                    {/* DSP/Employee Info */}
                    <div className="flex items-center gap-4 w-[256px]">
                      <Avatar className="w-[52.5px] h-[60px] rounded-[8px] flex-shrink-0">
                        {shift.employee?.profilePicture && (
                          <AvatarImage
                            src={shift.employee.profilePicture}
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

                    {/* Status & Times */}
                    <div className="flex items-center gap-16 flex-1 w-[256px]">
                      {/* Status Badge */}
                      <div 
                        className="rounded-full min-w-[54px] min-h-[28px] flex items-center justify-center gap-[4px] px-2.5"
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
                        <span className="text-[#10141a]">{formatTime(shift.clockedInAt || shift.startTime)}</span>
                      </div>

                      {/* Clocked Out */}
                      <div className="text-[14px] font-medium leading-[1.4] flex flex-col">
                        <span className="text-[#808081] whitespace-nowrap">Clocked Out </span>
                        <span className="text-[#10141a]">{formatTime(shift.clockedOutAt || shift.endTime)}</span>
                      </div>
                    </div>

                    {/* Details Button */}
                    <Button
                      variant="outline"
                      className="bg-[#b2b2b3] border-[#b2b2b3] text-white rounded-full px-6 py-2.5 h-[36px] w-[121px] text-[14px] font-semibold hover:bg-[#9a9a9b] hover:text-white"
                    >
                      Details
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {shifts.length > 0 && (
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

    {/* Add Schedule Modal */}
    <AddScheduleModal
      isOpen={showAddScheduleModal}
      onClose={() => setShowAddScheduleModal(false)}
      onShiftsUpdated={(updatedShifts) => setShifts(updatedShifts)}
    />
    </>
  );
}
