import React, { useState, useRef, useEffect } from "react";
import { X, Calendar, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import TimePicker from "@/components/TimePicker";
import { searchClients, Client } from "@/lib/api/clients";
import { searchEmployees, Employee } from "@/lib/api/employees";
import { useToast } from "@/hooks/use-toast";
import { mileageApi, CreateMileageRideRequest, MileageRide, UpdateAgencyRideRequest } from "@/lib/api/mileage";

interface AddMileageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMileageCreated?: () => void;
  onMileageUpdated?: () => void;
  mode?: "create" | "edit";
  initialRide?: MileageRide | null;
}

interface MileageFormData {
  client: string;
  clientId?: string;
  assignDsp: string;
  assignDspId?: string;
  notes: string;
  selectDate: Date | null;
  selectTime: string;
  schedulingType: "one-time" | "recurring";
}

const initialFormData: MileageFormData = {
  client: "",
  clientId: "",
  assignDsp: "",
  assignDspId: "",
  notes: "",
  selectDate: null,
  selectTime: "",
  schedulingType: "one-time",
};

export default function AddMileageModal({
  isOpen,
  onClose,
  onMileageCreated,
  onMileageUpdated,
  mode = "create",
  initialRide = null,
}: AddMileageModalProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState<MileageFormData>(initialFormData);

  // --- Client & DSP search/autocomplete states ---
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [dspSearchResults, setDspSearchResults] = useState<Employee[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showDspDropdown, setShowDspDropdown] = useState(false);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [isSearchingDsps, setIsSearchingDsps] = useState(false);

  const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dspSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Client search handler ---
  const handleClientSearch = (query: string) => {
    if (clientSearchTimeoutRef.current) clearTimeout(clientSearchTimeoutRef.current);
    if (query.trim().length < 2) {
      setClientSearchResults([]);
      setShowClientDropdown(false);
      return;
    }
    clientSearchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingClients(true);
      try {
        const results = await searchClients(query);
        setClientSearchResults(results);
        setShowClientDropdown(results.length > 0);
      } finally {
        setIsSearchingClients(false);
      }
    }, 300);
  };

  const handleClientSelect = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      client: client.firstName && client.lastName ? `${client.firstName} ${client.lastName}` : client.id,
      clientId: client.id,
    }));
    setShowClientDropdown(false);
    setClientSearchResults([]);
  };

  // --- DSP search handler ---
  const handleDspSearch = (query: string) => {
    if (dspSearchTimeoutRef.current) clearTimeout(dspSearchTimeoutRef.current);
    if (query.trim().length < 2) {
      setDspSearchResults([]);
      setShowDspDropdown(false);
      return;
    }
    dspSearchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingDsps(true);
      try {
        const results = await searchEmployees(query);
        setDspSearchResults(results);
        setShowDspDropdown(results.length > 0);
      } finally {
        setIsSearchingDsps(false);
      }
    }, 300);
  };

  const handleDspSelect = (employee: Employee) => {
    setFormData(prev => ({
      ...prev,
      assignDsp: employee.fullName,
      assignDspId: employee.uid,
    }));
    setShowDspDropdown(false);
    setDspSearchResults([]);
  };


  const handleDateSelect = (date: Date) => {
    setFormData((prev) => ({ ...prev, selectDate: date }));
    setShowDatePicker(false);
  };

  // Convert 12-hour format to 24-hour format
  const convertTo24Hour = (time12h: string): string => {
    if (!time12h) return "";
    const match = time12h.match(/(\d{1,2})[.:](\d{2}):?(AM|PM)/i);
    if (!match) return "";
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  };

  // Convert 24-hour format to 12-hour format
  const convertTo12Hour = (time24h: string): string => {
    if (!time24h) return "";
    const [hoursStr, minutes] = time24h.split(":");
    let hours = parseInt(hoursStr);
    const period = hours >= 12 ? "PM" : "AM";
    if (hours === 0) {
      hours = 12;
    } else if (hours > 12) {
      hours -= 12;
    }
    return `${hours.toString().padStart(2, "0")}:${minutes}:${period}`;
  };

  const handleSchedulingTypeChange = (type: "one-time" | "recurring") => {
    setFormData((prev) => ({ ...prev, schedulingType: type }));
  };

  const parseScheduledTime = (value: unknown): Date | null => {
    if (!value) return null;
    if (typeof value === "string") return new Date(value);
    if (typeof value === "object" && value !== null) {
      const o = value as { seconds?: number; _seconds?: number };
      const s = o.seconds ?? o._seconds;
      if (typeof s === "number") return new Date(s * 1000);
    }
    return null;
  };

  useEffect(() => {
    if (!isOpen || mode !== "edit" || !initialRide) return;

    const scheduledDate = parseScheduledTime(initialRide.scheduledStartTime);
    const time24 = scheduledDate ? format(scheduledDate, "HH:mm") : "";
    const time12 = time24 ? convertTo12Hour(time24) : "";

    setFormData({
      client: initialRide.clientName || "",
      clientId: initialRide.clientId ?? "",
      assignDsp: initialRide.caregiverName || "",
      assignDspId: initialRide.caregiverId,
      notes: initialRide.notes || "",
      selectDate: scheduledDate,
      selectTime: time12,
      schedulingType: "one-time",
    });
  }, [isOpen, mode, initialRide]);

  useEffect(() => {
    if (isOpen && mode === "create") {
      setFormData(initialFormData);
    }
  }, [isOpen, mode]);


  const handleSaveAndCancel = () => {
    setFormData(initialFormData);
    onClose();
  };

  const handleSchedule = async () => {
    const missingFields: string[] = [];
    if (!formData.client || !formData.clientId) missingFields.push("Client");
    if (!formData.assignDsp || !formData.assignDspId) missingFields.push("Assign DSP");
    if (!formData.selectDate) missingFields.push("Select Date");
    if (!formData.selectTime) missingFields.push("Select Time");
    if (!formData.schedulingType) missingFields.push("Scheduling Type");

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in the following required fields: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const clientId = formData.clientId;
    const caregiverId = formData.assignDspId;
    if (!clientId || !caregiverId) {
      toast({
        title: "Missing Required Fields",
        description: "Client and caregiver are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const time24 = convertTo24Hour(formData.selectTime);
      const scheduledStartTime = formData.selectDate && time24
        ? (() => {
            const scheduled = new Date(formData.selectDate);
            const [hours, minutes] = time24.split(":").map(Number);
            scheduled.setHours(hours, minutes, 0, 0);
            return scheduled.toISOString();
          })()
        : "";

      const basePayload = {
        clientId,
        caregiverId,
        notes: formData.notes || "",
      };

      if (mode === "edit" && initialRide?.id) {
        const updatePayload: UpdateAgencyRideRequest = {
          caregiverId: basePayload.caregiverId,
          scheduledStartTime,
          notes: basePayload.notes,
        };
        await mileageApi.updateAgency(initialRide.id, updatePayload);
        toast({
          title: "Success",
          description: "Mileage updated successfully.",
          variant: "success",
        });
        if (onMileageUpdated) onMileageUpdated();
      } else {
        const payload: CreateMileageRideRequest =
          formData.schedulingType === "recurring"
            ? {
                ...basePayload,
                frequency: "weekly",
                daysOfWeek: formData.selectDate ? [formData.selectDate.getDay()] : [],
                time: time24,
                startDate: formData.selectDate ? formData.selectDate.toISOString() : "",
              }
            : {
                ...basePayload,
                scheduledStartTime: scheduledStartTime,
              };

        await mileageApi.create(payload);

        toast({
          title: "Success",
          description: "Mileage scheduled successfully.",
          variant: "success",
        });
        if (onMileageCreated) {
          onMileageCreated();
        }
      }

      setFormData(initialFormData);
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule mileage.",
        variant: "destructive",
      });
      console.error("Failed to schedule mileage:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Calendar days calculation
  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end pr-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative bg-white rounded-[30px] border border-[rgba(255,255,255,0.3)] w-full max-w-[500px] max-h-[90vh] shadow-xl flex flex-col">
        {/* Title Bar - Fixed */}
        <div className="flex items-center justify-between p-5 pb-0 shrink-0">
          <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
            {mode === "edit" ? "Edit Mileage" : "Add new Mileage"}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-[#eff2f3] border border-[rgba(255,255,255,0.3)] rounded-full p-2 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 text-[#10141a]" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-col gap-4">
            {/* Client */}
            <div className="relative flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Client</label>
              <div className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center">
                <input
                  type="text"
                  placeholder="Search client name..."
                  value={formData.client}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, client: e.target.value }));
                    handleClientSearch(e.target.value);
                  }}
                  onFocus={() => {
                    if (clientSearchResults.length > 0) setShowClientDropdown(true);
                  }}
                  className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent"
                  autoComplete="off"
                />
                {isSearchingClients && (
                  <Loader2 className="w-4 h-4 animate-spin text-[#808081]" />
                )}
              </div>
              {showClientDropdown && clientSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-xl shadow-lg z-20 max-h-[200px] overflow-y-auto">
                  {clientSearchResults.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-[12px] last:rounded-b-[12px] cursor-pointer border-b border-[#f0f0f0] last:border-b-0"
                    >
                      <p className="text-[14px] font-normal text-black">
                        {client.firstName && client.lastName
                          ? `${client.firstName} ${client.lastName}`
                          : client.id}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assign DSP */}
            <div className="relative flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Assign DSP</label>
              <div className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center">
                <input
                  type="text"
                  placeholder="Search DSP name..."
                  value={formData.assignDsp}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, assignDsp: e.target.value }));
                    handleDspSearch(e.target.value);
                  }}
                  onFocus={() => {
                    if (dspSearchResults.length > 0) setShowDspDropdown(true);
                  }}
                  className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent"
                  autoComplete="off"
                />
                {isSearchingDsps && (
                  <Loader2 className="w-4 h-4 animate-spin text-[#808081]" />
                )}
              </div>
              {showDspDropdown && dspSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-xl shadow-lg z-20 max-h-[200px] overflow-y-auto">
                  {dspSearchResults.map((employee) => (
                    <button
                      key={employee.id}
                      onClick={() => handleDspSelect(employee)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-[12px] last:rounded-b-[12px] cursor-pointer border-b border-[#f0f0f0] last:border-b-0"
                    >
                      <p className="text-[14px] font-normal text-black">{employee.fullName}</p>
                      <p className="text-[12px] font-normal text-[#808081]">{employee.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Notes (optional)</label>
              <div className="bg-white border border-[#cccccd] rounded-xl px-4 py-2.5">
                <textarea
                  placeholder="Add any notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent resize-none"
                />
              </div>
            </div>

            {/* Scheduling Type */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Scheduling Type</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, schedulingType: "one-time" }))}
                  disabled={mode === "edit"}
                  className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    formData.schedulingType === "one-time"
                      ? "bg-[#00b4b8] text-white"
                      : "border border-[#808081] text-[#10141a]"
                  }`}
                >
                  One time
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, schedulingType: "recurring" }))}
                  disabled={mode === "edit"}
                  className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    formData.schedulingType === "recurring"
                      ? "bg-[#00b4b8] text-white"
                      : "border border-[#808081] text-[#10141a]"
                  }`}
                >
                  Recurring
                </button>
              </div>
            </div>

            {/* Select Date */}
            <div className="relative flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Select Date</label>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`bg-white border rounded-xl h-11 px-4 flex items-center gap-3 cursor-pointer ${
                  showDatePicker ? "border-[#2b82ff]" : "border-[#b2b2b3]"
                }`}
              >
                <span className={`flex-1 text-left text-[14px] font-normal ${formData.selectDate ? "text-[#10141a]" : "text-[#b2b2b3]"}`}>
                  {formData.selectDate ? format(formData.selectDate, "d MMMM") : "Select date"}
                </span>
                <Calendar className="w-5 h-5 text-[#10141a]" />
              </button>

              {/* Date Picker Dropdown */}
              {showDatePicker && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-xl border border-[#cccccd] z-10 overflow-hidden w-[320px]">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-center gap-2.5 px-5 py-2">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="flex items-center justify-center w-5 h-5 rounded cursor-pointer hover:bg-gray-100"
                    >
                      <ChevronLeft className="w-5 h-5 text-[#808081]" />
                    </button>
                    <span className="flex-1 text-[16px] font-semibold leading-[1.6] text-[#10141a] text-center">
                      {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="flex items-center justify-center w-5 h-5 rounded cursor-pointer hover:bg-gray-100"
                    >
                      <ChevronRight className="w-5 h-5 text-[#10141a]" />
                    </button>
                  </div>
                  {/* Divider */}
                  <div className="h-px bg-[#e5e5e6] w-full" />
                  {/* Week Days */}
                  <div className="flex items-center justify-center w-full pt-2">
                    {weekDays.map((day) => (
                      <div key={day} className="flex-1 px-2 py-0.5 text-center text-[12px] font-medium text-[#10141a]">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar Grid */}
                  <div className="flex flex-col w-full pb-2">
                    {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIndex) => (
                      <div key={weekIndex} className="flex items-center justify-center w-full py-1">
                        {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                          const isCurrentMonth = isSameMonth(day, currentMonth);
                          const isSelected = formData.selectDate && isSameDay(day, formData.selectDate);

                          return (
                            <button
                              key={dayIndex}
                              onClick={() => handleDateSelect(day)}
                              className={`
                                flex-1 flex items-center justify-center p-2 text-center transition-colors cursor-pointer
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
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Select Time */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Select Time</label>
              <TimePicker
                value={convertTo24Hour(formData.selectTime)}
                onChange={(time24h) => {
                  const time12h = convertTo12Hour(time24h);
                  setFormData((prev) => ({ ...prev, selectTime: time12h }));
                }}
              >
                <div className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center gap-3 cursor-pointer">
                  <span className={`flex-1 text-[14px] font-normal ${formData.selectTime ? "text-black" : "text-[#b2b2b3]"}`}>
                    {formData.selectTime || "Enter Time"}
                  </span>
                  <Clock className="w-5 h-5 text-[#10141a]" />
                </div>
              </TimePicker>
            </div>
          </div>
        </div>

        {/* Footer Buttons - Fixed */}
        <div className="flex gap-3 p-5 pt-0 shrink-0">
          <Button
            onClick={handleSaveAndCancel}
            disabled={isSubmitting}
            className="flex-1 h-11 bg-transparent hover:bg-[#f3f4f6] text-[#6b7280] hover:text-[#374151] border border-[#e5e7eb] rounded-xl text-[14px] font-medium transition-colors shadow-none"
          >
            Save
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isSubmitting}
            className="flex-1 h-11 bg-[#00b4b8] hover:bg-[#009ba1] text-white rounded-xl text-[14px] font-medium transition-colors shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? mode === "edit"
                ? "Updating..."
                : "Scheduling..."
              : mode === "edit"
                ? "Update"
                : "Schedule"}
          </Button>
        </div>
      </div>
    </div>
  );
}
