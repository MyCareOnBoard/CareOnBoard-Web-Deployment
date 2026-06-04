import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { X, Calendar, ChevronLeft, ChevronRight, Clock, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import TimePicker from "@/components/TimePicker";
import { searchClients, Client, ClientDsp, ClientService, getAgencyClientById } from "@/lib/api/clients";
import { getEmployeeById, employeeCaregiverUid } from "@/lib/api/employees";
import { listEmployeeDocuments } from "@/lib/api/employee-documents";
import { useToast } from "@/hooks/use-toast";
import { mileageApi, CreateMileageRideRequest, MileageRide, UpdateAgencyRideRequest } from "@/lib/api/mileage";
import {
  clientServicesForMileage,
  findActiveTransportationService,
  formatServiceAuthorizationDatesSummary,
  formatServiceDisplay,
  mileageServiceFieldsForApi,
} from "@/pages/agency/mileage/utils/transportationClientService";
import { VoiceRecordingProvider } from "@/contexts/VoiceRecordingContext";
import VoiceInputButton from "@/components/VoiceInputButton";
import VoiceEnabledTextarea from "@/components/VoiceEnabledTextarea";

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

type ScheduleGate = { ok: true } | { ok: false; reason: string };

function computeScheduleGate(
  formData: MileageFormData,
  transportationService: ClientService | null,
  loadingClient: boolean,
): ScheduleGate {
  if (!formData.clientId) {
    return { ok: false, reason: "Select a client from search" };
  }
  if (loadingClient) {
    return { ok: false, reason: "Loading transportation service…" };
  }
  if (!transportationService?.code) {
    return { ok: false, reason: "No active transportation service" };
  }
  if (!formData.assignDspId) {
    return { ok: false, reason: "Select an assigned DSP" };
  }
  if (!formData.selectDate) {
    return { ok: false, reason: "Select date" };
  }
  if (!formData.selectTime) {
    return { ok: false, reason: "Select time" };
  }
  return { ok: true };
}

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
  const [transportationService, setTransportationService] = useState<ClientService | null>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showAssignDspDropdown, setShowAssignDspDropdown] = useState(false);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestClientSelectIdRef = useRef<string | null>(null);
  const dspVerifyTokenRef = useRef(0);

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

  const resetServiceAndDsp = useCallback(() => {
    dspVerifyTokenRef.current += 1;
    setTransportationService(null);
    setFormData((prev) => ({ ...prev, assignDsp: "", assignDspId: "" }));
    setShowAssignDspDropdown(false);
  }, []);

  const verifyAndApplyDsp = useCallback(
    async (dspId: string, dspName: string) => {
      const token = ++dspVerifyTokenRef.current;
      if (!dspId) {
        setFormData((prev) => ({ ...prev, assignDsp: "", assignDspId: "" }));
        return;
      }
      try {
        const [emp, documents] = await Promise.all([
          getEmployeeById(dspId),
          listEmployeeDocuments(dspId).catch(() => null),
        ]);
        if (token !== dspVerifyTokenRef.current) return;
        if (emp.workAvailability !== true) {
          setFormData((prev) => ({ ...prev, assignDsp: "", assignDspId: "" }));
          toast({
            title: "Assigned DSP unavailable",
            description:
              "The DSP assigned to this service is currently unavailable, please select another.",
            variant: "destructive",
          });
          return;
        }
        const caregiverUid = employeeCaregiverUid(emp);
        if (!caregiverUid) {
          setFormData((prev) => ({ ...prev, assignDsp: "", assignDspId: "" }));
          toast({
            title: "DSP account required",
            description:
              "This DSP does not have a login account yet. Choose another DSP or finish onboarding first.",
            variant: "destructive",
          });
          return;
        }
        if (documents !== null) {
          const license = documents.find((d) => d.documentType === "driverLicense");
          const hasValidLicense =
            license?.status === "available" || license?.status === "expiring-soon";
          if (!hasValidLicense) {
            setFormData((prev) => ({ ...prev, assignDsp: "", assignDspId: "" }));
            toast({
              title: "No valid driver's license",
              description:
                "This DSP does not have a valid driver's license on file. Please select another DSP or ask them to upload their license.",
              variant: "destructive",
            });
            return;
          }
        }
        setFormData((prev) => ({
          ...prev,
          assignDsp: dspName,
          assignDspId: caregiverUid,
        }));
      } catch {
        if (token !== dspVerifyTokenRef.current) return;
        setFormData((prev) => ({ ...prev, assignDsp: "", assignDspId: "" }));
        toast({
          title: "Could not verify assigned DSP",
          description:
            "Choose another DSP from this service's assigned list, or update staff on the client record.",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const applyClientForMileage = useCallback(
    (client: Client) => {
      const services = clientServicesForMileage(client);
      const transport = findActiveTransportationService(services);
      setTransportationService(transport);

      if (!transport) {
        toast({
          title: "No transportation service",
          description:
            "This client has no active transportation service. Add or renew transportation in Client Management, then try again.",
          variant: "destructive",
        });
        return;
      }

      const assigned = transport.assignedDsps;
      if (assigned?.length === 1 && assigned[0]?.id) {
        void verifyAndApplyDsp(assigned[0].id, assigned[0].name ?? "");
      }
    },
    [toast, verifyAndApplyDsp],
  );

  const loadClientForMileage = useCallback(
    async (clientId: string) => {
      latestClientSelectIdRef.current = clientId;
      resetServiceAndDsp();
      setLoadingClient(true);
      try {
        const client = await getAgencyClientById(clientId);
        if (latestClientSelectIdRef.current !== clientId) return;

        applyClientForMileage(client);
      } catch {
        if (latestClientSelectIdRef.current !== clientId) return;
        setTransportationService(null);
        toast({
          title: "Could not load client",
          description: "Try selecting the client again.",
          variant: "destructive",
        });
      } finally {
        if (latestClientSelectIdRef.current === clientId) {
          setLoadingClient(false);
        }
      }
    },
    [resetServiceAndDsp, applyClientForMileage, toast],
  );

  const handleClientSelect = (client: Client) => {
    const label =
      client.firstName && client.lastName
        ? `${client.firstName} ${client.lastName}`
        : client.id;
    latestClientSelectIdRef.current = client.id;
    resetServiceAndDsp();
    setFormData((prev) => ({
      ...prev,
      client: label,
      clientId: client.id,
    }));
    setShowClientDropdown(false);
    setClientSearchResults([]);
    applyClientForMileage(client);
  };

  const handleAssignedDspRowSelect = (dsp: ClientDsp) => {
    void verifyAndApplyDsp(dsp.id, dsp.name ?? "");
    setShowAssignDspDropdown(false);
  };

  const dspOnService = transportationService?.assignedDsps ?? [];

  const scheduleGate = useMemo(
    () => computeScheduleGate(formData, transportationService, loadingClient),
    [formData, transportationService, loadingClient],
  );


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

    if (initialRide.clientId) {
      void loadClientForMileage(initialRide.clientId);
    }
  }, [isOpen, mode, initialRide, loadClientForMileage]);

  useEffect(() => {
    if (isOpen && mode === "create") {
      setFormData({ ...initialFormData, selectDate: new Date() });
      setTransportationService(null);
      latestClientSelectIdRef.current = null;
    }
  }, [isOpen, mode]);


  const handleSaveAndCancel = () => {
    setFormData(initialFormData);
    onClose();
  };

  const handleSchedule = async () => {
    if (!scheduleGate.ok) {
      toast({
        title: "Complete required fields",
        description: scheduleGate.reason,
        variant: "destructive",
      });
      return;
    }

    const clientId = formData.clientId!;
    const caregiverId = formData.assignDspId!;
    const serviceFields = mileageServiceFieldsForApi(
      transportationService!,
      formData.assignDsp,
    );

    setIsSubmitting(true);
    try {
      const time24 = convertTo24Hour(formData.selectTime);
      const scheduledStartTime =
        formData.selectDate && time24
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
        ...serviceFields,
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
        onMileageUpdated?.();
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
                scheduledStartTime,
              };

        await mileageApi.create(payload);

        toast({
          title: "Success",
          description: "Mileage scheduled successfully.",
          variant: "success",
        });
        onMileageCreated?.();
      }

      setFormData(initialFormData);
      setTransportationService(null);
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
    <VoiceRecordingProvider pageTitle="Mileage">
      <VoiceInputButton className="z-[60]" />
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
                {(isSearchingClients || loadingClient) && (
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

            {/* Service (read-only) */}
            <div className="flex flex-col gap-1" id="mileage-service-field">
              <label className="text-[12px] font-normal text-[#10141a]">Service</label>
              <div className="bg-[#f9fafb] border border-[#cccccd] rounded-xl min-h-11 px-4 py-2.5 flex items-center">
                <span className="text-[14px] text-[#10141a]">
                  {!formData.clientId
                    ? "Select a client first"
                    : loadingClient
                      ? "Loading service…"
                      : transportationService
                        ? formatServiceDisplay(transportationService)
                        : "—"}
                </span>
              </div>
              {formData.clientId && !loadingClient && !transportationService && (
                <p className="text-[11px] font-medium text-red-700 leading-snug">
                  This client has no active transportation service. Add or renew transportation in
                  Client Management, then try again.
                </p>
              )}
              {transportationService && (
                <p className="text-[11px] text-[#6b7280]">
                  {formatServiceAuthorizationDatesSummary(transportationService)}
                </p>
              )}
            </div>

            {/* Assign DSP */}
            <div className="relative flex flex-col gap-1" id="mileage-assign-dsp-field">
              <label className="text-[12px] font-normal text-[#10141a]">Assign DSP</label>
              <button
                type="button"
                disabled={!transportationService || dspOnService.length === 0}
                onClick={() => setShowAssignDspDropdown((v) => !v)}
                className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full text-left"
              >
                <span
                  className={`flex-1 text-[14px] font-normal truncate ${
                    formData.assignDsp ? "text-black" : "text-[#b2b2b3]"
                  }`}
                >
                  {formData.assignDsp || "Select assigned DSP"}
                </span>
                <ChevronDown className="w-4 h-4 text-[#808081] shrink-0" />
              </button>
              {!transportationService && formData.clientId && !loadingClient && (
                <p className="text-[11px] text-[#6b7280]">Resolve transportation service first.</p>
              )}
              {transportationService && dspOnService.length === 0 && (
                <p className="text-[11px] text-[#b45309]" id="mileage-dsp-helper">
                  No caregiver is assigned to this transportation service. Assign staff on the
                  client record, then schedule mileage.
                </p>
              )}
              {showAssignDspDropdown && dspOnService.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-xl shadow-lg z-20 max-h-[200px] overflow-y-auto">
                  {dspOnService.map((dsp) => (
                    <button
                      key={dsp.id}
                      type="button"
                      onClick={() => handleAssignedDspRowSelect(dsp)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-[12px] last:rounded-b-[12px] cursor-pointer border-b border-[#f0f0f0] last:border-b-0"
                    >
                      <p className="text-[14px] font-normal text-black">{dsp.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Notes (optional)</label>
              <div className="rounded-xl border border-[#cccccd] bg-white px-4 py-2.5">
                <VoiceEnabledTextarea
                  placeholder="Add any notes..."
                  value={formData.notes}
                  onChange={(v) => setFormData((prev) => ({ ...prev, notes: v }))}
                  onVoiceAccepted={(t) =>
                    setFormData((prev) => ({
                      ...prev,
                      notes: prev.notes.trim() ? `${prev.notes.trim()} ${t.trim()}` : t.trim(),
                    }))
                  }
                  rows={2}
                  fieldName="Mileage notes"
                  pageTitle="Mileage"
                  disabled={isSubmitting}
                  className="min-h-[3rem] w-full resize-none border-0 bg-transparent p-0 text-[14px] font-normal text-black shadow-none placeholder:text-[#b2b2b3] focus-visible:ring-0"
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
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isSubmitting || !scheduleGate.ok}
            aria-describedby={
              !scheduleGate.ok ? "mileage-service-field mileage-assign-dsp-field" : undefined
            }
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
    </VoiceRecordingProvider>
  );
}
