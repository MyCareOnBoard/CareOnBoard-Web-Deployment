import React, {useEffect, useState} from "react";
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
import {useDebounce} from "@/hooks/useDebounce";
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
  const pageTitle = "Supported Employment Services – Pre-Employment Service Log";
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [openServiceDateId, setOpenServiceDateId] = useState<string | null>(null);
  const {user} = useAuth();

  const navigate = useNavigate();
  const activityLogId = new URLSearchParams(useLocation().search).get("id");
  const [mutateNote] = useCreateOrUpdateActivityLogMutation();
  const [updateLog] = useUpdateActivityLogMutation();
  const [submitNotes, {isLoading: isSubmitting}] = useSubmitActivityLogNotesMutation();
  const {data: activityLog, isLoading} = useGetSingleActivityLogQuery(activityLogId!, {
    skip: !activityLogId
  });

  const [services, setServices] = useState<ServiceRow[]>(initialServices);
  const [noteInfo, setNoteInfo] = useState<{
    totalHours: string;
    reportingStartDate: Date | null;
    reportingEndDate: Date | null;
  }>({
    totalHours: "",
    reportingStartDate: null,
    reportingEndDate: null,
  })

  const debouncedMutateNote = useDebounce(
    async (params: any) => {
      await mutateNote(params).unwrap().catch(error => {      });
    },
    500
  );

  const debounceUpdateNote = useDebounce(
    async (params: any) => {
      await updateLog(params).unwrap().catch(error => {      });
    },
    500
  )


  const updateService = async (
    id: string,
    index: number,
    field: keyof ServiceRow,
    value: any
  ) => {
    setServices((prevServices) => {
      return prevServices.map((service, activityIndex) => {
        if ((id && service.id === id) || (index === activityIndex)) {
          return {...service, [field]: value}
        } else {
          return service
        }
      })
    });


    const currentServices = services;

    let service;
    if (id) {
      service = currentServices.find(service => service.id === id);
    } else {
      service = currentServices[index];
    }

    if (!service) return;

    const newService = {
      ...service,
      [field]: value
    };

    const date = newService.datesOfSeServices.date;

    if (date && id === "") {
      await mutateNote({
        activityLog: activityLogId!,
        data: {
          id: id,
          startDate: format(date, "yyyy-MM-dd"),
          endDate: format(date, "yyyy-MM-dd"),
          metadata: {
            seProfessional: newService.datesOfSeServices.seProfessional,
            noOfHoursStart: newService.noOfHours.start,
            noOfHoursEnd: newService.noOfHours.end,
            noOfHoursTotal: newService.noOfHours.total,
            activityConducted: newService.activityConducted,
            whatWasDone: newService.whatWasDone,
            howDidThisAssist: newService.howDidThisAssist
          }
        }
      }).unwrap();
    } else if (date && id !== "") {
      debouncedMutateNote({
        activityLog: activityLogId!,
        data: {
          id: id,
          startDate: format(date, "yyyy-MM-dd"),
          endDate: format(date, "yyyy-MM-dd"),
          metadata: {
            seProfessional: newService.datesOfSeServices.seProfessional,
            noOfHoursStart: newService.noOfHours.start,
            noOfHoursEnd: newService.noOfHours.end,
            noOfHoursTotal: newService.noOfHours.total,
            activityConducted: newService.activityConducted,
            whatWasDone: newService.whatWasDone,
            howDidThisAssist: newService.howDidThisAssist
          }
        }
      });
    }
  };

  const formatDisplayDate = (date: Date | undefined) => {
    if (!date) {
      return "";
    }
    return format(date, "dd.MM.yy");
  };

  const calculateHoursDifference = (startTime: string, endTime: string): string => {
    if (!startTime || !endTime) {
      return "";
    }

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    const diffMinutes = endTotalMinutes - startTotalMinutes;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const handleSubmit = async () => {
    try {
      if (!noteInfo.totalHours || !noteInfo.totalHours.trim()) {
        toast.error('Please fill in the "Total Hours of SE Services" field');
        return;
      }

      if (!noteInfo.reportingStartDate) {
        toast.error('Please select the "Reporting Period Start Date"');
        return;
      }

      if (!noteInfo.reportingEndDate) {
        toast.error('Please select the "Reporting Period End Date"');
        return;
      }

      const errors = services.filter((service) => !service.id);
      if (errors.length > 0) {
        toast.error(`Please fill in all required fields for these dates ${errors.map(service => service.datesOfSeServices.date).toString()}`);
        return;
      }
      await submitNotes({
        activityLog: activityLogId!,
        logNoteIds: services.map((service) => service.id)
      }).unwrap();
      setServices(initialServices);
      toast.success('Note submitted successfully!');
    } catch (error: any) {      toast.error(error?.data?.message || 'Failed to submit activity log.');
    }
  }

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

      if (["jobType", "ISPOutcome", "totalHours"].includes(name)) {
        debounceUpdateNote({
          activityLog: activityLogId!,
          data: modifiedNoteInfo
        })
      } else {
        updateLog({
          activityLog: activityLogId!,
          data: modifiedNoteInfo
        }).unwrap();
      }

      return updateNoteInfo;
    })
  }

  useEffect(() => {
    if (!isLoading && activityLog && activityLog.notes.length > 0) {
      if (services.some((service) => service.id)) {
        const newServices = services.map((service, index) => {
          if (!service.id) {
            if (activityLog.notes.length > index) {
              service.id = activityLog.notes[index].id;
            }
          }
          return service;
        });
        setServices(newServices);
      } else {
        const formattedNotes = activityLog.notes.map((note) => ({
          id: note.id,
          datesOfSeServices: {
            date: new Date(note.startDate),
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
        setServices([
          ...formattedNotes,
          ...initialServices.slice(formattedNotes.length)
        ]);
      }
    }

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
  }, [isLoading, activityLog])

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
            className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4"
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
              className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Reporting Period Start Date
            </label>
            <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="w-full focus:outline-none">
                  <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
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
                  <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
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
            className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4 w-full"
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
                    <tr className="hover:bg-white transition-colors grid grid-cols-5 gap-0 min-w-[1163px] h-full">
                      <td className={`border-r ${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]`}>
                        <tr className="flex flex-col min-h-[147px]">
                          <td className="border-b border-[#b2b2b3] flex">
                            <div className="bg-[#D9D9D9] w-[80px] h-[49px] flex items-center justify-center">Date:</div>
                            <div className="flex-1 flex items-center justify-center">
                              <Popover
                                open={openServiceDateId === String(index)}
                                onOpenChange={(open) => setOpenServiceDateId(open ? String(index) : null)}
                              >
                                <PopoverTrigger asChild>
                                  <button
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
                            <ContentEditableCell
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
                          <tr key={key} className="flex flex-col h-[49px]">
                            <td className="border-b border-[#b2b2b3] h-[49px] flex">
                              <div
                                className="bg-[#D9D9D9] w-[80px] h-full flex items-center justify-end pe-5 capitalize">{key}:
                              </div>
                              <div className="flex-1 flex items-center justify-center">
                                {key === 'start' || key === 'end' ? (
                                  <TimePicker
                                    value={value}
                                    onChange={(newValue) => {
                                      const updatedHours = {...service.noOfHours, [key]: newValue};
                                      // Auto-calculate total if both start and end are set
                                      if (key === 'start' && updatedHours.end) {
                                        updatedHours.total = calculateHoursDifference(newValue, updatedHours.end);
                                      } else if (key === 'end' && updatedHours.start) {
                                        updatedHours.total = calculateHoursDifference(updatedHours.start, newValue);
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
                          <Select
                            value={service.activityConducted}
                            onValueChange={(value) => updateService(service.id, index, 'activityConducted', value)}
                          >
                            <SelectTrigger className="w-full h-[44px] bg-white border border-[#cccccd] rounded-[12px]">
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
                          <ContentEditableCell
                            value={service.whatWasDone}
                            onChange={(value) => updateService(service.id, index, 'whatWasDone', value)}
                            fieldName="What was done related to the activity"
                            pageTitle={pageTitle}
                          />
                        </div>
                      </td>
                      <td className={`${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]`}>
                        <div className="flex items-center justify-center min-h-[147px]">
                          <ContentEditableCell
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
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>

        {/* Floating Action Button */}
        <VoiceInputButton/>
      </div>
    </VoiceRecordingProvider>
  );
}

