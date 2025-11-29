import React, { useState, useMemo, useEffect } from "react";
import { X, ChevronDown, Calendar, Upload, ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (data: ScheduleFormData) => Promise<boolean>; // Returns true if successful
  onSave?: (data: ScheduleFormData) => void;
  editData?: ScheduleFormData | null; // For edit mode
  mode?: "create" | "edit";
}

interface FormErrors {
  client?: string;
  assignedDsp?: string;
  schedulingType?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  clockInTime?: string;
  clockOutTime?: string;
}

export interface ScheduleFormData {
  client: string;
  clientAddress: string;
  assignedDsp: string;
  billingRate: string;
  service: string;
  serviceCode: string;
  schedulingType: "one-time" | "recurring" | "";
  date: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  clockInTime: string;
  clockOutTime: string;
  ispOutcome: string;
  planOfCare: File | null;
}

const clockInTimeOptions = [
  "08:00:AM", "08:30:AM", "09:00:AM", "09:30:AM", "10.00:AM",
  "10.30:AM", "11.30:AM", "12.00:PM", "12.00:PM"
];

const clockOutTimeOptions = [
  "08:00:AM", "08:30:AM", "09:00:AM", "09:30:AM", "10.00:AM",
  "10.30:AM", "11.30:AM", "12.00:PM", "12.00:PM"
];

const serviceOptions = [
  "General Practitioners",
  "Community Based",
  "Day Habilitation",
  "Respite Care",
];

// Sample client data - in real app, this would come from API
const clientOptions = [
  { id: "1", name: "Dr. Brooklyn Simmons", address: "221/B Baker Street" },
  { id: "2", name: "Dr. Sarah Johnson", address: "45 Oak Avenue" },
  { id: "3", name: "Dr. Michael Chen", address: "789 Pine Road" },
  { id: "4", name: "Dr. Emily Davis", address: "123 Maple Lane" },
  { id: "5", name: "Dr. James Wilson", address: "567 Cedar Drive" },
];

// Sample DSP data - in real app, this would come from API
const dspOptions = [
  { id: "1", name: "Nola Hawkins", billingRate: "$45/hour" },
  { id: "2", name: "John Smith", billingRate: "$40/hour" },
  { id: "3", name: "Maria Garcia", billingRate: "$50/hour" },
  { id: "4", name: "David Brown", billingRate: "$42/hour" },
  { id: "5", name: "Lisa Anderson", billingRate: "$48/hour" },
];

const initialFormData: ScheduleFormData = {
  client: "",
  clientAddress: "",
  assignedDsp: "",
  billingRate: "",
  service: "General Practitioners",
  serviceCode: "183535",
  schedulingType: "",
  date: null,
  startDate: null,
  endDate: null,
  clockInTime: "",
  clockOutTime: "",
  ispOutcome: "",
  planOfCare: null,
};

