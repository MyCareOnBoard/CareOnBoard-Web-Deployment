import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { X, ChevronDown, Calendar, Upload, ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { searchClients, Client } from "@/lib/api/clients";
import { searchEmployees, Employee } from "@/lib/api/employees";
import { useAuth } from "@/utils/auth";
import {Routes} from "@/routes/constants";
import { useToast } from "@/hooks/use-toast";
import { listShifts, Shift, ShiftStatus, createShift, ShiftType, SubmissionStatus, updateShift, CreateShiftRequest, ShiftActionStatus } from "@/lib/api/shifts";
import { eachDayOfInterval as eachDayOfIntervalDateFns } from "date-fns";
import { createEmployeeActivityLog } from "@/lib/api/employees";
import ScheduleSuccessModal from "./ScheduleSuccessModal";
import ScheduleSavedModal from "./ScheduleSavedModal";

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftsUpdated?: (shifts: Shift[]) => void;
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
  shiftId?: string;
  client: string;
  clientId: string;
  clientLocation: string;
  assignedDsp: string;
  assignedDspId: string;
  billingRate: string;
  serviceCode: string;
  notesType: string;
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
  "10.30:AM", "11.30:AM", "12.00:PM", "12.30:PM"
];

const clockOutTimeOptions = [
  "08:00:AM", "08:30:AM", "09:00:AM", "09:30:AM", "10.00:AM",
  "10.30:AM", "11.30:AM", "12.00:PM", "12.30:PM"
];

const noteTypes: {id: string, title: string}[] = [
  {
    id: "community-based",
    title: "Community Based / Individual Supports",
  },
  {
    id: "community-inclusion",
    title: "Community Inclusion Services – Activities Log",
  },
  {
    id: "day-habilitation",
    title: "Day Habilitation Services – Activities Log",
  },
  {
    id: "prevocational-training",
    title: "Prevocational Training Services – Activities Log",
  },
  {
    id: "supported-employment-intervention",
    title: "Supported Employment Services – Intervention Plan and Service Log",
  },
  {
    id: "supported-employment-pre",
    title: "Supported Employment Services – Pre‐Employment Service Log",
  },
  {
    id: "respite-log",
    title: "Respite Log",
  },
];


const initialFormData: ScheduleFormData = {
  client: "",
  clientId: "",
  clientLocation: "",
  assignedDsp: "",
  assignedDspId: "",
  billingRate: "",
  serviceCode: "",
  notesType: "",
  schedulingType: "",
  date: null,
  startDate: null,
  endDate: null,
  clockInTime: "",
  clockOutTime: "",
  ispOutcome: "",
  planOfCare: null,
};

