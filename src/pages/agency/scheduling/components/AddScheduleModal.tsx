import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { X, ChevronDown, Calendar, Upload, ChevronLeft, ChevronRight, FileText, Loader2, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import TimePicker from "@/components/TimePicker";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, eachDayOfInterval as eachDayOfIntervalDateFns, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO, isValid } from "date-fns";
import { searchClients, Client, ClientService, ClientDsp, getAgencyClientById } from "@/lib/api/clients";
import { getEmployeeById } from "@/lib/api/employees";
import { useAuth } from "@/utils/auth";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/redux/store";
import { Routes } from "@/routes/constants";
import { useToast } from "@/hooks/use-toast";
import { listShifts, Shift, ShiftStatus, createShift, ShiftType, SubmissionStatus, updateShift, CreateShiftRequest, ShiftActionStatus, ShiftLocation, formatShiftLocation, ShiftResponse } from "@/lib/api/shifts";
import { createEmployeeActivityLog, CreateActivityLogRequest } from "@/lib/api/employees";
import ScheduleSuccessModal from "./ScheduleSuccessModal";
import ScheduleSavedModal from "./ScheduleSavedModal";
import { createGoalDocument, DocumentType, CreateGoalDocumentRequest } from "@/lib/api/goals-and-documents";
import { noteTypesForClientType, getNoteTitle, HHA_PERSONAL_CARE, HHA_SERVICE_LOG } from "@/lib/notes/noteTypes";
import { resolveHhaNoteType } from "@/pages/agency/scheduling/utils/resolveHhaNoteType";
import { getClientBasicInfo } from "@/lib/notes/clientBasicInfo";
import {
  ispOutcomesToDisplayText,
  parseIspOutcomesFromDisplayText,
  serializeIspOutcomesForShift,
} from "@/pages/agency/scheduling/isp-outcomes";
import { findOutcomeStatementsForServiceCode } from "@/pages/shared/client-management/utils/outcomeServices";
import { getClientServicesForOperations } from "@/pages/shared/client-management/utils/clientServicesForOperations";
import {
  sanitizeWeeklyPartsFromUnknown,
  weeklyDistributionFingerprintFromWd,
} from "@/pages/shared/client-management/utils/sdrWeeklyDistribution";
import {
  buildWeeklyDistributionSnapshot,
  createShiftsCapAware,
  describeWhyNoShiftsWouldBeBuilt,
  effectiveWeekdaySchedulesForShiftBuild,
  formatTotalDurationFromHours,
  formatWeeklyDistributionDropdownLabel,
  isOneTimeDateInSnapshot,
  isWeekdayEnabledForSchedule,
  recurringWeekdayDateRangeMismatchMessage,
  shiftDurationHoursFrom12h,
  validateScheduleAgainstWeeklyDistributionRow,
  weekdayIndicesInDateRange,
  type WeeklyDistributionSnapshot,
} from "@/pages/agency/scheduling/weeklyDistributionSchedule";
import { staffLabels } from "@/lib/roleLabel";

function tryParseServiceAuthDate(raw?: string): Date | null {
  if (!raw?.trim()) return null;
  const d = parseISO(raw.trim());
  return isValid(d) ? d : null;
}

/** Authorization ended before today's local calendar day (YYYY-MM-DD); no end date = not expired. */
function isServiceAuthorizationEndDatePast(service: ClientService): boolean {
  const raw = service.endAuthDate?.trim();
  if (!raw) return false;
  const dayPrefix = raw.slice(0, 10);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  if (/^\d{4}-\d{2}-\d{2}$/.test(dayPrefix)) {
    return dayPrefix < todayStr;
  }
  const end = tryParseServiceAuthDate(raw);
  if (!end) return false;
  return format(end, "yyyy-MM-dd") < todayStr;
}

/** Date range for the grey line under the service field (and building block for picker rows). */
function formatServiceAuthorizationDatesSummary(service: ClientService): string {
  const start = tryParseServiceAuthDate(service.startAuthDate);
  const end = tryParseServiceAuthDate(service.endAuthDate);
  const fmt = (d: Date) => format(d, "MMM d, yyyy");
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  if (end) return `Through ${fmt(end)}`;
  return "Not on file";
}

/** Secondary line in service picker: authorization window. */
function formatServiceAuthorizationLabel(service: ClientService): string {
  const summary = formatServiceAuthorizationDatesSummary(service);
  if (summary === "Not on file") return "Authorization dates not on file";
  if (summary.includes(" – ")) return `Authorized ${summary}`;
  return `Authorized ${summary.charAt(0).toLowerCase()}${summary.slice(1)}`;
}

function pickSelectedServiceRow(
  services: ClientService[],
  data: Pick<ScheduleFormData, "serviceAuthorizationId" | "serviceCode">,
): ClientService | null {
  if (data.serviceAuthorizationId) {
    const byId = services.find((s) => s.id === data.serviceAuthorizationId);
    if (byId) return byId;
  }
  return services.find((s) => s.code === data.serviceCode) || null;
}

function oneTimePickerMonth(
  snapshot: WeeklyDistributionSnapshot,
  date: Date | null,
): Date {
  if (date && isOneTimeDateInSnapshot(date, snapshot)) {
    return startOfMonth(date);
  }
  return startOfMonth(snapshot.weekStart);
}

/** Server uses id and/or auth dates with serviceCode to pick the correct outcome row when codes repeat. */
function authDateToYmdUtc(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed.slice(0, 10))) {
    return trimmed.slice(0, 10);
  }
  const d = parseISO(trimmed);
  return isValid(d) ? d.toISOString().slice(0, 10) : undefined;
}

function serviceAuthorizationFieldsForApi(
  services: ClientService[],
  data: ScheduleFormData,
): Pick<
  CreateShiftRequest,
  "serviceAuthorizationId" | "serviceAuthStartDate" | "serviceAuthEndDate"
> {
  const svc = pickSelectedServiceRow(services, data);
  const id = (data.serviceAuthorizationId?.trim() || svc?.id?.trim()) || undefined;
  const start = authDateToYmdUtc(svc?.startAuthDate);
  const end = authDateToYmdUtc(svc?.endAuthDate);
  return {
    ...(id ? { serviceAuthorizationId: id } : {}),
    ...(start ? { serviceAuthStartDate: start } : {}),
    ...(end ? { serviceAuthEndDate: end } : {}),
  };
}

function shiftIspOutcomeApiValue(displayText: string): string | undefined {
  return serializeIspOutcomesForShift(parseIspOutcomesFromDisplayText(displayText));
}

function resolveIspOutcomeShiftPayload(
  client: Client | null,
  services: ClientService[],
  data: ScheduleFormData,
): string | undefined {
  const svc = pickSelectedServiceRow(services, data);
  const fromNested =
    client?.outcomes?.length && data.serviceCode
      ? findOutcomeStatementsForServiceCode(client.outcomes, data.serviceCode)
      : [];
  const merged = [...new Set([...(svc?.outcomes ?? []), ...fromNested])].filter(Boolean);
  if (merged.length > 0) {
    return serializeIspOutcomesForShift(merged);
  }
  return shiftIspOutcomeApiValue(data.ispOutcome);
}

function resolveIspOutcomeActivityLabel(
  client: Client | null,
  services: ClientService[],
  data: ScheduleFormData,
): string {
  const svc = pickSelectedServiceRow(services, data);
  const fromNested =
    client?.outcomes?.length && data.serviceCode
      ? findOutcomeStatementsForServiceCode(client.outcomes, data.serviceCode)
      : [];
  const merged = [...new Set([...(svc?.outcomes ?? []), ...fromNested])].filter(Boolean);
  if (merged.length) return merged.join("; ");
  return parseIspOutcomesFromDisplayText(data.ispOutcome).join("; ");
}

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftsUpdated?: (shifts: Shift[]) => void;
  editData?: ScheduleFormData | null; // For edit mode
  mode?: "create" | "edit";
}

interface FormErrors {
  client?: string;
  serviceCode?: string;
  assignedDsp?: string;
  schedulingType?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  clockInTime?: string;
  clockOutTime?: string;
  weeklyDistribution?: string;
}

export interface ScheduleFormData {
  shiftId?: string;
  client: string;
  clientId: string;
  clientLocation: ShiftLocation | null;
  assignedDsp: string;
  assignedDspId: string;
  billingRate: string;
  serviceCode: string;
  /** ClientService row id when authorizations are outcome-flattened (disambiguates duplicate codes). */
  serviceAuthorizationId?: string;
  notesType: string;
  comment?: string;
  schedulingType: "one-time" | "recurring" | "";
  date: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  clockInTime: string;
  clockOutTime: string;
  ispOutcome: string;
  planOfCare: File | null;
  submissionStatus?: SubmissionStatus;
  selectedWeekdays?: WeekdaySchedule[];
  goalsType: string;
}

export interface WeekdaySchedule {
  day: string; // "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
  dayIndex: number; // 0-6 (Sunday = 0)
  clockInTime: string;
  clockOutTime: string;
}

const clockInTimeOptions = [
  "08:00:AM", "08:30:AM", "09:00:AM", "09:30:AM", "10.00:AM",
  "10.30:AM", "11.30:AM", "12.00:PM", "12.30:PM"
];

