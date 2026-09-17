import { noteServiceDate, noteEndDate } from '@/lib/notes/noteTypes';
import { useNoteOperation } from '@/lib/notes/useNoteOperation';
import { NoteFieldErrors, focusNoteError } from '@/pages/shared/notes/NoteFieldErrors';
import type { NoteFieldError } from '@/pages/userPanel/notes/apiTypes';
import React, {useEffect, useState, useRef} from "react";
import {Input} from "@/components/ui/input";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import CalendarDaysIcon from "@/assets/icons/calendar-days.svg?react";
import {format} from "date-fns";
import VoiceInputButton from "@/components/VoiceInputButton";
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

type ServiceRow = {
  id: string;
  datesOfSeServices: { date: Date | undefined; seProfessional: string };
  noOfHours: { start: string; end: string; total: string };
  activityConducted: string;
  whatWasDone: string;
  howDidThisAssist: string;
};

const activityOptions = [
  "Job search assistance",
  "Resume development",
  "Interview preparation",
  "Career counseling",
  "Skills assessment",
  "Job shadowing",
  "Networking events",
  "Application completion",
  "Portfolio development",
  "Reference gathering",
  "Transportation planning",
  "Workplace tour",
  "Job placement support",
  "Employer meeting",
  "Benefits counseling",
];

const initialServices: ServiceRow[] = [
  {
    id: "",
    datesOfSeServices: {date: undefined, seProfessional: ""},
    noOfHours: {start: "", end: "", total: ""},
    activityConducted: "",
    whatWasDone: "",
    howDidThisAssist: ""
  },
  {
    id: "",
    datesOfSeServices: {date: undefined, seProfessional: ""},
    noOfHours: {start: "", end: "", total: ""},
    activityConducted: "",
    whatWasDone: "",
    howDidThisAssist: ""
  },
  {
    id: "",
    datesOfSeServices: {date: undefined, seProfessional: ""},
    noOfHours: {start: "", end: "", total: ""},
    activityConducted: "",
    whatWasDone: "",
    howDidThisAssist: ""
  },
  {
    id: "",
    datesOfSeServices: {date: undefined, seProfessional: ""},
    noOfHours: {start: "", end: "", total: ""},
    activityConducted: "",
    whatWasDone: "",
    howDidThisAssist: ""
  },
]

export default function SupportedEmploymentPrePage() {
  const id = new URLSearchParams(useLocation().search).get("id");
  return <SupportedEmploymentPrePageForm key={id} />;
}