export default function AddScheduleModal({ isOpen, onClose, onShiftsUpdated, editData, mode = "create" }: AddScheduleModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<ScheduleFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showNotesTypeDropdown, setShowNotesTypeDropdown] = useState(false);
  const [customClockIn, setCustomClockIn] = useState("");
  const [customClockOut, setCustomClockOut] = useState("");
  const [showCustomClockIn, setShowCustomClockIn] = useState(false);
  const [showCustomClockOut, setShowCustomClockOut] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showDspDropdown, setShowDspDropdown] = useState(false);

  // API search states
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [dspSearchResults, setDspSearchResults] = useState<Employee[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [isSearchingDsps, setIsSearchingDsps] = useState(false);

  // Debounce refs
  const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dspSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Success / saved modals state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [scheduledShiftInfo, setScheduledShiftInfo] = useState<{
    clientName: string;
    dspName: string;
    duration: string;
    date: string;
  } | null>(null);
  const [savedShiftInfo, setSavedShiftInfo] = useState<{
    clientName: string;
    dspName: string;
    date: string;
  } | null>(null);
  const [showUpdatedModal, setShowUpdatedModal] = useState(false);
  const [updatedShiftInfo, setUpdatedShiftInfo] = useState<{
    clientName: string;
    dspName: string;
    duration: string;
    date: string;
  } | null>(null);

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
      setClientSearchResults([]);
      setDspSearchResults([]);
    }
  }, [isOpen, editData, mode]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (clientSearchTimeoutRef.current) clearTimeout(clientSearchTimeoutRef.current);
      if (dspSearchTimeoutRef.current) clearTimeout(dspSearchTimeoutRef.current);
    };
  }, []);

  /**
   * Build shift requests from form data
   * Handles both one-time and recurring schedules
   */
  const buildShiftRequests = (data: ScheduleFormData): CreateShiftRequest[] => {
    if (!user?.profile?.id || !data.assignedDspId) return [];

    const requests: CreateShiftRequest[] = [];
    const baseShiftData = {
      employeeId: data.assignedDspId,
      agencyId: user?.profile?.id || "",
      location: data.clientLocation || "",
      startTime: data.clockInTime,
      endTime: data.clockOutTime,
      clientId: data.clientId,
      notesType: data.notesType || undefined,
      serviceCode: data.serviceCode,
      schedulingType: data.schedulingType,
      ispOutcome: data.ispOutcome || undefined,
      assignedDsp: data.assignedDsp,
      status: ShiftStatus.PENDING,
      type: ShiftType.AUTOMATIC,
      submissionStatus: SubmissionStatus.DRAFT,
    };

    if (data.schedulingType === "recurring" && data.startDate && data.endDate) {
      const dateRange = eachDayOfIntervalDateFns({ start: data.startDate, end: data.endDate });
      dateRange.forEach((date) => {
        requests.push({
          ...baseShiftData,
          date: format(date, "yyyy-MM-dd")
        });
      });
    } else if (data.date) {
      requests.push({
        ...baseShiftData,
        date: format(data.date, "yyyy-MM-dd")
      });
    }

    return requests;
  };

  // Search clients with debouncing
  const handleClientSearch = useCallback(async (query: string) => {
    // Clear existing timeout
    if (clientSearchTimeoutRef.current) {
      clearTimeout(clientSearchTimeoutRef.current);
    }

    // If query is too short, clear results
    if (query.trim().length < 2) {
      setClientSearchResults([]);
      setShowClientDropdown(false);
      return;
    }

    // Debounce the search
    clientSearchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearchingClients(true);
        const results = await searchClients(query, user?.profile?.id);
        setClientSearchResults(results);
        setShowClientDropdown(results.length > 0);
      } catch (error) {
        console.error("Failed to search clients:", error);
        setClientSearchResults([]);
      } finally {
        setIsSearchingClients(false);
      }
    }, 300);
  }, []);

  // Search DSPs/employees with debouncing
  const handleDspSearch = useCallback(async (query: string) => {
    // Clear existing timeout
    if (dspSearchTimeoutRef.current) {
      clearTimeout(dspSearchTimeoutRef.current);
    }

    // If query is too short, clear results
    if (query.trim().length < 2) {
      setDspSearchResults([]);
      setShowDspDropdown(false);
      return;
    }

    // Get agencyId from profile or user
    const agencyId = user?.profile?.id || user?.uid;

    // Debounce the search
    dspSearchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearchingDsps(true);
        const results = await searchEmployees(query, agencyId);
        setDspSearchResults(results);
        setShowDspDropdown(results.length > 0);
      } catch (error) {
        console.error("Failed to search employees:", error);
        setDspSearchResults([]);
      } finally {
        setIsSearchingDsps(false);
      }
    }, 300);
  }, [user?.profile?.id, user?.uid]);

  const handleClientSelect = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      client: client.firstName && client.lastName 
        ? `${client.firstName} ${client.lastName}` 
        : client.id,
      clientId: client.id,
      clientLocation: client.location || "",
    }));
    setShowClientDropdown(false);
    setClientSearchResults([]);
  };

  const handleDspSelect = (employee: Employee) => {
    setFormData(prev => ({
      ...prev,
      assignedDsp: employee.fullName,
      assignedDspId: employee.id,
      billingRate: "", // Billing rate would come from a different source
    }));
    setShowDspDropdown(false);
    setDspSearchResults([]);
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

  // Handle saving schedule as draft
  const handleSaveDraft = async () => {
    if (!user?.profile?.id) {
      toast({
        title: "Authentication Error",
        description: "User not authenticated. Please log in and try again.",
        variant: "destructive",
      });
      return;
    }

    // Validate form before saving
    if (!validateForm()) {
      return;
    }

    // Get the date for display
    const getDisplayDate = () => {
      if (formData.schedulingType === "recurring" && formData.startDate && formData.endDate) {
        return `${format(formData.startDate, "d MMMM")} - ${format(formData.endDate, "d MMMM")}`;
      }
      if (formData.date) {
        return format(formData.date, "d MMMM");
      }
      return format(new Date(), "d MMMM");
    };

    setIsSubmitting(true);
    try {
      // Edit existing shift as draft
      if (mode === "edit" && formData.shiftId) {
        setIsSubmitting(true);
        try {
          const updatePayload: any = {
            location: formData.clientLocation,
            startTime: formData.clockInTime,
            endTime: formData.clockOutTime,
            notesType: formData.notesType || undefined,
            serviceCode: formData.serviceCode,
            schedulingType: formData.schedulingType,
            ispOutcome: formData.ispOutcome,
            assignedDsp: formData.assignedDsp,
            employeeId: formData.assignedDspId || undefined,
            clientId: formData.clientId || undefined
          };

          if (formData.date) {
            updatePayload.date = format(formData.date, "yyyy-MM-dd");
          }

          await updateShift(formData.shiftId, updatePayload);

          setSavedShiftInfo({
            clientName: formData.client || "Client",
            dspName: formData.assignedDsp || "DSP",
            date: getDisplayDate(),
          });
          setShowSavedModal(true);

          const response = await listShifts({
            limit: 100,
            agencyId: user?.profile?.id || "",
            client: true,
            employee: true,
          });
          onShiftsUpdated?.(response.shifts || []);

          toast({
            title: "Changes Saved",
            description: "Shift has been saved as draft successfully.",
          });
        } catch (error: any) {
          console.error("Failed to save draft schedule:", error);
          toast({
            title: "Save Failed",
            description: error?.response?.data?.error || "Failed to save draft. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      const shiftRequests = buildShiftRequests(formData);

      if (shiftRequests.length === 0) {
        toast({
          title: "No Valid Entries",
          description: "Please fill in all required fields before saving.",
          variant: "destructive",
        });
        return;
      }

      const savePromises = shiftRequests.map(async (request) => {
        return createShift(request);
      });

      const results = await Promise.allSettled(savePromises);

      const failures = results.filter((r) => r.status === "rejected");
      const successes = results.filter((r) => r.status === "fulfilled");

      if (failures.length > 0) {
        if (successes.length > 0) {
          toast({
            title: "Partial Save",
            description: `Saved ${successes.length} of ${shiftRequests.length} schedule(s) as drafts.`,
          });
        } else {
          toast({
            title: "Save Failed",
            description: "Failed to save schedule drafts. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      if (successes.length > 0) {
        setSavedShiftInfo({
          clientName: formData.client || "Client",
          dspName: formData.assignedDsp || "DSP",
          date: getDisplayDate(),
        });
        setShowSavedModal(true);

        const response = await listShifts({
          limit: 100,
          agencyId: user?.profile?.id || "",
          client: true,
          employee: true,
        });
        onShiftsUpdated?.(response.shifts || []);
      }
    } catch (error: any) {
      console.error("Failed to save draft schedule:", error);
      toast({
        title: "Save Failed",
        description: error?.response?.data?.error || "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle scheduling (submitting) shifts
  const handleSubmit = async () => {
    if (!user?.profile?.id) {
      toast({
        title: "Authentication Error",
        description: "User not authenticated. Please log in and try again.",
        variant: "destructive",
      });
      return;
    }

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const calculateDuration = () => {
        if (!formData.clockInTime || !formData.clockOutTime) return "2 hours";
        try {
          const parseTime = (time: string) => {
            const match = time.match(/(\d+)[.:](\d+):?(AM|PM)/i);
            if (!match) return 0;
            let hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const period = match[3].toUpperCase();
            if (period === "PM" && hours !== 12) hours += 12;
            if (period === "AM" && hours === 12) hours = 0;
            return hours * 60 + minutes;
          };
          const startMinutes = parseTime(formData.clockInTime);
          const endMinutes = parseTime(formData.clockOutTime);
          const diffMinutes = endMinutes - startMinutes;
          const hours = Math.floor(diffMinutes / 60);
          const mins = diffMinutes % 60;
          if (mins > 0) return `${hours} hours ${mins} minutes`;
          return `${hours} hours`;
        } catch {
          return "2 hours";
        }
      };

      const getDisplayDate = () => {
        if (formData.schedulingType === "recurring" && formData.startDate && formData.endDate) {
          return `${format(formData.startDate, "d MMMM")} - ${format(formData.endDate, "d MMMM")}`;
        }
        if (formData.date) {
          return format(formData.date, "d MMMM");
        }
        return format(new Date(), "d MMMM");
      };

      // Edit existing shift - schedule (submit)
      if (mode === "edit" && formData.shiftId) {
        const updatePayload: any = {
          location: formData.clientLocation,
          startTime: formData.clockInTime,
          endTime: formData.clockOutTime,
          notesType: formData.notesType || undefined,
          serviceCode: formData.serviceCode,
          schedulingType: formData.schedulingType,
          ispOutcome: formData.ispOutcome,
          assignedDsp: formData.assignedDsp,
          employeeId: formData.assignedDspId || undefined,
          clientId: formData.clientId || undefined,
          submissionStatus: SubmissionStatus.SUBMITTED
        };

        if (formData.date) {
          updatePayload.date = format(formData.date, "yyyy-MM-dd");
        }

        await updateShift(formData.shiftId, updatePayload);

        setUpdatedShiftInfo({
          clientName: formData.client || "Client",
          dspName: formData.assignedDsp || "DSP",
          duration: calculateDuration(),
          date: getDisplayDate(),
        });
        setShowUpdatedModal(true);

        const response = await listShifts({
          limit: 100,
          agencyId: user?.profile?.id || "",
          client: true,
          employee: true,
        });
        onShiftsUpdated?.(response.shifts || []);

        toast({
          title: "Changes Saved",
          description: "Shift has been updated successfully.",
        });

        onClose();
        return;
      }

      // Create new shifts (existing behaviour)
      const shiftRequests = buildShiftRequests(formData);

      if (shiftRequests.length === 0) {
        toast({
          title: "No Valid Entries",
          description: "Please fill in all required fields before scheduling.",
          variant: "destructive",
        });
        return;
      }

      const finalShiftRequests = shiftRequests.map((request) => ({
        ...request,
        status: ShiftStatus.AVAILABLE,
        submissionStatus: SubmissionStatus.SUBMITTED,
        actionStatus: ShiftActionStatus.CLOCK_IN,
        type: ShiftType.AUTOMATIC,
      }));

      const results = await Promise.allSettled(
        finalShiftRequests.map((request) => createShift(request))
      );

      const activityLogPromises = results
        .map((result, index) => {
          if (result.status === "fulfilled" && result.value.success) {
            const createdShift = result.value;
            const shiftId = createdShift.shift?.id;
            if (shiftId) {
              const shiftDate = finalShiftRequests[index].date
                ? new Date(finalShiftRequests[index].date)
                : new Date();
              const clientName = formData.client || "Unknown Client";

              return createEmployeeActivityLog({
                activityType: formData.notesType,
                shiftId: shiftId,
                employeeId: formData.assignedDspId,
                agencyId: user?.profile?.id || "",
                description: "",
                metadata: {
                  employee: formData.assignedDsp,
                  individual: clientName,
                  agency: user?.profile?.name || "",
                  serviceYear: shiftDate.getFullYear(),
                  serviceCode: formData.serviceCode || "",
                  ISPOutcome: formData.ispOutcome || "",
                  strategies: [],
                },
              }).catch((error) => {
                console.error("Failed to create activity log for shift:", shiftId, error);
                return null;
              });
            }
          }
          return null;
        })
        .filter((promise) => promise !== null);

      if (activityLogPromises.length > 0) {
        await Promise.allSettled(activityLogPromises as Promise<unknown>[]);
      }

      const failures = results.filter((r) => r.status === "rejected");
      const successes = results.filter((r) => r.status === "fulfilled");

      if (failures.length > 0) {
        console.error("Failed to schedule some shifts:", failures);
        if (successes.length > 0) {
          toast({
            title: "Partial Submission",
            description: `Successfully scheduled ${successes.length} of ${finalShiftRequests.length} shifts. ${failures.length} failed.`,
          });
        } else {
          toast({
            title: "Scheduling Failed",
            description: "Failed to schedule shifts. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      if (successes.length > 0) {
        setScheduledShiftInfo({
          clientName: formData.client || "Client",
          dspName: formData.assignedDsp || "DSP",
          duration: calculateDuration(),
          date: getDisplayDate(),
        });
        setShowSuccessModal(true);

        const response = await listShifts({
          limit: 100,
          agencyId: user?.profile?.id || "",
          client: true,
          employee: true,
        });
        onShiftsUpdated?.(response.shifts || []);

        toast({
          title: "Schedule Created",
          description: `Successfully scheduled ${successes.length} shift(s).`,
        });

        onClose();
      }
    } catch (error: any) {
      console.error("Failed to create schedule:", error);
      toast({
        title: "Scheduling Failed",
        description: error?.response?.data?.error || "Failed to create schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    {isOpen && (
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
                  const value = e.target.value;
                  setFormData(prev => ({ ...prev, client: value, clientId: "", clientLocation: "" }));
                  handleClientSearch(value);
                  clearError("client");
                }}
                placeholder="Search client name..."
                className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent"
              />
              {isSearchingClients && (
                <Loader2 className="w-4 h-4 animate-spin text-[#808081]" />
              )}
            </div>
            {errors.client && (
              <span className="text-[12px] font-normal text-[#D53411]">{errors.client}</span>
            )}
            {/* Client Dropdown */}
            {showClientDropdown && clientSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-[12px] shadow-lg z-20 max-h-[200px] overflow-y-auto">
                {clientSearchResults.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      handleClientSelect(client);
                      clearError("client");
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-[12px] last:rounded-b-[12px] cursor-pointer border-b border-[#f0f0f0] last:border-b-0"
                  >
                    <p className="text-[14px] font-normal text-black">
                      {client.firstName && client.lastName 
                        ? `${client.firstName} ${client.lastName}` 
                        : client.id}
                    </p>
                    <p className="text-[12px] font-normal text-[#808081]">{client.address || client.location}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assigned DSP Field */}
          <div className="flex flex-col gap-1 relative">
            <label className="text-[12px] font-normal text-[#10141a]">Assign DSP</label>
            <div className={`bg-white border rounded-[12px] h-[44px] px-4 flex items-center ${errors.assignedDsp ? "border-[#D53411]" : "border-[#cccccd]"}`}>
              <input
                type="text"
                value={formData.assignedDsp}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ ...prev, assignedDsp: value, assignedDspId: "", billingRate: "" }));
                  handleDspSearch(value);
                  clearError("assignedDsp");
                }}
                placeholder="Search DSP name..."
                className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent"
              />
              {isSearchingDsps && (
                <Loader2 className="w-4 h-4 animate-spin text-[#808081]" />
              )}
            </div>
            {errors.assignedDsp && (
              <span className="text-[12px] font-normal text-[#D53411]">{errors.assignedDsp}</span>
            )}
            {/* DSP Dropdown */}
            {showDspDropdown && dspSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-[12px] shadow-lg z-20 max-h-[200px] overflow-y-auto">
                {dspSearchResults.map((employee) => (
                  <button
                    key={employee.uid || employee.id}
                    onClick={() => {
                      handleDspSelect(employee);
                      clearError("assignedDsp");
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-[12px] last:rounded-b-[12px] cursor-pointer border-b border-[#f0f0f0] last:border-b-0"
                  >
                    <p className="text-[14px] font-normal text-black">{employee.fullName}</p>
                    <p className="text-[12px] font-normal text-[#808081]">{employee.email}</p>
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

          {/* Service Code */}
          <div className="flex flex-col gap-1">
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

          {/* Notes Type */}
          <div className="flex flex-col gap-1 relative">
            <label className="text-[12px] font-normal text-[#10141a]">Notes Type</label>
            <button
              onClick={() => {
                setShowNotesTypeDropdown(!showNotesTypeDropdown);
              }}
              className="bg-white border border-[#cccccd] rounded-[12px] h-[44px] px-4 flex items-center gap-3 cursor-pointer"
            >
              <span className="flex-1 text-left text-[14px] font-normal text-black">
                {formData.notesType
                  ? noteTypes.find((elt) => elt.id === formData.notesType)?.title
                  : "Select notes type"
                }
              </span>
              <ChevronDown className="w-5 h-5 text-[#10141a]" />
            </button>
            
            {showNotesTypeDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-[12px] shadow-lg z-10">
                {noteTypes.map((notesType) => (
                  <button
                    key={notesType.id}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, notesType: notesType.id }));
                      setShowNotesTypeDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left text-[14px] font-normal text-[#10141a] hover:bg-gray-50 first:rounded-t-[12px] last:rounded-b-[12px] cursor-pointer"
                  >
                    {notesType.title}
                  </button>
                ))}
              </div>
            )}
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

        {/* Action Buttons - Fixed (used for both create and edit) */}
        <div className="flex gap-3 p-5 pt-0 flex-shrink-0">
          <Button
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            variant="outline"
            className="flex-1 border-[#2b82ff] text-[#2b82ff] rounded-full px-4 py-3 h-auto text-[14px] font-semibold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className="flex-1 bg-[#2b82ff] hover:bg-[#1a6fe0] text-white rounded-full px-4 py-3 h-auto text-[14px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Schedule"
            )}
          </Button>
        </div>
      </div>
      </div>
    )}

    {/* Schedule Success Modal */}
    {scheduledShiftInfo && (
      <ScheduleSuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setScheduledShiftInfo(null);
        }}
        clientName={scheduledShiftInfo.clientName}
        dspName={scheduledShiftInfo.dspName}
        duration={scheduledShiftInfo.duration}
        date={scheduledShiftInfo.date}
      />
    )}

    {/* Schedule Saved Modal */}
    {savedShiftInfo && (
      <ScheduleSavedModal
        isOpen={showSavedModal}
        onClose={() => {
          setShowSavedModal(false);
          setSavedShiftInfo(null);
        }}
        clientName={savedShiftInfo.clientName}
        dspName={savedShiftInfo.dspName}
        date={savedShiftInfo.date}
      />
    )}

    {/* Schedule Updated Modal */}
    {updatedShiftInfo && (
      <ScheduleSuccessModal
        isOpen={showUpdatedModal}
        onClose={() => {
          setShowUpdatedModal(false);
          setUpdatedShiftInfo(null);
        }}
        clientName={updatedShiftInfo.clientName}
        dspName={updatedShiftInfo.dspName}
        duration={updatedShiftInfo.duration}
        date={updatedShiftInfo.date}
      />
    )}
    </>
  );
}