const clockOutTimeOptions = [
  "08:00:AM", "08:30:AM", "09:00:AM", "09:30:AM", "10.00:AM",
  "10.30:AM", "11.30:AM", "12.00:PM", "12.30:PM"
];

const WEEKDAY_OPTIONS = [
  { label: "Sat", dayIndex: 6 },
  { label: "Sun", dayIndex: 0 },
  { label: "Mon", dayIndex: 1 },
  { label: "Tues", dayIndex: 2 },
  { label: "Wed", dayIndex: 3 },
  { label: "Thu", dayIndex: 4 },
  { label: "Fri", dayIndex: 5 },
];

const WEEKDAY_LABEL_BY_INDEX = Object.fromEntries(
  WEEKDAY_OPTIONS.map((option) => [option.dayIndex, option.label]),
) as Record<number, string>;

const DDD_GOALS_TYPES: { id: string; title: string }[] = [
  { id: DocumentType.COMMUNITY_INCLUSION_SERVICES, title: "Community Inclusion Services" },
  { id: DocumentType.COMMUNITY_INCLUSION_INDIVIDUALIZED_GOALS, title: "Community Inclusion – Individualized Goals" },
  { id: DocumentType.DAY_HABILITATION_SERVICES, title: "Day Habilitation Services" },
  { id: DocumentType.DAY_HABILITATION_INDIVIDUALIZED_GOALS, title: "Day Habilitation – Individualized Goals" },
  { id: DocumentType.PREVOCATIONAL_TRAINING_SERVICES, title: "Prevocational Training Services" },
  { id: DocumentType.PREVOCATIONAL_TRAINING_INDIVIDUALIZED_GOALS, title: "Prevocational Training – Individualized Goals" },
  { id: DocumentType.NATURAL_SUPPORTS_TRAINING, title: "Natural Supports Training" },
];


const initialFormData: ScheduleFormData = {
  client: "",
  clientId: "",
  clientLocation: null,
  assignedDsp: "",
  assignedDspId: "",
  billingRate: "",
  serviceCode: "",
  serviceAuthorizationId: "",
  notesType: "",
  comment: "",
  schedulingType: "one-time",
  date: null,
  startDate: null,
  endDate: null,
  clockInTime: "",
  clockOutTime: "",
  ispOutcome: "",
  planOfCare: null,
  goalsType: "",
};

const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