export default function AddScheduleModal({ isOpen, onClose, onSchedule, onSave, editData, mode = "create" }: AddScheduleModalProps) {
  const [formData, setFormData] = useState<ScheduleFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [customClockIn, setCustomClockIn] = useState("");
  const [customClockOut, setCustomClockOut] = useState("");
  const [showCustomClockIn, setShowCustomClockIn] = useState(false);
  const [showCustomClockOut, setShowCustomClockOut] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showDspDropdown, setShowDspDropdown] = useState(false);

  // Reset form when modal opens/closes or when editData changes
  useEffect(() => {
    if (isOpen) {
      if (editData && mode === "edit") {
        setFormData(editData);
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, editData, mode]);

  // Filter clients based on input
  const filteredClients = useMemo(() => {
    if (!formData.client) return [];
    const query = formData.client.toLowerCase();
    return clientOptions.filter(client => 
      client.name.toLowerCase().includes(query)
    );
  }, [formData.client]);

  // Filter DSPs based on input
  const filteredDsps = useMemo(() => {
    if (!formData.assignedDsp) return [];
    const query = formData.assignedDsp.toLowerCase();
    return dspOptions.filter(dsp => 
      dsp.name.toLowerCase().includes(query)
    );
  }, [formData.assignedDsp]);

  const handleClientSelect = (client: typeof clientOptions[0]) => {
    setFormData(prev => ({
      ...prev,
      client: client.name,
      clientAddress: client.address,
    }));
    setShowClientDropdown(false);
  };

  const handleDspSelect = (dsp: typeof dspOptions[0]) => {
    setFormData(prev => ({
      ...prev,
      assignedDsp: dsp.name,
      billingRate: dsp.billingRate,
    }));
    setShowDspDropdown(false);
  };

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const handleDateSelect = (date: Date) => {
    setFormData(prev => ({ ...prev, date }));
    setShowDatePicker(false);
    clearError("date");
  };

  const handleStartDateSelect = (date: Date) => {
    setFormData(prev => ({ ...prev, startDate: date }));
    setShowStartDatePicker(false);
    clearError("startDate");
  };

  const handleEndDateSelect = (date: Date) => {
    setFormData(prev => ({ ...prev, endDate: date }));
    setShowEndDatePicker(false);
    clearError("endDate");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, planOfCare: file }));
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Client validation
    if (!formData.client.trim()) {
      newErrors.client = "Client is required";
    }

    // Assigned DSP validation
    if (!formData.assignedDsp.trim()) {
      newErrors.assignedDsp = "Assigned DSP is required";
    }

    // Scheduling type validation
    if (!formData.schedulingType) {
      newErrors.schedulingType = "Please select a scheduling type";
    }

    // Date validation based on scheduling type
    if (formData.schedulingType === "one-time") {
      if (!formData.date) {
        newErrors.date = "Please select a date";
      }
    } else if (formData.schedulingType === "recurring") {
      if (!formData.startDate) {
        newErrors.startDate = "Please select a starting date";
      }
      if (!formData.endDate) {
        newErrors.endDate = "Please select an end date";
      }
      if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    // Clock in time validation
    if (!formData.clockInTime) {
      newErrors.clockInTime = "Please select a clock in time";
    }

    // Clock out time validation
    if (!formData.clockOutTime) {
      newErrors.clockOutTime = "Please select a clock out time";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Clear specific error when field is updated
  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Check if form is valid (for disabling submit button)
  const isFormValid = useMemo(() => {
    // Client validation
    if (!formData.client.trim()) return false;

    // Assigned DSP validation
    if (!formData.assignedDsp.trim()) return false;

    // Scheduling type validation
    if (!formData.schedulingType) return false;

    // Date validation based on scheduling type
    if (formData.schedulingType === "one-time") {
      if (!formData.date) return false;
    } else if (formData.schedulingType === "recurring") {
      if (!formData.startDate) return false;
      if (!formData.endDate) return false;
      if (formData.startDate > formData.endDate) return false;
    }

    // Clock in time validation
    if (!formData.clockInTime) return false;

    // Clock out time validation
    if (!formData.clockOutTime) return false;

    return true;
  }, [formData]);

  const handleSubmit = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSchedule(formData);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to schedule:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end pr-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-[30px] border border-[rgba(255,255,255,0.3)] w-full max-w-[500px] max-h-[90vh] shadow-xl flex flex-col"
      >
        {/* Title Bar - Fixed */}
        <div className="flex items-center justify-between p-5 pb-0 flex-shrink-0">
          <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
            {mode === "edit" ? "Edit Schedule" : "Add new Schedule"}
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
          {/* Client Field */}
          <div className="flex flex-col gap-1 relative">
            <label className="text-[12px] font-normal text-[#10141a]">Client</label>
            <div className={`bg-white border rounded-[12px] h-[44px] px-4 flex items-center ${errors.client ? "border-[#D53411]" : "border-[#cccccd]"}`}>
              <input
                type="text"
                value={formData.client}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, client: e.target.value, clientAddress: "" }));
                  setShowClientDropdown(true);
                  clearError("client");
                }}
                onFocus={() => formData.client && setShowClientDropdown(true)}
                placeholder="Enter client name or ID"
                className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent"
              />
            </div>
            {errors.client && (
              <span className="text-[12px] font-normal text-[#D53411]">{errors.client}</span>
            )}
            {/* Client Dropdown */}
            {showClientDropdown && filteredClients.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-[12px] shadow-lg z-20 max-h-[200px] overflow-y-auto">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      handleClientSelect(client);
                      clearError("client");
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-[12px] last:rounded-b-[12px] cursor-pointer border-b border-[#f0f0f0] last:border-b-0"
                  >
                    <p className="text-[14px] font-normal text-black">{client.name}</p>
                    <p className="text-[12px] font-normal text-[#808081]">{client.address}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assigned DSP Field */}
          <div className="flex flex-col gap-1 relative">
            <label className="text-[12px] font-normal text-[#10141a]">Assigned DSP</label>
            <div className={`bg-white border rounded-[12px] h-[44px] px-4 flex items-center ${errors.assignedDsp ? "border-[#D53411]" : "border-[#cccccd]"}`}>
              <input
                type="text"
                value={formData.assignedDsp}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, assignedDsp: e.target.value, billingRate: "" }));
                  setShowDspDropdown(true);
                  clearError("assignedDsp");
                }}
                onFocus={() => formData.assignedDsp && setShowDspDropdown(true)}
                placeholder="Enter DSP name or ID"
                className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent"
              />
            </div>
            {errors.assignedDsp && (
              <span className="text-[12px] font-normal text-[#D53411]">{errors.assignedDsp}</span>
            )}
            {/* DSP Dropdown */}
            {showDspDropdown && filteredDsps.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-[12px] shadow-lg z-20 max-h-[200px] overflow-y-auto">
                {filteredDsps.map((dsp) => (
                  <button
                    key={dsp.id}
                    onClick={() => {
                      handleDspSelect(dsp);
                      clearError("assignedDsp");
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-[12px] last:rounded-b-[12px] cursor-pointer border-b border-[#f0f0f0] last:border-b-0"
                  >
                    <p className="text-[14px] font-normal text-black">{dsp.name}</p>
                    <p className="text-[12px] font-normal text-[#808081]">Billing Rate: {dsp.billingRate}</p>
                  </button>
                ))}
              </div>
            )}
            {/* Billing Rate Display */}
            {formData.billingRate && !errors.assignedDsp && (
              <span className="text-[12px] font-normal text-[#808081]">
                Billing Rate : {formData.billingRate}
              </span>
            )}
          </div>

          {/* Service & Service Code Row */}
          <div className="flex gap-4">
            {/* Service Dropdown */}
            <div className="flex-1 flex flex-col gap-1 relative">
              <label className="text-[12px] font-normal text-[#10141a]">Service</label>
              <button
                onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                className="bg-white border border-[#cccccd] rounded-[12px] h-[44px] px-4 flex items-center gap-3 cursor-pointer"
              >
                <span className="flex-1 text-left text-[14px] font-normal text-[#10141a]">
                  {formData.service}
                </span>
                <ChevronDown className="w-5 h-5 text-[#10141a]" />
              </button>
              
              {showServiceDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-[12px] shadow-lg z-10">
                  {serviceOptions.map((service) => (
                    <button
                      key={service}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, service }));
                        setShowServiceDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left text-[14px] font-normal text-[#10141a] hover:bg-gray-50 first:rounded-t-[12px] last:rounded-b-[12px] cursor-pointer"
                    >
                      {service}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Service Code */}
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Service Code</label>
              <div className="bg-white border border-[#cccccd] rounded-[12px] h-[44px] px-4 flex items-center">
                <input
                  type="text"
                  value={formData.serviceCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceCode: e.target.value }))}
                  className="flex-1 text-[14px] font-normal text-black outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Scheduling Type */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Scheduling Type</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, schedulingType: "one-time" }));
                  clearError("schedulingType");
                }}
                className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${
                  formData.schedulingType === "one-time"
                    ? "bg-[#00b4b8] text-white"
                    : errors.schedulingType
                      ? "border border-[#D53411] text-[#10141a]"
                      : "border border-[#808081] text-[#10141a]"
                }`}
              >
                One time
              </button>
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, schedulingType: "recurring" }));
                  clearError("schedulingType");
                }}
                className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${
                  formData.schedulingType === "recurring"
                    ? "bg-[#00b4b8] text-white"
                    : errors.schedulingType
                      ? "border border-[#D53411] text-[#10141a]"
                      : "border border-[#808081] text-[#10141a]"
                }`}
              >
                Recurring
              </button>
            </div>
            {errors.schedulingType && (
              <span className="text-[12px] font-normal text-[#D53411]">{errors.schedulingType}</span>
            )}
          </div>

          {/* Date Fields - Conditional based on scheduling type */}
          {formData.schedulingType === "recurring" ? (
            <>
              {/* Select Starting Date */}
              <div className="flex flex-col gap-1 relative">
                <label className="text-[12px] font-normal text-[#10141a]">Select Starting Date</label>
                <button
                  onClick={() => {
                    setShowStartDatePicker(!showStartDatePicker);
                    setShowEndDatePicker(false);
                  }}
                  className={`bg-white border rounded-[12px] h-[44px] px-4 flex items-center gap-3 cursor-pointer ${
                    errors.startDate ? "border-[#D53411]" : showStartDatePicker ? "border-[#2b82ff]" : "border-[#b2b2b3]"
                  }`}
                >
                  <span className={`flex-1 text-left text-[14px] font-normal ${formData.startDate ? "text-[#10141a]" : "text-[#b2b2b3]"}`}>
                    {formData.startDate ? format(formData.startDate, "d MMMM") : "Select date"}
                  </span>
                  <Calendar className="w-5 h-5 text-[#10141a]" />
                </button>
                {errors.startDate && (
                  <span className="text-[12px] font-normal text-[#D53411]">{errors.startDate}</span>
                )}

                {/* Start Date Picker Dropdown */}
                {showStartDatePicker && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-[12px] border border-[#cccccd] z-10 overflow-hidden w-[320px]">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-center gap-2.5 px-5 py-2">
                      <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5 text-[#808081]" />
                      </button>
                      <span className="flex-1 text-[16px] font-semibold leading-[1.6] text-[#10141a] text-center">
                        {format(currentMonth, "MMMM yyyy")}
                      </span>
                      <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5 text-[#10141a]" />
                      </button>
                    </div>
                    {/* Divider */}
                    <div className="h-px bg-[#e5e5e6] w-full" />
                    {/* Week Days */}
                    <div className="flex items-center justify-center pt-2 w-full">
                      {weekDays.map((day) => (
                        <div key={day} className="flex-1 px-2 py-0.5 text-center text-[12px] font-medium text-[#10141a]">
                          {day}
                        </div>
                      ))}
                    </div>
                    {/* Calendar Grid */}
                    <div className="flex flex-col w-full pb-2">
                      {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIndex) => (
                        <div key={weekIndex} className="flex items-center justify-center py-1 w-full">
                          {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const isSelected = formData.startDate && isSameDay(day, formData.startDate);

                            return (
                              <button
                                key={dayIndex}
                                onClick={() => handleStartDateSelect(day)}
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

              {/* Select End Date */}
              <div className="flex flex-col gap-1 relative">
                <label className="text-[12px] font-normal text-[#10141a]">Select End Date</label>
                <button
                  onClick={() => {
                    setShowEndDatePicker(!showEndDatePicker);
                    setShowStartDatePicker(false);
                  }}
                  className={`bg-white border rounded-[12px] h-[44px] px-4 flex items-center gap-3 cursor-pointer ${
                    errors.endDate ? "border-[#D53411]" : showEndDatePicker ? "border-[#2b82ff]" : "border-[#b2b2b3]"
                  }`}
                >
                  <span className={`flex-1 text-left text-[14px] font-normal ${formData.endDate ? "text-[#10141a]" : "text-[#b2b2b3]"}`}>
                    {formData.endDate ? format(formData.endDate, "d MMMM") : "Select date"}
                  </span>
                  <Calendar className="w-5 h-5 text-[#10141a]" />
                </button>
                {errors.endDate && (
                  <span className="text-[12px] font-normal text-[#D53411]">{errors.endDate}</span>
                )}

                {/* End Date Picker Dropdown */}
                {showEndDatePicker && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-[12px] border border-[#cccccd] z-10 overflow-hidden w-[320px]">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-center gap-2.5 px-5 py-2">
                      <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5 text-[#808081]" />
                      </button>
                      <span className="flex-1 text-[16px] font-semibold leading-[1.6] text-[#10141a] text-center">
                        {format(currentMonth, "MMMM yyyy")}
                      </span>
                      <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5 text-[#10141a]" />
                      </button>
                    </div>
                    {/* Divider */}
                    <div className="h-px bg-[#e5e5e6] w-full" />
                    {/* Week Days */}
                    <div className="flex items-center justify-center pt-2 w-full">
                      {weekDays.map((day) => (
                        <div key={day} className="flex-1 px-2 py-0.5 text-center text-[12px] font-medium text-[#10141a]">
                          {day}
                        </div>
                      ))}
                    </div>
                    {/* Calendar Grid */}
                    <div className="flex flex-col w-full pb-2">
                      {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIndex) => (
                        <div key={weekIndex} className="flex items-center justify-center py-1 w-full">
                          {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const isSelected = formData.endDate && isSameDay(day, formData.endDate);

                            return (
                              <button
                                key={dayIndex}
                                onClick={() => handleEndDateSelect(day)}
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
            </>
          ) : (
            /* Select Date - for one-time scheduling */
            <div className="flex flex-col gap-1 relative">
              <label className="text-[12px] font-normal text-[#10141a]">Select Date</label>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`bg-white border rounded-[12px] h-[44px] px-4 flex items-center gap-3 cursor-pointer ${
                  errors.date ? "border-[#D53411]" : showDatePicker ? "border-[#2b82ff]" : "border-[#b2b2b3]"
                }`}
              >
                <span className={`flex-1 text-left text-[14px] font-normal ${formData.date ? "text-[#10141a]" : "text-[#b2b2b3]"}`}>
                  {formData.date ? format(formData.date, "d MMMM") : "Select date"}
                </span>
                <Calendar className="w-5 h-5 text-[#10141a]" />
              </button>
              {errors.date && (
                <span className="text-[12px] font-normal text-[#D53411]">{errors.date}</span>
              )}

              {/* Date Picker Dropdown */}
              {showDatePicker && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-[12px] border border-[#cccccd] z-10 overflow-hidden w-[320px]">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-center gap-2.5 px-5 py-2">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5 text-[#808081]" />
                    </button>
                    <span className="flex-1 text-[16px] font-semibold leading-[1.6] text-[#10141a] text-center">
                      {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5 text-[#10141a]" />
                    </button>
                  </div>
                  {/* Divider */}
                  <div className="h-px bg-[#e5e5e6] w-full" />
                  {/* Week Days */}
                  <div className="flex items-center justify-center pt-2 w-full">
                    {weekDays.map((day) => (
                      <div key={day} className="flex-1 px-2 py-0.5 text-center text-[12px] font-medium text-[#10141a]">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar Grid */}
                  <div className="flex flex-col w-full pb-2">
                    {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIndex) => (
                      <div key={weekIndex} className="flex items-center justify-center py-1 w-full">
                        {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                          const isCurrentMonth = isSameMonth(day, currentMonth);
                          const isSelected = formData.date && isSameDay(day, formData.date);

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
          )}

          {/* Clock In Time */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Clock In Time</label>
            <div className="flex flex-wrap gap-2">
              {clockInTimeOptions.map((time, index) => (
                <button
                  key={`${time}-${index}`}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, clockInTime: time }));
                    setShowCustomClockIn(false);
                    clearError("clockInTime");
                  }}
                  className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${
                    formData.clockInTime === time && !showCustomClockIn
                      ? "bg-[#00b4b8] text-white"
                      : errors.clockInTime
                        ? "border border-[#D53411] text-[#10141a]"
                        : "border border-[#808081] text-[#10141a]"
                  }`}
                >
                  {time}
                </button>
              ))}
              <button
                onClick={() => setShowCustomClockIn(!showCustomClockIn)}
                className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${
                  showCustomClockIn
                    ? "bg-[#00b4b8] text-white"
                    : errors.clockInTime
                      ? "border border-[#D53411] text-[#10141a]"
                      : "border border-[#808081] text-[#10141a]"
                }`}
              >
                Enter Time
              </button>
            </div>
            {errors.clockInTime && (
              <span className="text-[12px] font-normal text-[#D53411]">{errors.clockInTime}</span>
            )}
            {showCustomClockIn && (
              <input
                type="time"
                value={customClockIn}
                onChange={(e) => {
                  setCustomClockIn(e.target.value);
                  setFormData(prev => ({ ...prev, clockInTime: e.target.value }));
                  clearError("clockInTime");
                }}
                className="mt-2 bg-white border border-[#cccccd] rounded-[12px] h-[44px] px-4 text-[14px] font-normal text-[#10141a] outline-none"
              />
            )}
          </div>

          {/* Clock Out Time */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Clock Out Time</label>
            <div className="flex flex-wrap gap-2">
              {clockOutTimeOptions.map((time, index) => (
                <button
                  key={`${time}-${index}`}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, clockOutTime: time }));
                    setShowCustomClockOut(false);
                    clearError("clockOutTime");
                  }}
                  className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${
                    formData.clockOutTime === time && !showCustomClockOut
                      ? "bg-[#00b4b8] text-white"
                      : errors.clockOutTime
                        ? "border border-[#D53411] text-[#10141a]"
                        : "border border-[#808081] text-[#10141a]"
                  }`}
                >
                  {time}
                </button>
              ))}
              <button
                onClick={() => setShowCustomClockOut(!showCustomClockOut)}
                className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${
                  showCustomClockOut
                    ? "bg-[#00b4b8] text-white"
                    : errors.clockOutTime
                      ? "border border-[#D53411] text-[#10141a]"
                      : "border border-[#808081] text-[#10141a]"
                }`}
              >
                Enter Time
              </button>
            </div>
            {errors.clockOutTime && (
              <span className="text-[12px] font-normal text-[#D53411]">{errors.clockOutTime}</span>
            )}
            {showCustomClockOut && (
              <input
                type="time"
                value={customClockOut}
                onChange={(e) => {
                  setCustomClockOut(e.target.value);
                  setFormData(prev => ({ ...prev, clockOutTime: e.target.value }));
                  clearError("clockOutTime");
                }}
                className="mt-2 bg-white border border-[#cccccd] rounded-[12px] h-[44px] px-4 text-[14px] font-normal text-[#10141a] outline-none"
              />
            )}
          </div>

          {/* ISP Outcome */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">ISP Outcome</label>
            <div className="bg-white border border-[#b2b2b3] rounded-[12px] h-[44px] px-4 flex items-center">
              <input
                type="text"
                value={formData.ispOutcome}
                onChange={(e) => setFormData(prev => ({ ...prev, ispOutcome: e.target.value }))}
                placeholder="Write here..."
                className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Plan of Care */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Plan of care</label>
            <label className="bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 flex items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload className="w-5 h-5 text-[#b2b2b3]" />
              <span className="text-[14px] font-normal text-[#b2b2b3]">
                Upload plan of care
              </span>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx"
              />
            </label>
            {/* Selected File Chip */}
            {formData.planOfCare && (
              <div className="flex items-center gap-2 bg-[rgba(0,216,65,0.08)] rounded-[8px] h-[36px] px-2 mt-1">
                <FileText className="w-5 h-5 text-[#00d841]" />
                <span className="text-[14px] font-medium text-[#10141a]">
                  {formData.planOfCare.name || "Plan of care PDF"}
                </span>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Action Buttons - Fixed */}
        <div className="flex gap-3 p-5 pt-0 flex-shrink-0">
          <Button
            onClick={() => {
              if (onSave) {
                onSave(formData);
              }
              onClose();
            }}
            disabled={isSubmitting}
            variant="outline"
            className="flex-1 border-[#2b82ff] text-[#2b82ff] rounded-full px-4 py-3 h-auto text-[14px] font-semibold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save and Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className="flex-1 bg-[#2b82ff] hover:bg-[#1a6fe0] text-white rounded-full px-4 py-3 h-auto text-[14px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === "edit" ? "Updating..." : "Scheduling..."}
              </>
            ) : (
              mode === "edit" ? "Update" : "Schedule"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
