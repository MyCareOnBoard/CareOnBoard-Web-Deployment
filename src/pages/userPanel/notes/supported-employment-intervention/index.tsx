import { noteServiceDate, noteEndDate } from '@/lib/notes/noteTypes';
import { useNoteOperation } from '@/lib/notes/useNoteOperation';
import { NoteFieldErrors, focusNoteError } from '@/pages/shared/notes/NoteFieldErrors';
import type { NoteFieldError } from '@/pages/userPanel/notes/apiTypes';
import React, {useEffect, useState, useRef} from "react";
import {Input} from "@/components/ui/input";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group";
import CalendarDaysIcon from "@/assets/icons/calendar-days.svg?react";
import InformationCircleIcon from "@/assets/icons/information-circle.svg?react";
import {format} from "date-fns";
import VoiceInputButton from "@/components/VoiceInputButton";
import VoiceEnabledTextarea from "@/components/VoiceEnabledTextarea";
import ContentEditableCell from "@/components/ContentEditableCell";
import TimePicker from "@/components/TimePicker";
import {VoiceRecordingProvider} from "@/contexts/VoiceRecordingContext";
import {Button} from "@/components/ui/button";
import {ArrowLeft} from "lucide-react";
import {Routes} from "@/routes/constants";
import {useLocation, useNavigate} from "react-router";
import {
  useCreateOrUpdateActivityLogMutation,
  useGetSingleActivityLogQuery,
  useSubmitActivityLogNotesMutation, useUpdateActivityLogMutation
} from "@/pages/userPanel/notes/api";
import {toast} from "sonner";
import {useAuth} from "@/utils/auth";

type InterventionRow = {
  id: string;
  training: string;
  employerVision: string;
  achievementPlan: string;
};

type ServiceRow = {
  id: string;
  datesOfSeServices: { date: Date | undefined; seProfessional: string };
  noOfHours: { start: string; end: string; total: string };
  servicesProvided: string;
  EmployeeProgress: string;
};

const initialServices = [
  {
    id: "",
    datesOfSeServices: {date: undefined, seProfessional: ""},
    noOfHours: {start: "", end: "", total: ""},
    servicesProvided: "",
    EmployeeProgress: ""
  },
  {
    id: "",
    datesOfSeServices: {date: undefined, seProfessional: ""},
    noOfHours: {start: "", end: "", total: ""},
    servicesProvided: "",
    EmployeeProgress: ""
  },
  {
    id: "",
    datesOfSeServices: {date: undefined, seProfessional: ""},
    noOfHours: {start: "", end: "", total: ""},
    servicesProvided: "",
    EmployeeProgress: ""
  },
  {
    id: "",
    datesOfSeServices: {date: undefined, seProfessional: ""},
    noOfHours: {start: "", end: "", total: ""},
    servicesProvided: "",
    EmployeeProgress: ""
  },
];
const initialInterventions = [
  {id: "", training: "", employerVision: "", achievementPlan: ""},
  {id: "", training: "", employerVision: "", achievementPlan: ""},
  {id: "", training: "", employerVision: "", achievementPlan: ""},
  {id: "", training: "", employerVision: "", achievementPlan: ""},
  {id: "", training: "", employerVision: "", achievementPlan: ""},
  {id: "", training: "", employerVision: "", achievementPlan: ""},
  {id: "", training: "", employerVision: "", achievementPlan: ""},
]

export default function SupportedEmploymentInterventionPage() {
  const id = new URLSearchParams(useLocation().search).get("id");
  return <SupportedEmploymentInterventionPageForm key={id} />;
}

