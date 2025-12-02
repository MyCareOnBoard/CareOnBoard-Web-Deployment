import React, { useState, useEffect, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, Search, Pencil, X, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { listShifts, Shift, deleteShift, createShift, ShiftStatus, ShiftType, SubmissionStatus } from "@/lib/api/shift-management";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import AddScheduleModal, { ScheduleFormData } from "../components/AddScheduleModal";
import { createEmployeeActivityLog } from "@/lib/api/employees";

export default function ShiftsListPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  
  const itemsPerPage = 7;

  // Fetch shifts from API
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        setLoading(true);
        const response = await listShifts({
          limit: 100,
          // For agency users the backend can infer agencyId, but we pass profile.data.id when available
          agencyId: profile?.data?.id,
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

    // Always attempt to fetch when profile is present; loading will be cleared in finally
    if (profile) {
      fetchShifts();
    } else {
      // If there is no profile yet, don't get stuck in loading
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.data?.id]);

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
    let result = shifts;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(shift => 
        shift.client?.firstName?.toLowerCase().includes(query) ||
        shift.client?.lastName?.toLowerCase().includes(query) ||
        shift.location?.toLowerCase().includes(query)
      );
    }
    
    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      result = result.filter(shift => shift.date === dateStr);
    }
    
    return result;
  }, [shifts, searchQuery, selectedDate]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / itemsPerPage));
  const paginatedShifts = filteredShifts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEdit = (shiftId: string) => {
    toast({
      title: "Edit",
      description: `Editing shift ${shiftId}`,
    });
    // TODO: Implement edit functionality
  };

  const handleCancel = async (shiftId: string) => {
    try {
      await deleteShift(shiftId);
      setShifts(prev => prev.filter(s => s.id !== shiftId));
      toast({
        title: "Cancelled",
        description: "Shift has been cancelled successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel shift. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSchedule = async (data: ScheduleFormData): Promise<boolean> => {
    if (!profile?.data?.id) {
      toast({
        title: "Error",
        description: "Agency not found.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const shiftData = {
        employeeId: data.assignedDspId,
        agencyId: profile.data?.id,
        date: data.date ? format(data.date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        location: data.clientAddress,
        startTime: data.clockInTime,
        endTime: data.clockOutTime,
        status: ShiftStatus.PENDING,
        type: ShiftType.MANUAL,
        submissionStatus: SubmissionStatus.SUBMITTED,
        clientId: data.clientId,
        notesType: data.notesType || undefined,
        service: data.service,
        serviceCode: data.serviceCode,
        schedulingType: data.schedulingType,
        ispOutcome: data.ispOutcome || undefined,
        assignedDsp: data.assignedDsp,
      };

      const createdShift = await createShift(shiftData);
      const shiftId = createdShift.shift?.id;

      // Create activity log if notesType is provided
      if (data.notesType && shiftId && data.assignedDspId) {
        try {
          const shiftDate = data.date ? new Date(data.date) : new Date();
          const clientName = data.client || "Unknown Client";
          
          await createEmployeeActivityLog({
            activityType: data.notesType,
            shiftId: shiftId,
            employeeId: data.assignedDspId,
            description: "",
            metadata: {
              individual: clientName,
              serviceYear: shiftDate.getFullYear(),
              serviceCode: data.serviceCode || "",
              ISPOutcome: data.ispOutcome || "",
              strategies: [],
            },
          });
        } catch (activityLogError) {
          console.error("Failed to create activity log:", activityLogError);
          // Don't fail the entire operation if activity log creation fails
        }
      }

      toast({
        title: "Schedule Created",
        description: "New schedule has been created successfully.",
      });

      // Refresh shifts list
      const response = await listShifts({ 
        limit: 100,
        agencyId: profile?.data?.id,
        client: true,
        employee: true,
      });
      setShifts(response.shifts || []);
      return true;
    } catch (error) {
      console.error("Failed to create schedule:", error);
      toast({
        title: "Error",
        description: "Failed to create schedule. Please try again.",
        variant: "destructive",
      });
      return false;
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

  // Calculate shift duration
  const calculateDuration = (startTime?: string, endTime?: string): string => {
    if (!startTime || !endTime) return "2 hours";
    try {
      const start = new Date(`2000-01-01 ${startTime}`);
      const end = new Date(`2000-01-01 ${endTime}`);
      const diffMs = end.getTime() - start.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
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
        <Button
          onClick={() => setShowAddScheduleModal(true)}
          className="flex items-center gap-3 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-4 py-3 h-auto font-semibold text-[14px]"
        >
          <Plus className="w-5 h-5" />
          Add Schedule
        </Button>
      </div>

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
                Number of expiring or missing documents/training.
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              {/* Date Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-3 bg-white border border-[rgba(255,255,255,0.3)] rounded-[12px] px-4 py-2 h-[36px] cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <span className="text-[14px] font-normal text-[#10141a]">
                    {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select date"}
                  </span>
                  <Calendar className="w-5 h-5 text-[#10141a]" />
                </button>

                {/* Date Picker Dropdown */}
                {showDatePicker && (
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-[12px] shadow-lg border border-[#e5e5e6] p-4 z-50 w-[280px]">
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
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#00b4b8]" />
              </div>
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
                const employeeName = apiShift.employee?.fullName || "Unknown DSP";
                const employeeAvatar = apiShift.employee?.profilePicture;
                const location = apiShift.location || "Unknown Location";
                const duration = calculateDuration(apiShift.startTime, apiShift.endTime);

                return (
                  <div
                    key={apiShift.id}
                    className="flex items-center gap-4 backdrop-blur-[20px] rounded-[20px]"
                  >
                    {/* Client Info */}
                    <div className="flex items-center gap-4">
                      <div className="w-[52.5px] h-[60px] rounded-[8px] bg-[#e0e0e0] overflow-hidden flex-shrink-0">
                        {clientAvatar ? (
                          <img 
                            src={clientAvatar} 
                            alt={clientName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                        )}
                      </div>
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
                    <div className="flex items-center gap-4">
                      <div className="w-[52.5px] h-[60px] rounded-[8px] bg-[#e0e0e0] overflow-hidden flex-shrink-0">
                        {employeeAvatar ? (
                          <img 
                            src={employeeAvatar} 
                            alt={employeeName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                        )}
                      </div>
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
                    <div className="flex-1 flex items-center gap-[55px]">
                      <div className="text-[12px] font-medium leading-[1.4] w-[123px]">
                        <p className="text-[#808081]">Location</p>
                        <p className="text-[#10141a]">{location}</p>
                      </div>

                      {/* Duration Badge */}
                      <div className="bg-[rgba(14,175,82,0.05)] border border-[#0eaf52] rounded-full px-2.5 py-2.5">
                        <span className="text-[12px] font-semibold text-[#0eaf52]">
                          {duration}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          size="sm"
                          onClick={() => handleEdit(apiShift.id)}
                          className="bg-[#b2b2b3] hover:bg-[#9a9a9b] text-white rounded-full px-4 py-3 h-auto text-[12px] font-semibold flex items-center gap-1"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleCancel(apiShift.id)}
                          className="bg-[#d53411] hover:bg-[#c02e0f] text-white rounded-full px-4 py-3 h-auto text-[12px] font-semibold flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </Button>
                      </div>
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
    <AddScheduleModal
      isOpen={showAddScheduleModal}
      onClose={() => setShowAddScheduleModal(false)}
      onSchedule={handleSchedule}
    />
    </>
  );
}