// Convert 12-hour format (e.g., "08:00:AM") to 24-hour format (e.g., "08:00")
const convertTo24Hour = (time12h: string): string => {
  if (!time12h) return "";

  // Handle formats like "08:00:AM", "08.00:AM", "8:00AM", etc.
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

// Convert 24-hour format (e.g., "14:30") to 12-hour format (e.g., "02:30:PM")
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

export default function AddScheduleModal({ isOpen, onClose, onShiftsUpdated, editData, mode = "create" }: AddScheduleModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const agencyMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const isHhaAgencyMode = agencyMode === "hha";
  const labels = staffLabels(agencyMode ? [agencyMode] : user?.agency?.supportedClientTypes);
  const [formData, setFormData] = useState<ScheduleFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showNotesTypeDropdown, setShowNotesTypeDropdown] = useState(false);
  const [showGoalsTypeDropdown, setShowGoalsTypeDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showAssignDspDropdown, setShowAssignDspDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  // Weekday scheduling state (for recurring schedules)
  const [selectedWeekdays, setSelectedWeekdays] = useState<WeekdaySchedule[]>([]);
  const [configuringWeekday, setConfiguringWeekday] = useState<{ day: string; dayIndex: number } | null>(null);
  const [selectedWeeklyDistributionIndex, setSelectedWeeklyDistributionIndex] = useState<number | null>(null);
  const [selectedDistributionSnapshot, setSelectedDistributionSnapshot] =
    useState<WeeklyDistributionSnapshot | null>(null);

  // API search states
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [selectedClientServices, setSelectedClientServices] = useState<ClientService[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSearchingClients, setIsSearchingClients] = useState(false);

  // Debounce refs
  const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  /** Discards stale async results when the user selects another client quickly. */
  const latestClientSelectIdRef = useRef<string | null>(null);
  /** Discards stale `getEmployeeById` when service or DSP selection changes quickly. */
  const dspVerifyTokenRef = useRef(0);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);

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

        // Fetch client data to populate services dropdown
        if (editData.clientId) {
          getAgencyClientById(editData.clientId)
            .then((client) => {
              setSelectedClient(client);
              setSelectedClientServices(getClientServicesForOperations(client));
            })
            .catch((error) => {
              console.error("Failed to fetch client for edit:", error);
            });
        }
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
      setIsSubmitting(false);
      setClientSearchResults([]);
      setShowAssignDspDropdown(false);
      setShowServiceDropdown(false);
      setSelectedWeekdays([]);
      setConfiguringWeekday(null);
      setSelectedWeeklyDistributionIndex(null);
      setSelectedDistributionSnapshot(null);
      if (!(editData && mode === "edit")) {
        setSelectedClient(null);
        setSelectedClientServices([]);
      }
    }
  }, [isOpen, editData, mode]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (clientSearchTimeoutRef.current) clearTimeout(clientSearchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showServiceDropdown) return;
    const handler = (e: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target as Node)) {
        setShowServiceDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showServiceDropdown]);

  /**
   * Build shift requests from form data
   * Handles both one-time and recurring schedules
   * For recurring schedules with selected weekdays, only creates shifts on those days
   */
  const buildShiftRequests = (data: ScheduleFormData): CreateShiftRequest[] => {
    if (!user?.agencyId || !data.assignedDspId) return [];

    const weekdaySchedulesForBuild = effectiveWeekdaySchedulesForShiftBuild({
      weekdaySchedules: selectedWeekdays,
      clockInTime: data.clockInTime,
      clockOutTime: data.clockOutTime,
      configuringWeekday,
    });

    const ispOutcomePayload = resolveIspOutcomeShiftPayload(selectedClient, selectedClientServices, data);
    const authFields = serviceAuthorizationFieldsForApi(selectedClientServices, data);
    const requests: CreateShiftRequest[] = [];

    if (data.schedulingType === "recurring" && data.startDate && data.endDate) {
      // Get all dates in the range
      const dateRange = eachDayOfIntervalDateFns({ start: data.startDate, end: data.endDate });

      // If weekdays are selected, filter dates by selected weekdays
      if (weekdaySchedulesForBuild.length > 0) {
        const selectedDayIndices = new Set(weekdaySchedulesForBuild.map(w => w.dayIndex));

        dateRange.forEach((date) => {
          const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

          // Only create shift if this day is in selected weekdays
          if (selectedDayIndices.has(dayOfWeek)) {
            // Find the weekday schedule for this day to get its specific times
            const weekdaySchedule = weekdaySchedulesForBuild.find(w => w.dayIndex === dayOfWeek);

            if (weekdaySchedule) {
              const baseShiftData = {
                employeeId: data.assignedDspId,
                agencyId: user?.agencyId || "",
                location: data.clientLocation || "",
                startTime: weekdaySchedule.clockInTime,
                endTime: weekdaySchedule.clockOutTime,
                clientId: data.clientId,
                notesType: data.notesType || undefined,
                comment: data.comment || undefined,
                goalsType: data.goalsType || undefined,
                serviceCode: data.serviceCode,
                ...authFields,
                schedulingType: data.schedulingType,
                ispOutcome: ispOutcomePayload,
                assignedDsp: data.assignedDsp,
                status: ShiftStatus.PENDING,
                type: ShiftType.AUTOMATIC,
                submissionStatus: SubmissionStatus.DRAFT,
                date: format(date, "yyyy-MM-dd")
              };

              requests.push(baseShiftData);
            }
          }
        });
      } else {
        // No weekdays selected - create shifts for all days (existing behavior)
        dateRange.forEach((date) => {
          const baseShiftData = {
            employeeId: data.assignedDspId,
            agencyId: user?.agencyId || "",
            location: data.clientLocation || "",
            startTime: data.clockInTime,
            endTime: data.clockOutTime,
            clientId: data.clientId,
            notesType: data.notesType || undefined,
            comment: data.comment || undefined,
            goalsType: data.goalsType || undefined,
            serviceCode: data.serviceCode,
            ...authFields,
            schedulingType: data.schedulingType,
            ispOutcome: ispOutcomePayload,
            assignedDsp: data.assignedDsp,
            status: ShiftStatus.PENDING,
            type: ShiftType.AUTOMATIC,
            submissionStatus: SubmissionStatus.DRAFT,
            date: format(date, "yyyy-MM-dd")
          };

          requests.push(baseShiftData);
        });
      }
    } else if (data.date) {
      const weekdaySchedule =
        weekdaySchedulesForBuild.length === 1 ? weekdaySchedulesForBuild[0] : null;
      const baseShiftData = {
        employeeId: data.assignedDspId,
        agencyId: user?.agencyId || "",
        location: data.clientLocation || "",
        startTime: weekdaySchedule?.clockInTime || data.clockInTime,
        endTime: weekdaySchedule?.clockOutTime || data.clockOutTime,
        clientId: data.clientId,
        notesType: data.notesType || undefined,
        comment: data.comment || undefined,
        goalsType: data.goalsType || undefined,
        serviceCode: data.serviceCode,
        ...authFields,
        schedulingType: data.schedulingType,
        ispOutcome: ispOutcomePayload,
        assignedDsp: data.assignedDsp,
        status: ShiftStatus.PENDING,
        type: ShiftType.AUTOMATIC,
        submissionStatus: SubmissionStatus.DRAFT,
        date: format(data.date, "yyyy-MM-dd")
      };

      requests.push(baseShiftData);
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
        const results = await searchClients(query, user?.agencyId);
        // Only active clients can be scheduled (HHA clients without an approved
        // Form 485 are kept non-active). Mirrors the backend CLIENT_INACTIVE gate.
        const schedulable = results.filter((c) => !c.status || c.status === "active");
        setClientSearchResults(schedulable);
        setShowClientDropdown(schedulable.length > 0);
      } catch (error) {
        console.error("Failed to search clients:", error);
        setClientSearchResults([]);
      } finally {
        setIsSearchingClients(false);
      }
    }, 300);
  }, [user?.agencyId]);

  const getClientPrimaryAddress = (client: Client): ShiftLocation | null => {
    if (client.primaryAddress) {
      return {
        address: client.primaryAddress.address,
        countyState: client.primaryAddress.countyState,
        zipCode: client.primaryAddress.zipCode,
        latlon: client.primaryAddress.location,
      };
    }

    const fallback: ShiftLocation = {
      address: client.address,
      countyState: client.countyState,
      zipCode: client.zipCode,
      latlon: client.location,
    };

    if (fallback.address || fallback.countyState || fallback.zipCode || fallback.latlon) {
      return fallback;
    }

    return null;
  };

  const handleClientSelect = (client: Client) => {
    const selectId = client.id;
    latestClientSelectIdRef.current = selectId;
    dspVerifyTokenRef.current += 1;
    setShowAssignDspDropdown(false);
    setShowServiceDropdown(false);

    setFormData((prev) => ({
      ...prev,
      client:
        client.firstName && client.lastName
          ? `${client.firstName} ${client.lastName}`
          : client.id,
      clientId: client.id,
      clientLocation: getClientPrimaryAddress(client),
      serviceCode: "",
      serviceAuthorizationId: "",
      assignedDsp: "",
      assignedDspId: "",
      billingRate: "",
      ispOutcome: "",
      notesType: "",
      goalsType: "",
    }));
    setSelectedClient(client);
    setSelectedClientServices(getClientServicesForOperations(client));
    setSelectedWeeklyDistributionIndex(null);
    setSelectedDistributionSnapshot(null);
    setShowClientDropdown(false);
    setClientSearchResults([]);
  };

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const isHhaClient = selectedClient?.type === "hha";
  const notesAutoResolved = isHhaClient || isHhaAgencyMode;

  const effectiveClientType = agencyMode ?? selectedClient?.type;
  const noteTypes = useMemo(
    () => (effectiveClientType ? noteTypesForClientType(effectiveClientType) : []),
    [effectiveClientType],
  );
  const goalsTypes = useMemo(
    () => (effectiveClientType === "ddd" ? DDD_GOALS_TYPES : []),
    [effectiveClientType],
  );

  const selectedService = useMemo(
    () => pickSelectedServiceRow(selectedClientServices, formData),
    [selectedClientServices, formData.serviceAuthorizationId, formData.serviceCode],
  );

  const hasAnySelectableService = useMemo(
    () => selectedClientServices.some((s) => !isServiceAuthorizationEndDatePast(s)),
    [selectedClientServices],
  );

  // HHA shifts auto-resolve their note type from the selected service instead of
  // the scheduler picking one. Personal Care services get the checklist note;
  // every other HHA service gets the activity-log note.
  const resolvedHhaNoteType = useMemo(
    () =>
      isHhaClient && selectedService
        ? resolveHhaNoteType(selectedService.serviceType, selectedService.code)
        : "",
    [isHhaClient, selectedService],
  );

  // Persist the resolved note type onto formData.notesType so it flows into the
  // shift request (shift.notesType, read at clock-out) and the activity log.
  // Only clear a stale HHA type once a DDD client is actually loaded — guarding
  // against the async gap on edit, where selectedClient is briefly null.
  useEffect(() => {
    if (isHhaClient) {
      setFormData((prev) =>
        prev.notesType === resolvedHhaNoteType
          ? prev
          : { ...prev, notesType: resolvedHhaNoteType },
      );
    } else if (selectedClient && selectedClient.type !== "hha") {
      setFormData((prev) =>
        prev.notesType === HHA_PERSONAL_CARE || prev.notesType === HHA_SERVICE_LOG
          ? { ...prev, notesType: "" }
          : prev,
      );
    }
  }, [isHhaClient, resolvedHhaNoteType, selectedClient]);

  const serviceTriggerLabel = useMemo(() => {
    if (selectedClientServices.length === 0) return "No services available";
    if (!hasAnySelectableService) return "No active authorizations";
    if (!formData.serviceAuthorizationId && !formData.serviceCode) return "Select service";
    const s = selectedService;
    if (!s) return "Select service";
    return s.name ? `${s.name} — ${s.code}` : s.code;
  }, [
    selectedClientServices.length,
    hasAnySelectableService,
    formData.serviceAuthorizationId,
    formData.serviceCode,
    selectedService,
  ]);

  /** Read-only copy shown in the modal: always the selected service's outcomes when available. */
  const ispOutcomeDisplay = useMemo(() => {
    if (isHhaClient) return "";
    if (selectedService?.outcomes && selectedService.outcomes.length > 0) {
      return ispOutcomesToDisplayText(selectedService.outcomes);
    }
    if (!formData.serviceCode) return "";
    return formData.ispOutcome;
  }, [isHhaClient, selectedService, formData.serviceCode, formData.ispOutcome]);

  const weeklyDistributionFingerprint = useMemo(() => {
    if (isHhaClient) return "";
    return weeklyDistributionFingerprintFromWd(selectedService?.sdrWeeklyDistribution);
  }, [isHhaClient, selectedService?.sdrWeeklyDistribution]);

  const weeklyDistributionRows = useMemo(() => {
    if (isHhaClient) return [];
    const parts = sanitizeWeeklyPartsFromUnknown(selectedService?.sdrWeeklyDistribution);
    return parts?.fullSanitizedRows ?? [];
  }, [isHhaClient, selectedService?.id, weeklyDistributionFingerprint]);

  const weeklyDistributionOptions = useMemo(
    () =>
      weeklyDistributionRows.map((row, index) => ({
        index,
        label: formatWeeklyDistributionDropdownLabel(row),
      })),
    [weeklyDistributionRows],
  );

  const weeklyDistributionStandardLine = useMemo(() => {
    const line = selectedService?.sdrWeeklyDistribution?.standardLine;
    return typeof line === "string" ? line.trim() : "";
  }, [selectedService?.sdrWeeklyDistribution?.standardLine]);

  const showWeeklyDistributionPicker = !isHhaClient && weeklyDistributionRows.length > 0;

  const sdrWeekdayIndices = useMemo(() => {
    if (!selectedDistributionSnapshot) return null;
    return weekdayIndicesInDateRange(
      selectedDistributionSnapshot.weekStart,
      selectedDistributionSnapshot.weekEnd,
    );
  }, [selectedDistributionSnapshot]);

  const enabledWeekdayIndices = useMemo(() => {
    if (formData.schedulingType === "one-time") {
      if (sdrWeekdayIndices) return sdrWeekdayIndices;
      if (formData.date) return new Set([formData.date.getDay()]);
      return new Set<number>();
    }
    if (formData.startDate && formData.endDate) {
      return weekdayIndicesInDateRange(formData.startDate, formData.endDate);
    }
    return new Set(WEEKDAY_OPTIONS.map((weekday) => weekday.dayIndex));
  }, [
    formData.schedulingType,
    formData.date,
    formData.startDate,
    formData.endDate,
    sdrWeekdayIndices,
  ]);

  const effectiveWeekdaySchedules = useMemo(
    () =>
      effectiveWeekdaySchedulesForShiftBuild({
        weekdaySchedules: selectedWeekdays,
        clockInTime: formData.clockInTime,
        clockOutTime: formData.clockOutTime,
        configuringWeekday,
      }),
    [selectedWeekdays, formData.clockInTime, formData.clockOutTime, configuringWeekday],
  );

  const getWeeklyDistributionValidationError = useCallback((): string | null => {
    if (selectedWeeklyDistributionIndex === null || !selectedDistributionSnapshot) {
      return null;
    }
    const result = validateScheduleAgainstWeeklyDistributionRow({
      formData,
      snapshot: selectedDistributionSnapshot,
      weekdaySchedules: effectiveWeekdaySchedules,
    });
    return result.ok ? null : result.message;
  }, [
    formData,
    selectedWeeklyDistributionIndex,
    selectedDistributionSnapshot,
    effectiveWeekdaySchedules,
  ]);

  const weeklyDistributionCapError = useMemo(
    () => getWeeklyDistributionValidationError(),
    [getWeeklyDistributionValidationError],
  );

  const verifyAndApplyDsp = useCallback(
    async (dspId: string, dspName: string) => {
      const token = ++dspVerifyTokenRef.current;
      if (!dspId) {
        setFormData((prev) => ({ ...prev, assignedDsp: "", assignedDspId: "" }));
        return;
      }
      try {
        const emp = await getEmployeeById(dspId);
        if (token !== dspVerifyTokenRef.current) return;
        if (emp.workAvailability !== true) {
          setFormData((prev) => ({ ...prev, assignedDsp: "", assignedDspId: "" }));
          toast({
            title: `Assigned ${labels.noun} unavailable`,
            description:
              `The ${labels.noun} assigned to this service is currently unavailable, please select another.`,
            variant: "destructive",
          });
          return;
        }
        setFormData((prev) => ({ ...prev, assignedDsp: dspName, assignedDspId: dspId }));
      } catch {
        if (token !== dspVerifyTokenRef.current) return;
        setFormData((prev) => ({ ...prev, assignedDsp: "", assignedDspId: "" }));
        toast({
          title: `Could not verify assigned ${labels.noun}`,
          description: `Choose another ${labels.noun} from this service's assigned list, or update staff on the client record.`,
          variant: "destructive",
        });
      }
    },
    [toast, staffNoun],
  );

  const handleServiceRowChange = useCallback(
    (value: string) => {
      dspVerifyTokenRef.current += 1;
      const service = selectedClientServices.find((s) => s.id === value);
      const outcomes = service?.outcomes || [];
      const assigned = service?.assignedDsps;
      const onlyDsp = assigned?.length === 1 ? assigned[0] : null;

      setFormData((prev) => ({
        ...prev,
        serviceAuthorizationId: value,
        serviceCode: service?.code || "",
        billingRate: service?.clientRate || "",
        ispOutcome: ispOutcomesToDisplayText(outcomes),
        assignedDsp: "",
        assignedDspId: "",
      }));
      setShowAssignDspDropdown(false);

      if (onlyDsp?.id) {
        void verifyAndApplyDsp(onlyDsp.id, onlyDsp.name ?? "");
      }
      setShowServiceDropdown(false);
      setSelectedWeeklyDistributionIndex(null);
      setSelectedDistributionSnapshot(null);
    },
    [selectedClientServices, verifyAndApplyDsp],
  );

  const handleWeeklyDistributionChange = useCallback(
    (value: string) => {
      clearError("weeklyDistribution");
      if (value === "manual") {
        setSelectedWeeklyDistributionIndex(null);
        setSelectedDistributionSnapshot(null);
        return;
      }
      const index = Number.parseInt(value, 10);
      const row = weeklyDistributionRows[index];
      if (!row) return;
      const snapshot = buildWeeklyDistributionSnapshot(row);
      setSelectedWeeklyDistributionIndex(index);
      setSelectedDistributionSnapshot(snapshot);
      if (snapshot) {
        if (formData.schedulingType === "one-time") {
          setCurrentMonth(startOfMonth(snapshot.weekStart));
        }
        setFormData((prev) => {
          if (prev.schedulingType === "one-time") {
            return { ...prev, date: null };
          }
          return {
            ...prev,
            startDate: snapshot.weekStart,
            endDate: snapshot.weekEnd,
          };
        });
        setSelectedWeekdays([]);
        setConfiguringWeekday(null);
        clearError("startDate");
        clearError("endDate");
        clearError("date");
      }
    },
    [weeklyDistributionRows, formData.schedulingType],
  );

  const handleAssignedDspRowSelect = useCallback(
    (dsp: ClientDsp) => {
      void verifyAndApplyDsp(dsp.id, dsp.name);
    },
    [verifyAndApplyDsp],
  );

  const pocDocument = useMemo(() => {
    if (!selectedClient?.documents) return null;
    return selectedClient.documents.find((doc) => doc.key === "poc") || null;
  }, [selectedClient]);

  const handleDateSelect = (date: Date) => {
    setFormData(prev => ({ ...prev, date }));
    setShowDatePicker(false);
    clearError("date");
  };

  const openOneTimeDatePicker = useCallback(() => {
    if (selectedDistributionSnapshot) {
      setCurrentMonth(oneTimePickerMonth(selectedDistributionSnapshot, formData.date));
    }
    setShowDatePicker((prev) => !prev);
  }, [selectedDistributionSnapshot, formData.date]);

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

  // Handle weekday toggle
  const handleWeekdayToggle = (day: string, dayIndex: number) => {
    if (
      !isWeekdayEnabledForSchedule({
        schedulingType: formData.schedulingType,
        dayIndex,
        date: formData.date,
        startDate: formData.startDate,
        endDate: formData.endDate,
        snapshot: selectedDistributionSnapshot,
      })
    ) {
      return;
    }

    if (
      formData.schedulingType === "one-time" &&
      selectedDistributionSnapshot
    ) {
      for (const d of eachDayOfInterval({
        start: selectedDistributionSnapshot.weekStart,
        end: selectedDistributionSnapshot.weekEnd,
      })) {
        if (d.getDay() === dayIndex) {
          setConfiguringWeekday(null);
          setFormData((prev) => ({ ...prev, date: d }));
          clearError("date");
          return;
        }
      }
      return;
    }

    const existing = selectedWeekdays.find(w => w.dayIndex === dayIndex);

    if (existing) {
      if (configuringWeekday?.dayIndex === dayIndex) {
        setSelectedWeekdays(prev => prev.filter(w => w.dayIndex !== dayIndex));
        setConfiguringWeekday(null);
        setFormData(prev => ({ ...prev, clockInTime: "", clockOutTime: "" }));
        return;
      }
      setConfiguringWeekday({ day, dayIndex });
      setFormData(prev => ({
        ...prev,
        clockInTime: existing.clockInTime,
        clockOutTime: existing.clockOutTime,
      }));
      return;
    } else {
      // Start configuring this weekday
      setConfiguringWeekday({ day, dayIndex });
      // Reset clock times for this new weekday
      setFormData(prev => ({ ...prev, clockInTime: "", clockOutTime: "" }));
    }
  };

  // When clock in/out times are set and we're configuring a weekday, add it to selected weekdays
  useEffect(() => {
    if (configuringWeekday && formData.clockInTime && formData.clockOutTime) {
      // Add the configured weekday to selected weekdays
      setSelectedWeekdays(prev => {
        // Check if it already exists
        const existing = prev.find(w => w.dayIndex === configuringWeekday.dayIndex);
        if (existing) {
          // Update existing
          return prev.map(w =>
            w.dayIndex === configuringWeekday.dayIndex
              ? { ...w, clockInTime: formData.clockInTime, clockOutTime: formData.clockOutTime }
              : w
          );
        } else {
          const entry = {
            day: configuringWeekday.day,
            dayIndex: configuringWeekday.dayIndex,
            clockInTime: formData.clockInTime,
            clockOutTime: formData.clockOutTime,
          };
          if (formData.schedulingType === "one-time") {
            return [entry];
          }
          return [...prev, entry];
        }
      });

      // Clear configuring state
      setConfiguringWeekday(null);
    }
  }, [configuringWeekday, formData.clockInTime, formData.clockOutTime, formData.schedulingType]);

  // Keep a lone selected weekday in sync with the clock pickers
  useEffect(() => {
    if (configuringWeekday || selectedWeekdays.length !== 1) return;
    if (!formData.clockInTime || !formData.clockOutTime) return;
    const only = selectedWeekdays[0];
    if (
      only.clockInTime === formData.clockInTime &&
      only.clockOutTime === formData.clockOutTime
    ) {
      return;
    }
    setSelectedWeekdays([
      {
        ...only,
        clockInTime: formData.clockInTime,
        clockOutTime: formData.clockOutTime,
      },
    ]);
  }, [
    configuringWeekday,
    selectedWeekdays,
    formData.clockInTime,
    formData.clockOutTime,
  ]);

  // Drop weekdays (and in-progress config) that fall outside the recurring date range
  useEffect(() => {
    if (
      formData.schedulingType !== "recurring" ||
      !formData.startDate ||
      !formData.endDate
    ) {
      return;
    }
    const allowed = weekdayIndicesInDateRange(formData.startDate, formData.endDate);
    setSelectedWeekdays((prev) => {
      const next = prev.filter((w) => allowed.has(w.dayIndex));
      return next.length === prev.length ? prev : next;
    });
    setConfiguringWeekday((current) => {
      if (current && !allowed.has(current.dayIndex)) {
        setFormData((prev) => ({ ...prev, clockInTime: "", clockOutTime: "" }));
        return null;
      }
      return current;
    });
  }, [formData.schedulingType, formData.startDate, formData.endDate]);

  // Sync SDR dates, one-time weekday selection, and clear out-of-range one-time dates
  useEffect(() => {
    if (formData.schedulingType === "recurring" && selectedDistributionSnapshot) {
      if (!formData.startDate || !formData.endDate) {
        setFormData((prev) => ({
          ...prev,
          startDate: prev.startDate ?? selectedDistributionSnapshot.weekStart,
          endDate: prev.endDate ?? selectedDistributionSnapshot.weekEnd,
        }));
      }
      return;
    }

    if (formData.schedulingType !== "one-time") return;

    if (
      selectedDistributionSnapshot &&
      formData.date &&
      !isOneTimeDateInSnapshot(formData.date, selectedDistributionSnapshot)
    ) {
      setFormData((prev) => ({ ...prev, date: null }));
      return;
    }

    if (!formData.date) return;

    const dayIndex = formData.date.getDay();
    const label = WEEKDAY_LABEL_BY_INDEX[dayIndex] ?? dayIndex.toString();

    setSelectedWeekdays((prev) => {
      const existing = prev.find((w) => w.dayIndex === dayIndex);
      const nextEntry: WeekdaySchedule = {
        day: label,
        dayIndex,
        clockInTime: existing?.clockInTime || formData.clockInTime || "",
        clockOutTime: existing?.clockOutTime || formData.clockOutTime || "",
      };
      if (
        prev.length === 1 &&
        prev[0].dayIndex === dayIndex &&
        prev[0].clockInTime === nextEntry.clockInTime &&
        prev[0].clockOutTime === nextEntry.clockOutTime
      ) {
        return prev;
      }
      return [nextEntry];
    });

    setConfiguringWeekday((current) => {
      if (current && current.dayIndex !== dayIndex) {
        return null;
      }
      return current;
    });
  }, [
    formData.schedulingType,
    formData.date,
    formData.startDate,
    formData.endDate,
    formData.clockInTime,
    formData.clockOutTime,
    selectedDistributionSnapshot,
  ]);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Client validation
    if (!formData.client.trim()) {
      newErrors.client = "Client is required";
    }

    if (formData.clientId && !formData.serviceCode.trim()) {
      newErrors.serviceCode = "Service is required";
    }

    if (
      formData.clientId &&
      formData.serviceCode.trim() &&
      selectedService &&
      isServiceAuthorizationEndDatePast(selectedService)
    ) {
      newErrors.serviceCode = "This authorization has ended. Choose an active service.";
    }

    // Assigned DSP validation
    if (!formData.assignedDsp.trim()) {
      newErrors.assignedDsp = `Assigned ${labels.noun} is required`;
    }

    // Scheduling type validation
    if (!formData.schedulingType) {
      newErrors.schedulingType = "Please select a scheduling type";
    }

    // Date validation based on scheduling type
    if (formData.schedulingType === "one-time") {
      if (!formData.date) {
        newErrors.date = "Please select a date";
      } else if (
        selectedDistributionSnapshot &&
        !isOneTimeDateInSnapshot(formData.date, selectedDistributionSnapshot)
      ) {
        newErrors.date = "Date must fall within the selected weekly distribution week";
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

    // Clock time validation
    if (selectedWeekdays.length > 0) {
      // When weekdays are selected, validate each weekday has times
      const invalidWeekdays = selectedWeekdays.filter(w => !w.clockInTime || !w.clockOutTime);
      if (invalidWeekdays.length > 0) {
        newErrors.clockInTime = `Please set times for all selected weekdays`;
      }

      // Check if a weekday is currently being configured
      if (configuringWeekday) {
        newErrors.clockInTime = `Please finish setting times for ${configuringWeekday.day} or deselect it`;
      }
    } else {
      // Without selected weekdays, validate general times
      if (!formData.clockInTime) {
        newErrors.clockInTime = "Please select a clock in time";
      }
      if (!formData.clockOutTime) {
        newErrors.clockOutTime = "Please select a clock out time";
      }
    }

    const distributionError = getWeeklyDistributionValidationError();
    if (distributionError) {
      newErrors.weeklyDistribution = distributionError;
    }

    const weekdayRangeMismatch = recurringWeekdayDateRangeMismatchMessage({
      formData,
      weekdaySchedules: effectiveWeekdaySchedules,
      weekdayLabelByIndex: WEEKDAY_LABEL_BY_INDEX,
    });
    if (weekdayRangeMismatch) {
      newErrors.startDate = weekdayRangeMismatch;
    }

    if (!formData.assignedDspId.trim() && formData.assignedDsp.trim()) {
      newErrors.assignedDsp =
        `Select an assigned ${labels.noun} from the service list. The chosen ${labels.noun} must be linked to an employee record.`;
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

    if (formData.clientId && !formData.serviceCode.trim()) return false;

    if (selectedService && isServiceAuthorizationEndDatePast(selectedService)) return false;

    // Assigned DSP validation
    if (!formData.assignedDsp.trim()) return false;

    // Scheduling type validation
    if (!formData.schedulingType) return false;

    // Date validation based on scheduling type
    if (formData.schedulingType === "one-time") {
      if (!formData.date) return false;
      if (
        selectedDistributionSnapshot &&
        !isOneTimeDateInSnapshot(formData.date, selectedDistributionSnapshot)
      ) {
        return false;
      }
    } else if (formData.schedulingType === "recurring") {
      if (!formData.startDate) return false;
      if (!formData.endDate) return false;
      if (formData.startDate > formData.endDate) return false;
    }

    // Clock time validation
    if (selectedWeekdays.length > 0) {
      const invalidWeekdays = selectedWeekdays.filter(w => !w.clockInTime || !w.clockOutTime);
      if (invalidWeekdays.length > 0) return false;
      if (configuringWeekday) return false;
    } else {
      // For one-time or recurring without weekdays, validate general times
      if (!formData.clockInTime) return false;
      if (!formData.clockOutTime) return false;
    }

    if (getWeeklyDistributionValidationError()) return false;

    if (
      recurringWeekdayDateRangeMismatchMessage({
        formData,
        weekdaySchedules: effectiveWeekdaySchedules,
        weekdayLabelByIndex: WEEKDAY_LABEL_BY_INDEX,
      })
    ) {
      return false;
    }

    if (!formData.assignedDspId.trim() && formData.assignedDsp.trim()) return false;

    return true;
  }, [
    formData,
    selectedWeekdays,
    configuringWeekday,
    selectedService,
    selectedWeeklyDistributionIndex,
    selectedDistributionSnapshot,
    effectiveWeekdaySchedules,
    getWeeklyDistributionValidationError,
  ]);

  // Builds the activity-log payload for a shift. The backend upserts by shiftId,
  // so this is safe to call on both create and edit (edit keeps the note in sync
  // when the service / note type changes).
  const buildShiftActivityLogPayload = (
    shiftId: string,
    startTime: string,
    endTime: string,
    shiftDate: Date,
  ): CreateActivityLogRequest => {
    const effectiveNotesType = isHhaClient ? resolvedHhaNoteType : formData.notesType;
    const clientBasicInfo = getClientBasicInfo(selectedClient);
    return {
      activityType: effectiveNotesType,
      shiftId,
      employeeId: formData.assignedDspId,
      agencyId: user?.agencyId || "",
      description: "",
      metadata: {
        employee: formData.assignedDsp,
        individual: formData.client || "Unknown Client",
        clientId: formData.clientId || "",
        agency: user?.fullName || "",
        agencyName: user?.agency?.name || "",
        serviceYear: shiftDate.getFullYear(),
        serviceCode: formData.serviceCode || "",
        ISPOutcome: resolveIspOutcomeActivityLabel(selectedClient, selectedClientServices, formData),
        strategies: [],
        ...(isHhaClient
          ? {
              clientName: clientBasicInfo.name,
              clientDob: clientBasicInfo.dob,
              clientAddress: clientBasicInfo.address,
              clientPhone: clientBasicInfo.phone,
              serviceType: selectedService?.serviceType || "",
              serviceGoal: selectedService?.serviceGoal || "",
              shiftDate: format(shiftDate, "MMM d, yyyy"),
              shiftStartTime: startTime || "",
              shiftEndTime: endTime || "",
            }
          : {}),
      },
    };
  };

  // Keeps the shift's activity log in sync after an edit (upsert by shiftId).
  const reconcileShiftActivityLog = async (shiftId: string) => {
    const effectiveNotesType = isHhaClient ? resolvedHhaNoteType : formData.notesType;
    if (!shiftId || !effectiveNotesType) return;
    // DDD: only reconcile when the note type actually changed (avoids an extra
    // read+write per edit). HHA may also have updated service-derived metadata
    // (goal, times, service code), so always reconcile.
    if (!isHhaClient && editData?.notesType === effectiveNotesType) return;
    const shiftDate = formData.date ? new Date(formData.date) : new Date();
    try {
      await createEmployeeActivityLog(
        buildShiftActivityLogPayload(shiftId, formData.clockInTime, formData.clockOutTime, shiftDate),
      );
    } catch (error) {
      console.error("Failed to reconcile activity log for shift:", shiftId, error);
    }
  };

  // Handle saving schedule as draft
  const handleSaveDraft = async () => {
    if (!user?.agencyId) {
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
            comment: formData.comment || undefined,
            serviceCode: formData.serviceCode,
            ...serviceAuthorizationFieldsForApi(selectedClientServices, formData),
            schedulingType: formData.schedulingType,
            ispOutcome: resolveIspOutcomeShiftPayload(selectedClient, selectedClientServices, formData),
            assignedDsp: formData.assignedDsp,
            employeeId: formData.assignedDspId || undefined,
            clientId: formData.clientId || undefined
          };

          if (formData.date) {
            updatePayload.date = format(formData.date, "yyyy-MM-dd");
          }

          await updateShift(formData.shiftId, updatePayload);
          await reconcileShiftActivityLog(formData.shiftId);

          setSavedShiftInfo({
            clientName: formData.client || "Client",
            dspName: formData.assignedDsp || "DSP",
            date: getDisplayDate(),
          });
          setShowSavedModal(true);

          const response = await listShifts({
            limit: 100,
            agencyId: user?.agencyId || "",
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
            title: error?.response?.data?.code || "Save Failed",
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
          title: "No shifts to save",
          description: describeWhyNoShiftsWouldBeBuilt({
            formData,
            weekdaySchedules: selectedWeekdays,
            weekdayLabelByIndex: WEEKDAY_LABEL_BY_INDEX,
            hasAgencyId: Boolean(user?.agencyId),
            hasAssignedDspId: Boolean(formData.assignedDspId.trim()),
            action: "save",
          }),
          variant: "destructive",
        });
        return;
      }

      const results = await createShiftsCapAware(
        shiftRequests,
        (request) => createShift(request),
        selectedDistributionSnapshot,
      );

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
            title: failures[0]?.reason?.response?.data?.code || "Save Failed",
            description: failures[0]?.reason?.response?.data?.error || "Failed to save schedule drafts. Please try again.",
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
          agencyId: user?.agencyId || "",
          client: true,
          employee: true,
        });
        onShiftsUpdated?.(response.shifts || []);
      }
    } catch (error: any) {
      console.error("Failed to save draft schedule:", error);
      toast({
        title: error?.response?.data?.code || "Save Failed",
        description: error?.response?.data?.error || "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle scheduling (submitting) shifts
  const handleSubmit = async () => {
    if (!user?.agencyId) {
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
      const getDisplayDate = () => {
        if (formData.schedulingType === "recurring" && formData.startDate && formData.endDate) {
          return `${format(formData.startDate, "d MMMM")} - ${format(formData.endDate, "d MMMM")}`;
        }
        if (formData.date) {
          return format(formData.date, "d MMMM");
        }
        return format(new Date(), "d MMMM");
      };

      const durationFromShiftRequests = (
        requests: Pick<CreateShiftRequest, "startTime" | "endTime">[],
      ) => {
        const totalHours = requests.reduce(
          (sum, request) =>
            sum +
            shiftDurationHoursFrom12h(
              request.startTime ?? "",
              request.endTime ?? "",
            ),
          0,
        );
        return formatTotalDurationFromHours(totalHours);
      };

      // Edit existing shift - schedule (submit)
      if (mode === "edit" && formData.shiftId) {
        const updatePayload: any = {
          location: formData.clientLocation,
          startTime: formData.clockInTime,
          endTime: formData.clockOutTime,
          notesType: formData.notesType || undefined,
          comment: formData.comment || undefined,
          serviceCode: formData.serviceCode,
          ...serviceAuthorizationFieldsForApi(selectedClientServices, formData),
          schedulingType: formData.schedulingType,
          ispOutcome: resolveIspOutcomeShiftPayload(selectedClient, selectedClientServices, formData),
          assignedDsp: formData.assignedDsp,
          employeeId: formData.assignedDspId || undefined,
          clientId: formData.clientId || undefined,
          submissionStatus: SubmissionStatus.SUBMITTED
        };

        if (formData.date) {
          updatePayload.date = format(formData.date, "yyyy-MM-dd");
        }

        await updateShift(formData.shiftId, updatePayload);
        await reconcileShiftActivityLog(formData.shiftId);

        setUpdatedShiftInfo({
          clientName: formData.client || "Client",
          dspName: formData.assignedDsp || "DSP",
          duration: durationFromShiftRequests([
            {
              startTime: formData.clockInTime,
              endTime: formData.clockOutTime,
            },
          ]),
          date: getDisplayDate(),
        });
        setShowUpdatedModal(true);

        const response = await listShifts({
          limit: 100,
          agencyId: user?.agencyId || "",
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
          title: "No shifts to schedule",
          description: describeWhyNoShiftsWouldBeBuilt({
            formData,
            weekdaySchedules: selectedWeekdays,
            weekdayLabelByIndex: WEEKDAY_LABEL_BY_INDEX,
            hasAgencyId: Boolean(user?.agencyId),
            hasAssignedDspId: Boolean(formData.assignedDspId.trim()),
            action: "schedule",
          }),
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

      const results = await createShiftsCapAware(
        finalShiftRequests,
        (request) => createShift(request),
        selectedDistributionSnapshot,
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

              return createEmployeeActivityLog(
                buildShiftActivityLogPayload(
                  shiftId,
                  createdShift.shift?.startTime || "",
                  createdShift.shift?.endTime || "",
                  shiftDate,
                ),
              ).catch((error) => {
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

      // Create goal documents if goalsType is set (DDD only; HHA uses the
      // authorization goal carried on the note, not a DDD goal document).
      if (!isHhaClient && formData.goalsType) {
        const successfulShifts = results
          .filter((r): r is PromiseFulfilledResult<ShiftResponse> =>
            r.status === "fulfilled" && r.value.success
          )
          .map((result) => result.value.shift)
          .filter((shift): shift is NonNullable<typeof shift> => shift != null);

        // Create goal documents with shiftId at top level
        const goalResults = await Promise.all(
          successfulShifts.map((shift) =>
            createGoalDocument({
              agencyId: user?.agencyId || "",
              clientId: formData.clientId || undefined,
              createdBy: user?.id,
              documentType: formData.goalsType as DocumentType,
              status: SubmissionStatus.DRAFT,
              shiftId: shift.id,
              metadata: {
                name: formData.client,
                completedBy: formData.assignedDsp,
                completionDate: shift.date || format(new Date(), "yyyy-MM-dd"),
              } as any,
            }).catch((err) => {
              console.error("Failed to create goal document:", err);
              return null;
            })
          )
        );

        // Update shifts with goalsAndDocumentsId
        const shiftUpdates = successfulShifts
          .map((shift, index) => {
            const goalResult = goalResults[index];
            if (goalResult && goalResult.document?.id) {
              return updateShift(shift.id, {
                goalsAndDocumentsId: goalResult.document.id,
              }).catch((err) => {
                console.error(`Failed to update shift ${shift.id} with goal doc ID:`, err);
                return null;
              });
            }
            return null;
          })
          .filter(Boolean);

        if (shiftUpdates.length > 0) {
          await Promise.all(shiftUpdates);
        }
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
            title: failures[0]?.reason?.response?.data?.code || "Scheduling Failed",
            description: failures[0]?.reason?.response?.data?.error || "Failed to schedule shifts. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      if (successes.length > 0) {
        setScheduledShiftInfo({
          clientName: formData.client || "Client",
          dspName: formData.assignedDsp || "DSP",
          duration: durationFromShiftRequests(finalShiftRequests),
          date: getDisplayDate(),
        });
        setShowSuccessModal(true);

        const response = await listShifts({
          limit: 100,
          agencyId: user?.agencyId || "",
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
        title: error?.response?.data?.code || "Scheduling Failed",
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
            <div className="flex items-center justify-between p-5 pb-0 shrink-0">
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
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-4">
                {/* Client Field */}
                <div className="flex flex-col gap-1 relative">
                  <label className="text-[12px] font-normal text-[#10141a]">Client</label>
                  <div className={`bg-white border rounded-xl h-11 px-4 flex items-center ${errors.client ? "border-[#D53411]" : "border-[#cccccd]"}`}>
                    <input
                      type="text"
                      value={formData.client}
                      onChange={(e) => {
                        const value = e.target.value;
                        dspVerifyTokenRef.current += 1;
                        setShowAssignDspDropdown(false);
                        setShowServiceDropdown(false);
                        setFormData((prev) => ({
                          ...prev,
                          client: value,
                          clientId: "",
                          clientLocation: null,
                          serviceCode: "",
                          serviceAuthorizationId: "",
                          assignedDsp: "",
                          assignedDspId: "",
                          billingRate: "",
                          ispOutcome: "",
                        }));
                        setSelectedClient(null);
                        setSelectedClientServices([]);
                        handleClientSearch(value);
                        clearError("client");
                        clearError("serviceCode");
                        clearError("assignedDsp");
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
                  {formData.clientId ? (
                    <span className="text-[12px] font-normal text-[#808081]">
                      Location:{" "}
                      {formatShiftLocation(formData.clientLocation) || "Not on file"}
                    </span>
                  ) : null}
                  {/* Client Dropdown */}
                  {showClientDropdown && clientSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-xl shadow-lg z-20 max-h-[200px] overflow-y-auto">
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
                          <p className="text-[12px] font-normal text-[#808081]">
                            {formatShiftLocation(getClientPrimaryAddress(client))}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Service */}
                <div className="flex flex-col gap-1 relative">
                  <label className="text-[12px] font-normal text-[#10141a]">Service</label>
                  <div ref={serviceDropdownRef} className="relative">
                    <button
                      type="button"
                      disabled={selectedClientServices.length === 0 || !hasAnySelectableService}
                      onClick={() => {
                        if (selectedClientServices.length === 0 || !hasAnySelectableService) return;
                        setShowClientDropdown(false);
                        setShowServiceDropdown((open) => !open);
                      }}
                      className={`flex h-11 w-full items-center gap-3 rounded-xl border bg-white px-4 ${
                        errors.serviceCode ? "border-[#D53411]" : "border-[#cccccd]"
                      } ${selectedClientServices.length === 0 || !hasAnySelectableService ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    >
                      <span className="min-w-0 flex-1 truncate text-left text-[14px] font-normal text-black">
                        {serviceTriggerLabel}
                      </span>
                      <ChevronDown className="h-5 w-5 shrink-0 text-[#10141a]" />
                    </button>
                    {showServiceDropdown && selectedClientServices.length > 0 ? (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-[200px] overflow-y-auto rounded-xl border border-[#cccccd] bg-white shadow-lg">
                        {selectedClientServices.map((service) => {
                          const authEnded = isServiceAuthorizationEndDatePast(service);
                          return (
                            <button
                              key={service.id}
                              type="button"
                              disabled={authEnded}
                              title={authEnded ? "Authorization period has ended" : undefined}
                              onClick={() => {
                                if (authEnded) return;
                                setShowServiceDropdown(false);
                                handleServiceRowChange(service.id);
                                clearError("serviceCode");
                              }}
                              className={`w-full border-b border-[#f0f0f0] px-4 py-3 text-left first:rounded-t-[12px] last:rounded-b-[12px] last:border-b-0 ${
                                authEnded
                                  ? "cursor-not-allowed opacity-50"
                                  : "cursor-pointer hover:bg-gray-50"
                              }`}
                            >
                              <p
                                className={`text-[14px] font-normal ${authEnded ? "text-[#808081]" : "text-black"}`}
                              >
                                {service.name ? `${service.name} — ${service.code}` : service.code}
                              </p>
                              <p className="text-[12px] font-normal text-[#808081]">
                                {formatServiceAuthorizationLabel(service)}
                                {authEnded ? " — Authorization ended" : ""}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  {errors.serviceCode && (
                    <span className="text-[12px] font-normal text-[#D53411]">{errors.serviceCode}</span>
                  )}
                  {selectedService ? (
                    <span className="text-[12px] font-normal text-[#808081]">
                      Authorization: {formatServiceAuthorizationDatesSummary(selectedService)}
                    </span>
                  ) : null}
                  {selectedService && (selectedService.clientRate || selectedService.clientPayType) && (
                    <span className="text-[12px] font-normal text-[#808081]">
                      Client billing rate:{" "}
                      {selectedService.clientRate ? `$${selectedService.clientRate}` : "Not set"}
                      {selectedService.clientPayType &&
                        ` • ${selectedService.clientPayType === "hourly"
                          ? "Hourly"
                          : selectedService.clientPayType === "15-min"
                            ? "15 minutes"
                            : selectedService.clientPayType === "daily"
                              ? "Daily"
                              : selectedService.clientPayType === "mile"
                                ? "Mile"
                                : selectedService.clientPayType
                        }`}
                    </span>
                  )}
                </div>

                {/* Assign DSP / Caregiver */}
                <div className="flex flex-col gap-1 relative">
                  <label className="text-[12px] font-normal text-[#10141a]">Assign {labels.noun}</label>
                  {!formData.serviceCode ? (
                    <>
                      <span className="text-[12px] font-normal text-[#808081]">
                        Select a service first to choose an assigned {labels.noun}.
                      </span>
                      {errors.assignedDsp ? (
                        <span className="text-[12px] font-normal text-[#D53411]">{errors.assignedDsp}</span>
                      ) : null}
                    </>
                  ) : selectedService?.assignedDsps && selectedService.assignedDsps.length > 0 ? (
                    <>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowAssignDspDropdown((open) => !open)}
                          className={`flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 ${errors.assignedDsp ? "border-[#D53411]" : "border-[#cccccd]"}`}
                        >
                          <span className="flex-1 text-left text-[14px] font-normal text-black">
                            {formData.assignedDsp || `Select ${labels.noun}`}
                          </span>
                          <ChevronDown className="h-5 w-5 shrink-0 text-[#10141a]" />
                        </button>
                        {showAssignDspDropdown ? (
                          <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-[200px] overflow-y-auto rounded-xl border border-[#cccccd] bg-white shadow-lg">
                            {selectedService.assignedDsps.map((dsp) => (
                              <button
                                key={dsp.id}
                                type="button"
                                onClick={() => {
                                  setShowAssignDspDropdown(false);
                                  handleAssignedDspRowSelect(dsp);
                                  clearError("assignedDsp");
                                }}
                                className="w-full cursor-pointer px-4 py-3 text-left text-[14px] font-normal text-[#10141a] first:rounded-t-[12px] last:rounded-b-[12px] hover:bg-gray-50"
                              >
                                {dsp.name}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      {errors.assignedDsp ? (
                        <span className="text-[12px] font-normal text-[#D53411]">{errors.assignedDsp}</span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <span className="text-[12px] font-normal text-[#808081]">
                        No {labels.plural} are assigned to this service on the client record. Assign staff in client management,
                        then schedule.
                      </span>
                      {errors.assignedDsp ? (
                        <span className="text-[12px] font-normal text-[#D53411]">{errors.assignedDsp}</span>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-1 relative">
                  <label className="text-[12px] font-normal text-[#10141a]">Notes Type</label>
                  <button
                    type="button"
                    disabled={notesAutoResolved}
                    onClick={() => {
                      if (notesAutoResolved) return;
                      setShowNotesTypeDropdown(!showNotesTypeDropdown);
                    }}
                    className={`bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center gap-3 ${
                      notesAutoResolved ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                    }`}
                  >
                    <span className="flex-1 text-left text-[14px] font-normal text-black">
                      {formData.notesType
                        ? getNoteTitle(formData.notesType)
                        : notesAutoResolved
                          ? "Auto-selected from service"
                          : "Select notes type"
                      }
                    </span>
                    {!notesAutoResolved && <ChevronDown className="w-5 h-5 text-[#10141a]" />}
                  </button>
                  {notesAutoResolved && (
                    <span className="text-[12px] font-normal text-[#808081]">
                      Automatically set from the selected service.
                    </span>
                  )}

                  {!notesAutoResolved && showNotesTypeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-xl shadow-lg z-10">
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

                {!isHhaClient && !isHhaAgencyMode && (
                <div className="flex flex-col gap-1 relative">
                  <label className="text-[12px] font-normal text-[#10141a]">Goals Type</label>
                  <button
                    onClick={() => {
                      setShowGoalsTypeDropdown(!showGoalsTypeDropdown);
                    }}
                    className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center gap-3 cursor-pointer"
                  >
                    <span className="flex-1 text-left text-[14px] font-normal text-black">
                      {formData.goalsType
                        ? goalsTypes.find((elt) => elt.id === formData.goalsType)?.title
                        : "Select goals type"
                      }
                    </span>
                    <ChevronDown className="w-5 h-5 text-[#10141a]" />
                  </button>

                  {showGoalsTypeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-xl shadow-lg z-10 max-h-[200px] overflow-y-auto">
                      {goalsTypes.map((goalsType) => (
                        <button
                          key={goalsType.id}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, goalsType: goalsType.id }));
                            setShowGoalsTypeDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left text-[14px] font-normal text-[#10141a] hover:bg-gray-50 first:rounded-t-[12px] last:rounded-b-[12px] cursor-pointer"
                        >
                          {goalsType.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                )}

                {showWeeklyDistributionPicker && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-normal text-[#10141a]">
                      Weekly distribution week
                    </label>
                    <select
                      value={
                        selectedWeeklyDistributionIndex === null
                          ? "manual"
                          : String(selectedWeeklyDistributionIndex)
                      }
                      onChange={(e) => handleWeeklyDistributionChange(e.target.value)}
                      className={`bg-white border rounded-xl h-11 px-4 text-[14px] font-normal text-[#10141a] ${
                        errors.weeklyDistribution || weeklyDistributionCapError
                          ? "border-[#D53411]"
                          : "border-[#b2b2b3]"
                      }`}
                    >
                      <option value="manual">Manual date range</option>
                      {weeklyDistributionOptions.map((option) => (
                        <option key={option.index} value={String(option.index)}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {weeklyDistributionStandardLine ? (
                      <span className="text-[12px] font-normal text-[#808081]">
                        {weeklyDistributionStandardLine}
                      </span>
                    ) : null}
                    {errors.weeklyDistribution || weeklyDistributionCapError ? (
                      <span className="text-[12px] font-normal text-[#D53411]">
                        {errors.weeklyDistribution ?? weeklyDistributionCapError}
                      </span>
                    ) : null}
                  </div>
                )}

                {/* Scheduling Type */}
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Scheduling Type</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, schedulingType: "one-time" }));
                        clearError("schedulingType");
                      }}
                      className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${formData.schedulingType === "one-time"
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
                      className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${formData.schedulingType === "recurring"
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
                        className={`bg-white border rounded-xl h-11 px-4 flex items-center gap-3 cursor-pointer ${errors.startDate ? "border-[#D53411]" : showStartDatePicker ? "border-[#2b82ff]" : "border-[#b2b2b3]"
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
                        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl border border-[#cccccd] z-10 overflow-hidden w-[320px]">
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
                        className={`bg-white border rounded-xl h-11 px-4 flex items-center gap-3 cursor-pointer ${errors.endDate ? "border-[#D53411]" : showEndDatePicker ? "border-[#2b82ff]" : "border-[#b2b2b3]"
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
                        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl border border-[#cccccd] z-10 overflow-hidden w-[320px]">
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
                      onClick={openOneTimeDatePicker}
                      className={`bg-white border rounded-xl h-11 px-4 flex items-center gap-3 cursor-pointer ${errors.date ? "border-[#D53411]" : showDatePicker ? "border-[#2b82ff]" : "border-[#b2b2b3]"
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
                      <div className="absolute top-full right-0 mt-1 bg-white rounded-xl border border-[#cccccd] z-10 overflow-hidden w-[320px]">
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
                                const isAllowed = isOneTimeDateInSnapshot(day, selectedDistributionSnapshot);

                                return (
                                  <button
                                    key={dayIndex}
                                    type="button"
                                    disabled={!isAllowed}
                                    onClick={() => isAllowed && handleDateSelect(day)}
                                    className={`
                                flex-1 flex items-center justify-center p-2 text-center transition-colors
                                ${!isAllowed
                                        ? "text-[#e0e0e0] cursor-not-allowed opacity-50"
                                        : "cursor-pointer"
                                      }
                                ${isSelected
                                        ? "bg-[#2B82FF] text-white rounded-[6px] font-semibold"
                                        : isAllowed && isCurrentMonth
                                          ? "text-[#10141a] font-medium hover:bg-[#e5e5e6] hover:rounded-[6px]"
                                          : isAllowed
                                            ? "text-[#b2b2b3] font-medium hover:bg-[#f0f0f0] hover:rounded-[6px]"
                                            : ""
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

                {/* Weekdays Selection */}
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Weekdays</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((weekday) => {
                      const isSelected = selectedWeekdays.some(w => w.dayIndex === weekday.dayIndex);
                      const isConfiguring = configuringWeekday?.dayIndex === weekday.dayIndex;
                      const isEnabled = enabledWeekdayIndices.has(weekday.dayIndex);
                      return (
                        <button
                          key={weekday.dayIndex}
                          type="button"
                          disabled={!isEnabled}
                          onClick={() => handleWeekdayToggle(weekday.label, weekday.dayIndex)}
                          className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium transition-colors ${
                            !isEnabled
                              ? "border border-[#e0e0e0] text-[#b2b2b3] cursor-not-allowed opacity-60"
                              : isSelected
                                ? "bg-[#00b4b8] text-white border-[0.5px] border-[#808081] cursor-pointer"
                                : isConfiguring
                                  ? "bg-[#ffa500] text-white border-[0.5px] border-[#ff8c00] cursor-pointer"
                                  : "border border-[#808081] text-[#10141a] cursor-pointer"
                          }`}
                        >
                          {weekday.label}
                        </button>
                      );
                    })}
                  </div>
                  {configuringWeekday && (
                    <p className="text-[12px] font-normal text-[#ffa500] mt-1">
                      Now select clock in and clock out times for {configuringWeekday.day}
                    </p>
                  )}
                </div>

                {/* Clock In Time */}
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Clock In Time</label>
                  <div className="flex flex-wrap gap-2">
                    {/* Custom time badge if selected time is not in predefined list */}
                    {formData.clockInTime && !clockInTimeOptions.includes(formData.clockInTime) && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-[#00b4b8] text-white">
                        <span className="text-[14px] font-medium">{formData.clockInTime}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, clockInTime: "" }));
                          }}
                          className="ml-1 hover:opacity-70 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {clockInTimeOptions.map((time, index) => (
                      <button
                        key={`${time}-${index}`}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, clockInTime: time }));
                          clearError("clockInTime");
                        }}
                        className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${formData.clockInTime === time
                          ? "bg-[#00b4b8] text-white"
                          : errors.clockInTime
                            ? "border border-[#D53411] text-[#10141a]"
                            : "border border-[#808081] text-[#10141a]"
                          }`}
                      >
                        {time}
                      </button>
                    ))}
                    <TimePicker
                      value={convertTo24Hour(formData.clockInTime)}
                      onChange={(time24h) => {
                        const time12h = convertTo12Hour(time24h);
                        setFormData(prev => ({ ...prev, clockInTime: time12h }));
                        clearError("clockInTime");
                      }}
                    >
                      <button
                        type="button"
                        className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${errors.clockInTime
                          ? "border border-[#D53411] text-[#10141a]"
                          : "border border-[#808081] text-[#10141a]"
                          }`}
                      >
                        Enter Time
                      </button>
                    </TimePicker>
                  </div>
                  {errors.clockInTime && (
                    <span className="text-[12px] font-normal text-[#D53411]">{errors.clockInTime}</span>
                  )}
                </div>

                {/* Clock Out Time */}
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Clock Out Time</label>
                  <div className="flex flex-wrap gap-2">
                    {/* Custom time badge if selected time is not in predefined list */}
                    {formData.clockOutTime && !clockOutTimeOptions.includes(formData.clockOutTime) && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-[#00b4b8] text-white">
                        <span className="text-[14px] font-medium">{formData.clockOutTime}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, clockOutTime: "" }));
                          }}
                          className="ml-1 hover:opacity-70 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {clockOutTimeOptions.map((time, index) => (
                      <button
                        key={`${time}-${index}`}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, clockOutTime: time }));
                          clearError("clockOutTime");
                        }}
                        className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${formData.clockOutTime === time
                          ? "bg-[#00b4b8] text-white"
                          : errors.clockOutTime
                            ? "border border-[#D53411] text-[#10141a]"
                            : "border border-[#808081] text-[#10141a]"
                          }`}
                      >
                        {time}
                      </button>
                    ))}
                    <TimePicker
                      value={convertTo24Hour(formData.clockOutTime)}
                      onChange={(time24h) => {
                        const time12h = convertTo12Hour(time24h);
                        setFormData(prev => ({ ...prev, clockOutTime: time12h }));
                        clearError("clockOutTime");
                      }}
                    >
                      <button
                        type="button"
                        className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${errors.clockOutTime
                          ? "border border-[#D53411] text-[#10141a]"
                          : "border border-[#808081] text-[#10141a]"
                          }`}
                      >
                        Enter Time
                      </button>
                    </TimePicker>
                  </div>
                  {errors.clockOutTime && (
                    <span className="text-[12px] font-normal text-[#D53411]">{errors.clockOutTime}</span>
                  )}
                </div>

                {/* Selected Weekdays Display */}
                {selectedWeekdays.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {selectedWeekdays.map((weekday) => (
                      <div
                        key={weekday.dayIndex}
                        className="flex items-center gap-2 h-[36px] px-2 rounded-lg bg-[rgba(0,216,65,0.08)] border-b border-[rgba(255,255,255,0.3)]"
                      >
                        <Clock className="w-5 h-5 text-[#00d841] shrink-0" />
                        <span className="text-[14px] font-medium leading-[1.4] text-[#10141a]">
                          {weekday.day} ( {weekday.clockInTime}-{weekday.clockOutTime} )
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {!isHhaClient ? (
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-normal text-[#10141a]">ISP Outcome</label>
                    <textarea
                      readOnly
                      rows={4}
                      value={ispOutcomeDisplay}
                      placeholder={
                        !formData.serviceCode
                          ? "Select a service to view ISP outcomes"
                          : ispOutcomeDisplay
                            ? ""
                            : "No ISP outcomes on file for this service"
                      }
                      className="w-full rounded-xl border border-[#e0e0e0] bg-[#f5f5f5] px-4 py-3 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none resize-none cursor-default min-h-[100px]"
                    />
                  </div>
                ) : null}

                {/* Plan of Care */}
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Plan of care</label>
                  {!pocDocument?.url && (
                    <label className="bg-white border border-[#cccccd] rounded-xl px-4 py-3 flex items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
                      <span className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent cursor-not-allowed">
                        No plan of care available
                      </span>
                    </label>
                  )}
                  {/* Client's POC Document Link */}
                  {pocDocument && pocDocument.url && (
                    <a
                      href={pocDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-[rgba(0,180,216,0.08)] border border-[rgba(0,180,216,0.2)] rounded-lg h-[36px] px-3 mt-1 hover:bg-[rgba(0,180,216,0.12)] transition-colors group"
                    >
                      <FileText className="w-4 h-4 text-[#00b4d8] group-hover:text-[#0096c7]" />
                      <span className="text-[13px] font-medium text-[#10141a] flex-1 truncate">
                        {pocDocument.fileName || pocDocument.title || "View Plan of Care"}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#00b4d8] group-hover:text-[#0096c7] shrink-0" />
                    </a>
                  )}
                  {/* Selected File Chip */}
                  {formData.planOfCare && (
                    <div className="flex items-center gap-2 bg-[rgba(0,216,65,0.08)] rounded-lg h-[36px] px-2 mt-1">
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
            <div className="flex gap-3 p-5 pt-0 shrink-0">
              <Button
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                variant="outline"
                className="flex-1 border-[#00B5B8] text-[#00B5B8] rounded-full px-4 py-3 h-auto text-[14px] font-semibold hover:bg-[#00B5B8]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !isFormValid || (mode === "edit" && formData.submissionStatus === SubmissionStatus.SUBMITTED)}
                className="flex-1 bg-[#00B5B8] hover:bg-[#00A0A4] text-white rounded-full px-4 py-3 h-auto text-[14px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