function SupportedEmploymentInterventionPageForm() {
  const pageTitle = "Supported Employment Services – Intervention Plan and Service Log";
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [openServiceDateId, setOpenServiceDateId] = useState<string | null>(null);
  const {user} = useAuth();

  const navigate = useNavigate();

  const [interventions, setInterventions] = useState<InterventionRow[]>(initialInterventions);
  const interventionsRef = useRef(interventions);
  interventionsRef.current = interventions;
  const [services, setServices] = useState<ServiceRow[]>(initialServices);
  const servicesRef = useRef(services);
  servicesRef.current = services;

  const activityLogId = new URLSearchParams(useLocation().search).get("id");
  const operation = useNoteOperation();
  const submitting = useRef(false);
  const [flushing, setFlushing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<NoteFieldError[]>([]);
  const hydrated = useRef(false);
  const failedSaves = useRef(new Set<string>());
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [mutateNote] = useCreateOrUpdateActivityLogMutation();
  const [updateLogMutation] = useUpdateActivityLogMutation();
  const headerSave = useRef<Promise<unknown>>(Promise.resolve());
  const updateLog = (payload: Parameters<typeof updateLogMutation>[0]) => ({unwrap: () => {
    headerSave.current = headerSave.current.catch(() => {}).then(() => updateLogMutation(payload).unwrap());
    return headerSave.current;
  }});
  const [submitNotes, {isLoading: isSubmitting}] = useSubmitActivityLogNotesMutation();
  const {data: activityLog, isLoading} = useGetSingleActivityLogQuery(activityLogId!, {
    skip: !activityLogId
  });

  const [noteInfo, setNoteInfo] = useState<{
    jobType: string;
    ISPOutcome: string;
    totalHours: string;
    reportingStartDate: Date | null;
    reportingEndDate: Date | null;
  }>({
    jobType: "",
    ISPOutcome: "",
    totalHours: "",
    reportingStartDate: null,
    reportingEndDate: null,
  })

  const lockedIds = new Set([...submittedIds, ...(activityLog?.submittedNotes ?? []).map(note => note.id), ...(activityLog?.approvedNotes ?? []).map(note => note.id)]);
  const updateIntervention = (_id: string, index: number, field: keyof InterventionRow, value: any) => {
    if ((operation.pending || submitting.current) || lockedIds.has(interventionsRef.current[index].id)) return;
    interventionsRef.current = interventionsRef.current.map((item, i) => i === index ? {...item, [field]: value} : item);
    setInterventions(interventionsRef.current);
    const saveKey = `intervention:${index}`;
    saveChain.current = saveChain.current.catch(() => {}).then(async () => {
        failedSaves.current.add(saveKey);
        const current = interventionsRef.current[index];
        const {data} = await mutateNote({
        activityLog: activityLogId!,
        data: {
          id: current.id,
          startDate: activityLog?.serviceDate ?? format(new Date(), "yyyy-MM-dd"),
          endDate: activityLog?.serviceDate ?? format(new Date(), "yyyy-MM-dd"),
          metadata: {
            training: current.training,
            employerVision: current.employerVision,
            achievementPlan: current.achievementPlan,
            type: "intervention"
          },
          index
        }
      }).unwrap();
        failedSaves.current.delete(saveKey);
        if (!current.id && data?.id) {
          interventionsRef.current = interventionsRef.current.map((item, i) => i === index ? {...item, id: data.id} : item);
          setInterventions(interventionsRef.current);
        }
    });
    void saveChain.current.catch(() => toast.error('Your changes could not be saved. Try again before submitting.'));
  };

  const updateService = (_id: string, index: number, field: keyof ServiceRow, value: any) => {
    if ((operation.pending || submitting.current) || lockedIds.has(servicesRef.current[index].id)) return;
    servicesRef.current = servicesRef.current.map((item, i) => i === index ? (() => {
      const next = {...item, [field]: value};
      next.noOfHours = {...next.noOfHours, total: calculateHoursDifference(next.noOfHours.start, next.noOfHours.end, next.datesOfSeServices.date)};
      return next;
    })() : item);
    setServices(servicesRef.current);
    const saveKey = `service:${index}`;
    saveChain.current = saveChain.current.catch(() => {}).then(async () => {
        failedSaves.current.add(saveKey);
        const current = servicesRef.current[index];
        const date = current.datesOfSeServices.date;
        if (!(date)) return;
        const {data} = await mutateNote({
        activityLog: activityLogId!,
        data: {
          id: current.id,
          startDate: format(date, "yyyy-MM-dd"),
          endDate: noteEndDate(date, current.noOfHours.start, current.noOfHours.end, activityLog?.serviceDates),
          metadata: {
            seProfessional: current.datesOfSeServices.seProfessional,
            noOfHoursStart: current.noOfHours.start,
            noOfHoursEnd: current.noOfHours.end,
            noOfHoursTotal: current.noOfHours.total,
            servicesProvided: current.servicesProvided,
            EmployeeProgress: current.EmployeeProgress,
            type: "service"
          }
        }
      }).unwrap();
        failedSaves.current.delete(saveKey);
        if (!current.id && data?.id) {
          servicesRef.current = servicesRef.current.map((item, i) => i === index ? {...item, id: data.id} : item);
          setServices(servicesRef.current);
        }
    });
    void saveChain.current.catch(() => toast.error('Your changes could not be saved. Try again before submitting.'));
  };

  const formatDisplayDate = (date: Date | undefined) => {
    if (!date) {
      return "";
    }
    return format(date, "dd.MM.yy");
  };

  const calculateHoursDifference = (startTime: string, endTime: string, serviceDate?: Date): string => {
    if (!startTime || !endTime) {
      return "";
    }

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    const overnight = serviceDate && noteEndDate(serviceDate, startTime, endTime, activityLog?.serviceDates) !== format(serviceDate, "yyyy-MM-dd");
    const diffMinutes = endTotalMinutes - startTotalMinutes + (overnight ? 24 * 60 : 0);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (minutes === 0) {
      return String(hours);
    }
    return String(diffMinutes / 60);
  };

  const handleSubmit = async () => {
    if (submitting.current) return;
    submitting.current = true; setFlushing(true);
    try {
      await saveChain.current.catch(() => {});
      submitting.current = false;
      for (const key of [...failedSaves.current]) {
        const [kind, position] = key.split(':'); const index = Number(position);
        if (kind === 'service') updateService('', index, 'datesOfSeServices', servicesRef.current[index].datesOfSeServices);
        if (kind === 'intervention') updateIntervention('', index, 'training', interventionsRef.current[index].training);
      }
      submitting.current = true;
      await saveChain.current;
      await headerSave.current;
      if (failedSaves.current.size) throw new Error("Some rows have unsaved changes. Check their dates and try saving again before submitting.");
      const logNoteIds = [...interventionsRef.current, ...servicesRef.current].filter(row => row.id && !lockedIds.has(row.id)).map(row => row.id);
      if (!logNoteIds.length) { toast.error('Save a service row before submitting.'); return; }
      await operation.run({action: 'submit', resourceId: activityLogId!, noteIds: logNoteIds}, operationId => submitNotes({activityLog: activityLogId!, logNoteIds, operationId}).unwrap());
      setSubmittedIds(previous => [...previous, ...logNoteIds]);
      setFieldErrors([]);
      toast.success('Note submitted successfully!');
    } catch (error: any) {
      const errors = error?.data?.fieldErrors ?? [];
      setFieldErrors(errors);
      focusNoteError(errors);
      toast.error(error?.data?.message || error?.message || 'Failed to submit activity log.');
    } finally { submitting.current = false; setFlushing(false); }
  };

  const handleNoteInfoChange = (name: string, value: any) => {
    setNoteInfo((prevState) => {
      const updateNoteInfo = {
        ...prevState,
        [name]: value
      }

      const modifiedNoteInfo = {
        ...updateNoteInfo,
        reportingStartDate: updateNoteInfo?.reportingStartDate
          ? updateNoteInfo?.reportingStartDate?.toISOString()?.slice(0, 10)
          : "",
        reportingEndDate: updateNoteInfo?.reportingEndDate
          ? updateNoteInfo?.reportingEndDate?.toISOString()?.slice(0, 10)
          : ""
      }

      updateLog({
        activityLog: activityLogId!,
        data: modifiedNoteInfo
      }).unwrap().catch(error => {
        console.error('Failed to update activity log:', error);
      });

      return updateNoteInfo;
    })
  }

  useEffect(() => {
    if (isLoading || !activityLog || hydrated.current) return;
    hydrated.current = true;
    const notes = [...activityLog.notes, ...(activityLog.submittedNotes ?? []), ...(activityLog.approvedNotes ?? [])];
    const formattedInterventionNotes = notes.filter(note => note.metadata?.type === "intervention").map((note) => ({
          id: note.id,
          training: note.metadata?.training || "",
          employerVision: note.metadata?.employerVision || "",
          achievementPlan: note.metadata?.achievementPlan || "",
        }));
    interventionsRef.current = [...formattedInterventionNotes, ...initialInterventions.slice(formattedInterventionNotes.length)];
    setInterventions(interventionsRef.current);
    const formattedServiceNotes = notes.filter(note => note.metadata?.type === "service").map((note) => ({
          id: note.id,
          datesOfSeServices: {
            date: noteServiceDate(note.startDate),
            seProfessional: note.metadata?.seProfessional || "",
          },
          noOfHours: {
            start: note.metadata?.noOfHoursStart || "",
            end: note.metadata?.noOfHoursEnd || "",
            total: note.metadata?.noOfHoursTotal || ""
          },
          servicesProvided: note.metadata?.servicesProvided || "",
          EmployeeProgress: note.metadata?.EmployeeProgress || "",
        }));
    servicesRef.current = [...formattedServiceNotes, ...initialServices.slice(formattedServiceNotes.length)];
    setServices(servicesRef.current);
    if (!isLoading && activityLog && Object.keys(activityLog?.metadata)?.length > 0) {
      setNoteInfo({
        reportingStartDate: activityLog.metadata?.reportingStartDate
          ? new Date(activityLog.metadata?.reportingStartDate)
          : new Date(),
        reportingEndDate: activityLog.metadata?.reportingEndDate
          ? new Date(activityLog.metadata?.reportingEndDate)
          : new Date(),
        jobType: activityLog.metadata?.jobType,
        ISPOutcome: activityLog.metadata?.ISPOutcome,
        totalHours: activityLog.metadata?.totalHours,
      })
    }
  }, [isLoading, activityLog]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div
            className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
          <p className="text-sm text-[#808081]">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <VoiceRecordingProvider pageTitle={pageTitle}>
      <div className="min-h-[calc(100vh-200px)] pb-20">
        <NoteFieldErrors errors={fieldErrors} />
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif]">
            Notes
          </h1>
          <Button
            onClick={() => navigate(Routes.userPanel.notes.index)}
            className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm"
          >
            <ArrowLeft className="w-5 h-5"/>
            Back to Notes
          </Button>
        </div>

        {/* Department Information */}
        <div className="text-center mb-6 space-y-2">
          <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
            New Jersey Department of Human Services
          </p>
          <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
            Division of Developmental Disabilities
          </p>
          <a
            href="https://www.nj.gov/humanservice/add"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] font-normal leading-[1.4] text-[#2b82ff] hover:underline font-['Urbanist',sans-serif]"
          >
            www.nj.gov/humanservice/add
          </a>
        </div>

        {/* Form Title */}
        <h2
          className="text-[20px] font-semibold leading-[1.6] text-[#10141a] text-center mb-8 font-['Urbanist',sans-serif]">
          Supported Employment Services – Intervention Plan and Service Log ({activityLog?.metadata?.serviceCode})
        </h2>

        {/* Top Form Fields */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Name of Individual
            </label>
            <Input
              type="text"
              value={activityLog?.metadata?.individual ?? ""}
              disabled={true}
              className="h-11 bg-white border border-[#cccccd] rounded-xl px-4"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Employer
            </label>
            <Input
              type="text"
              value={user?.agency?.name ?? ""}
              disabled={true}
              className="h-11 bg-white border border-[#cccccd] rounded-xl px-4"
            />
          </div>
        </div>

        {/* Type of Job Section */}
        <div className="mb-6">
          <label
            className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
            Type of job (brief description of the work generally performed by the individual)
          </label>
          <VoiceEnabledTextarea
            value={noteInfo.jobType}
            className="min-h-[80px] bg-white border border-[#cccccd] rounded-xl px-4 py-3 resize-none"
            placeholder=""
            fieldName="Type of Job"
            onChange={(e) => handleNoteInfoChange("jobType", e)}
            pageTitle={pageTitle}
          />
        </div>

        {/* Applicable ISP Outcomes */}
        <div className="mb-6">
          <label
            className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
            Applicable ISP Outcome(s)
          </label>
          <VoiceEnabledTextarea
            value={noteInfo.ISPOutcome}
            className="min-h-[80px] bg-white border border-[#cccccd] rounded-xl px-4 py-3 resize-none"
            placeholder=""
            onChange={(e) => handleNoteInfoChange("ISPOutcome", e)}
            fieldName="Applicable ISP Outcomes"
            pageTitle={pageTitle}
          />
        </div>

        {/* Hours and Reporting Period Row */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Total Hours of SE Services
            </label>
            <Input
              type="text"
              value={noteInfo.totalHours}
              onChange={(e) => handleNoteInfoChange("totalHours", e.target.value)}
              className="h-11 bg-white border border-[#cccccd] rounded-xl px-4"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Reporting Period Start Date
            </label>
            <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="w-full focus:outline-none">
                  <InputGroup className="h-11 bg-white border border-[#cccccd] rounded-xl px-4">
                    <InputGroupInput
                      value={noteInfo.reportingStartDate ? format(noteInfo.reportingStartDate, "MMMM d, yyyy") : ""}
                      placeholder="Select date"
                      className="text-[#10141a] border-0 bg-transparent"
                    />
                    <InputGroupAddon align="inline-end">
                      <CalendarDaysIcon className="h-5 w-5 text-[#808081]"/>
                    </InputGroupAddon>
                  </InputGroup>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
                <Calendar
                  mode="single"
                  className="bg-white"
                  captionLayout="dropdown"
                  defaultMonth={noteInfo.reportingStartDate ?? new Date()}
                  startMonth={new Date(1924, 0)}
                  endMonth={new Date()}
                  selected={noteInfo.reportingStartDate ?? undefined}
                  onSelect={(selectedDate) => {
                    if (selectedDate) {
                      handleNoteInfoChange("reportingStartDate", selectedDate);
                      setIsStartDateOpen(false);
                    }
                  }}
                  formatters={{
                    formatMonthDropdown: (date) =>
                      date.toLocaleString("default", {month: "long"}),
                  }}
                  classNames={{
                    dropdown_root: "relative border-none shadow-none has-focus:ring-0",
                    caption_label: "rounded-md pl-2 pr-2 flex items-center gap-1 text-sm h-8 [&>svg]:hidden",
                  }}
                  autoFocus={true}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Reporting Period End Date
            </label>
            <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="w-full focus:outline-none">
                  <InputGroup className="h-11 bg-white border border-[#cccccd] rounded-xl px-4">
                    <InputGroupInput
                      value={noteInfo.reportingEndDate ? format(noteInfo.reportingEndDate, "MMMM d, yyyy") : ""}
                      placeholder="Select date"
                      className="text-[#10141a] border-0 bg-transparent"
                    />
                    <InputGroupAddon align="inline-end">
                      <CalendarDaysIcon className="h-5 w-5 text-[#808081]"/>
                    </InputGroupAddon>
                  </InputGroup>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
                <Calendar
                  mode="single"
                  className="bg-white"
                  captionLayout="dropdown"
                  startMonth={new Date(1924, 0)}
                  endMonth={new Date()}
                  selected={noteInfo.reportingEndDate ?? new Date()}
                  defaultMonth={noteInfo.reportingEndDate ?? new Date()}
                  onSelect={(selectedDate) => {
                    if (selectedDate) {
                      handleNoteInfoChange("reportingEndDate", selectedDate);
                      setIsEndDateOpen(false);
                    }
                  }}
                  formatters={{
                    formatMonthDropdown: (date) =>
                      date.toLocaleString("default", {month: "long"}),
                  }}
                  classNames={{
                    dropdown_root: "relative border-none shadow-none has-focus:ring-0",
                    caption_label: "rounded-md pl-2 pr-2 flex items-center gap-1 text-sm h-8 [&>svg]:hidden",
                  }}
                  autoFocus={true}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Completed By Row */}
        <div className="mb-6 flex flex-col gap-1">
          <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
            Completed By:
          </label>
          <Input
            type="text"
            value={user?.fullName ?? ""}
            disabled={true}
            className="h-11 bg-white border border-[#cccccd] rounded-xl px-4 w-full"
          />
        </div>

        {/* Intervention Plan Table */}
        <div className="overflow-x-auto mb-6">
          <div className="w-full min-w-[1163px]">
            {/* Table Header */}
            <div className="border border-[#b2b2b3] rounded-tl-[2px] rounded-tr-[2px] overflow-hidden">
              <div className="border-b border-[#b2b2b3] bg-[#eef4f5] min-h-[71px]">
                <div className="grid grid-cols-3 gap-0 h-full">
                  <div
                    className="relative px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="absolute top-2 right-2 h-4 w-4 cursor-pointer">
                          <InformationCircleIcon className="h-4 w-4 text-[#10141a]"/>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="center"
                        side="top"
                        className="bg-white rounded-[6px] px-4 py-3 shadow-lg border-none w-[250px]"
                        sideOffset={5}
                      >
                        <p className="text-[10px] font-normal leading-[1.6] text-black font-['Urbanist',sans-serif]">
                          What is the standard required?
                        </p>
                      </PopoverContent>
                    </Popover>
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                      What is the standard required?
                    </p>
                  </div>
                  <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                      How does the employee currently perform the tasks, actions, areas related to these standards?
                    </p>
                  </div>
                  <div className="relative px-4 py-3 flex items-center justify-center text-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="absolute top-2 right-2 h-4 w-4 cursor-pointer">
                          <InformationCircleIcon className="h-4 w-4 text-[#10141a]"/>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="center"
                        side="top"
                        className="bg-white rounded-[6px] px-4 py-3 shadow-lg border-none w-[250px]"
                        sideOffset={5}
                      >
                        <p className="text-[10px] font-normal leading-[1.6] text-black font-['Urbanist',sans-serif]">
                          What is being done to address the identified issues?
                        </p>
                      </PopoverContent>
                    </Popover>
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                      What is being done to address the identified issues?
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="border border-[#b2b2b3] rounded-bl-[2px] rounded-br-[2px] border-t-0">
              <div className="bg-[#eef4f5]">
                {interventions.map((intervention, index) => (
                  <div
                    key={`intervention-${index}`}
                    data-note-id={intervention.id}
                    className={`grid grid-cols-3 gap-0 min-h-[71px] transition-colors ${
                      index < interventions.length - 1 ? 'border-b border-[#b2b2b3]' : ''
                    } hover:bg-white`}
                  >
                    {/* Standard Required */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell fieldKey="training"
                        readOnly={lockedIds.has(intervention.id) || operation.pending || flushing}
                        value={intervention.training}
                        onChange={(value) => updateIntervention(intervention.id, index, 'training', value)}
                        fieldName="What is the standard required?"
                        pageTitle={pageTitle}
                      />
                    </div>
                    {/* Employee Performance */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell fieldKey="employerVision"
                        readOnly={lockedIds.has(intervention.id) || operation.pending || flushing}
                        value={intervention.employerVision}
                        onChange={(value) => updateIntervention(intervention.id, index, 'employerVision', value)}
                        fieldName="How does the employee currently perform the tasks, actions, areas related to these standards?"
                        pageTitle={pageTitle}
                      />
                    </div>
                    {/* Addressing Issues */}
                    <div className="px-4 py-3 flex items-center justify-center">
                      <ContentEditableCell fieldKey="achievementPlan"
                        readOnly={lockedIds.has(intervention.id) || operation.pending || flushing}
                        value={intervention.achievementPlan}
                        onChange={(value) => updateIntervention(intervention.id, index, 'achievementPlan', value)}
                        fieldName="What is being done to address the identified issues?"
                        pageTitle={pageTitle}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* First Table Footer */}
        <div className="flex items-center justify-between mt-4 mb-12">
          <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
            NJ Division of Developmental Disabilities
          </p>
          <p className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
            June 19th
          </p>
        </div>

        {/* Service Log Table */}
        <div className="overflow-x-auto mb-6">
          <div className="w-full min-w-[1163px]">
            {/* Table Header */}
            <div className="border border-[#b2b2b3] rounded-tl-[2px] rounded-tr-[2px] overflow-hidden">
              <div className="border-b border-[#b2b2b3] bg-[#eef4f5] min-h-[71px]">
                <div className="grid grid-cols-4 gap-0 h-full">
                  <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                      Dates of SE Services
                    </p>
                  </div>
                  <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                      # No of Hours
                    </p>
                  </div>
                  <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                      What SE services were provided during this visit?
                    </p>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center text-center">
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                      How is the employee progressing toward his/her outcomes and meeting the standards that have been
                      identified above?
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="border border-[#b2b2b3] rounded-bl-[2px] rounded-br-[2px] border-t-0 overflow-hidden">
              <table className="w-full bg-[#eef4f5]" style={{borderCollapse: 'collapse'}}>
                <tbody>
                {services.map((service, index) => (
                  <React.Fragment key={`services-${index}`}>
                    <tr data-note-id={service.id} className="hover:bg-white transition-colors grid grid-cols-4 gap-0 min-w-[1163px] h-full">
                      <td className={`border-r ${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]  `}>
                        <tr className="flex flex-col min-h-[147px]">
                          <td className="border-b border-[#b2b2b3] flex">
                            <div className="bg-[#D9D9D9] w-[80px] h-[49px] flex items-center justify-center">Date:</div>
                            <div className="flex-1 flex items-center justify-center">
                              <Popover
                                open={openServiceDateId === String(index)}
                                onOpenChange={(open) => { if (!lockedIds.has(service.id) && !operation.pending) setOpenServiceDateId(open ? String(index) : null); }}
                              >
                                <PopoverTrigger asChild>
                                  <button data-note-field="startDate" disabled={lockedIds.has(service.id) || flushing}
                                    type="button"
                                    className="w-full h-full flex items-center justify-center focus:outline-none cursor-pointer"
                                  >
                                      <span
                                        className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                                        {formatDisplayDate(service.datesOfSeServices.date)}
                                      </span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent align="start"
                                                className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
                                  <Calendar
                                    mode="single"
                                    className="bg-white"
                                    captionLayout="dropdown"
                                    startMonth={new Date(1924, 0)}
                                    endMonth={new Date()}
                                    selected={service.datesOfSeServices.date}
                                    defaultMonth={service.datesOfSeServices.date ?? new Date()}
                                    disabled={{
                                      after: new Date()
                                    }}
                                    onSelect={async (date) => {
                                      if (date) {
                                        await updateService(service.id, index, 'datesOfSeServices', {
                                          ...service.datesOfSeServices,
                                          date: date
                                        });
                                        setOpenServiceDateId(null);
                                      }
                                    }}
                                    formatters={{
                                      formatMonthDropdown: (date) =>
                                        date.toLocaleString("default", {month: "long"}),
                                    }}
                                    classNames={{
                                      dropdown_root: "relative border-none shadow-none has-focus:ring-0",
                                      caption_label: "rounded-md pl-2 pr-2 flex items-center gap-1 text-sm h-8 [&>svg]:hidden",
                                    }}
                                    autoFocus={true}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </td>
                          <td>
                            <span className="pt-4 ps-5">SE Professional:</span>
                            <ContentEditableCell fieldKey="seProfessional"
                        readOnly={lockedIds.has(service.id) || operation.pending || flushing}
                              value={service.datesOfSeServices.seProfessional}
                              onChange={(value) => updateService(service.id, index, 'datesOfSeServices', {
                                ...service.datesOfSeServices,
                                seProfessional: value
                              })}
                              fieldName="SE Professional"
                              pageTitle={pageTitle}
                            /></td>
                        </tr>
                      </td>
                      <td className={`border-r ${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]`}>
                        {Object.entries(service.noOfHours).map(([key, value]) => (
                          <tr key={key} data-note-field={`noOfHours${key[0].toUpperCase()}${key.slice(1)}`} className="flex flex-col h-[49px]">
                            <td className="border-b border-[#b2b2b3] h-[49px] flex">
                              <div
                                className="bg-[#D9D9D9] w-[80px] h-full flex items-center justify-end pe-5 capitalize">{key}:
                              </div>
                              <div className="flex-1 flex items-center justify-center">
                                {key === 'start' || key === 'end' ? (
                                  <TimePicker disabled={lockedIds.has(service.id) || operation.pending || flushing}
                                    value={value}
                                    onChange={async (newValue) => {
                                      const updatedHours = {...service.noOfHours, [key]: newValue};
                                      // Auto-calculate total if both start and end are set
                                      if (key === 'start' && updatedHours.end) {
                                        updatedHours.total = calculateHoursDifference(newValue, updatedHours.end, service.datesOfSeServices.date);
                                      } else if (key === 'end' && updatedHours.start) {
                                        updatedHours.total = calculateHoursDifference(updatedHours.start, newValue, service.datesOfSeServices.date);
                                      }
                                      await updateService(service.id, index, 'noOfHours', updatedHours);
                                    }}
                                  />
                                ) : (
                                  <span
                                    className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                                      {value}
                                    </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </td>
                      <td className={`border-r ${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]`}>
                        <div className="flex items-center justify-center min-h-[147px]">
                          <ContentEditableCell fieldKey="servicesProvided" readOnly={lockedIds.has(service.id) || operation.pending || flushing}
                            value={service.servicesProvided}
                            onChange={(value) => updateService(service.id, index, 'servicesProvided', value)}
                            fieldName="What SE services were provided during this visit?"
                            pageTitle={pageTitle}
                          />
                        </div>
                      </td>
                      <td className={`border-r ${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]`}>
                        <div className="flex items-center justify-center min-h-[147px]">
                          <ContentEditableCell fieldKey="EmployeeProgress" readOnly={lockedIds.has(service.id) || operation.pending || flushing}
                            value={service.EmployeeProgress}
                            onChange={(value) => updateService(service.id, index, 'EmployeeProgress', value)}
                            fieldName="How is the employee progressing toward his/her outcomes and meeting the standards that have been identified above?"
                            pageTitle={pageTitle}
                          />
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Second Table Footer */}
        <div className="flex items-center justify-between mt-4 mb-8">
          <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
            NJ Division of Developmental Disabilities
          </p>
          <p className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
            June 1997
          </p>
        </div>
        <div className={"flex justify-end mt-3"}>
          <Button
            type={"button"}
            onClick={handleSubmit}
            disabled={isSubmitting || operation.pending || flushing}
            className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm"
          >
            {isSubmitting ? "Submitting..." : "Submit Both Tables"}
          </Button>
        </div>

        {/* Floating Action Button */}
        <VoiceInputButton />
      </div>
    </VoiceRecordingProvider>
  );
}