function SupportedEmploymentPrePageForm() {
  const pageTitle = "Supported Employment Services – Pre-Employment Service Log";
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [openServiceDateId, setOpenServiceDateId] = useState<string | null>(null);
  const {user} = useAuth();

  const navigate = useNavigate();
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

  const [services, setServices] = useState<ServiceRow[]>(initialServices);
  const servicesRef = useRef(services);
  servicesRef.current = services;
  const [noteInfo, setNoteInfo] = useState<{
    totalHours: string;
    reportingStartDate: Date | null;
    reportingEndDate: Date | null;
  }>({
    totalHours: "",
    reportingStartDate: null,
    reportingEndDate: null,
  })


  const lockedIds = new Set([...submittedIds, ...(activityLog?.submittedNotes ?? []).map(note => note.id), ...(activityLog?.approvedNotes ?? []).map(note => note.id)]);
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
            activityConducted: current.activityConducted,
            whatWasDone: current.whatWasDone,
            howDidThisAssist: current.howDidThisAssist
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
      }
      submitting.current = true;
      await saveChain.current;
      await headerSave.current;
      if (failedSaves.current.size) throw new Error("Some rows have unsaved changes. Check their dates and try saving again before submitting.");
      const logNoteIds = [...servicesRef.current].filter(row => row.id && !lockedIds.has(row.id)).map(row => row.id);
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
    const formattedNotes = notes.map((note) => ({
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
          activityConducted: note.metadata?.activityConducted || "",
          whatWasDone: note.metadata?.whatWasDone || "",
          howDidThisAssist: note.metadata?.howDidThisAssist || ""
        }));
    servicesRef.current = [...formattedNotes, ...initialServices.slice(formattedNotes.length)];
    setServices(servicesRef.current);
    if (!isLoading && activityLog && Object.keys(activityLog?.metadata)?.length > 0) {
      setNoteInfo({
        reportingStartDate: activityLog.metadata?.reportingStartDate
          ? new Date(activityLog.metadata?.reportingStartDate)
          : new Date(),
        reportingEndDate: activityLog.metadata?.reportingEndDate
          ? new Date(activityLog.metadata?.reportingEndDate)
          : new Date(),
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
          {pageTitle} ({activityLog?.metadata?.serviceCode})
        </h2>

        {/* Top Form Fields */}
        <div className="mb-6 flex flex-col gap-1">
          <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
            Name of Individual
          </label>
          <Input
            type="text"
            value={activityLog?.metadata?.individual || ""}
            disabled={true}
            className="h-11 bg-white border border-[#cccccd] rounded-xl px-4"
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
              value={noteInfo?.totalHours}
              onChange={(event) => handleNoteInfoChange("totalHours", event.target.value)}
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
                      value={noteInfo?.reportingStartDate
                        ? format(noteInfo?.reportingStartDate, "MMMM d, yyyy")
                        : ""
                      }
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
                  selected={noteInfo?.reportingStartDate ? new Date(noteInfo?.reportingStartDate) : undefined}
                  defaultMonth={noteInfo?.reportingStartDate ?? new Date()}
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
                      value={noteInfo?.reportingEndDate
                        ? format(noteInfo?.reportingEndDate, "MMMM d, yyyy")
                        : ""
                      }
                      placeholder="Select date"
                      readOnly
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
                  selected={noteInfo?.reportingEndDate
                    ? new Date(noteInfo?.reportingEndDate)
                    : undefined}
                  defaultMonth={noteInfo?.reportingEndDate ?? new Date()}
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

        {/* Service Log Table */}
        <div className="overflow-x-auto mb-6">
          <div className="w-full min-w-[1163px]">
            {/* Table Header */}
            <div className="border border-[#b2b2b3] rounded-tl-[2px] rounded-tr-[2px] overflow-hidden">
              <div className="border-b border-[#b2b2b3] bg-[#eef4f5] min-h-[71px]">
                <div className="grid grid-cols-5 gap-0 h-full">
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
                      Activity Conducted
                    </p>
                  </div>
                  <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                      What was done related to the activity
                    </p>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center text-center">
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                      How did this activity assist the job seeker in progressing toward his/her outcomes?
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
                  <React.Fragment key={index}>
                    <tr data-note-id={service.id} className="hover:bg-white transition-colors grid grid-cols-5 gap-0 min-w-[1163px] h-full">
                      <td className={`border-r ${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]`}>
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
                            />
                          </td>
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
                                    onChange={(newValue) => {
                                      const updatedHours = {...service.noOfHours, [key]: newValue};
                                      // Auto-calculate total if both start and end are set
                                      if (key === 'start' && updatedHours.end) {
                                        updatedHours.total = calculateHoursDifference(newValue, updatedHours.end, service.datesOfSeServices.date);
                                      } else if (key === 'end' && updatedHours.start) {
                                        updatedHours.total = calculateHoursDifference(updatedHours.start, newValue, service.datesOfSeServices.date);
                                      }
                                      updateService(service.id, index, 'noOfHours', updatedHours);
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
                        <div className="flex items-center justify-center min-h-[147px] px-4">
                          <Select disabled={lockedIds.has(service.id) || operation.pending || flushing}
                            value={service.activityConducted}
                            onValueChange={(value) => updateService(service.id, index, 'activityConducted', value)}
                          >
                            <SelectTrigger data-note-field="activityConducted" className="w-full h-11 bg-white border border-[#cccccd] rounded-xl">
                              <SelectValue placeholder="Please select"/>
                            </SelectTrigger>
                            <SelectContent>
                              {activityOptions.map((activity) => (
                                <SelectItem key={activity} value={activity}>
                                  {activity}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className={`border-r ${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]`}>
                        <div className="flex items-center justify-center min-h-[147px]">
                          <ContentEditableCell fieldKey="whatWasDone" readOnly={lockedIds.has(service.id) || operation.pending || flushing}
                            value={service.whatWasDone}
                            onChange={(value) => updateService(service.id, index, 'whatWasDone', value)}
                            fieldName="What was done related to the activity"
                            pageTitle={pageTitle}
                          />
                        </div>
                      </td>
                      <td className={`${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]`}>
                        <div className="flex items-center justify-center min-h-[147px]">
                          <ContentEditableCell fieldKey="howDidThisAssist" readOnly={lockedIds.has(service.id) || operation.pending || flushing}
                            value={service.howDidThisAssist}
                            onChange={(value) => updateService(service.id, index, 'howDidThisAssist', value)}
                            fieldName="How did this activity assist the job seeker"
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

        {/* Table Footer */}
        <div className="flex items-center justify-between mt-4 mb-8">
          <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
            NJ Division of Developmental Disabilities
          </p>
          <p className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
            June 1991
          </p>
        </div>
        <div className={"flex justify-end mt-3"}>
          <Button
            type={"button"}
            onClick={handleSubmit}
            disabled={isSubmitting || operation.pending || flushing}
            className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>

        {/* Floating Action Button */}
        <VoiceInputButton minimal={false} />
      </div>
    </VoiceRecordingProvider>
  );
}

