import React, {useEffect, useState} from "react";
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
import {useDebounce} from "@/hooks/useDebounce";
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
  const pageTitle = "Supported Employment Services – Intervention Plan and Service Log";
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [openServiceDateId, setOpenServiceDateId] = useState<string | null>(null);
  const {user} = useAuth();

  const navigate = useNavigate();

  const [interventions, setInterventions] = useState<InterventionRow[]>(initialInterventions);
  const [services, setServices] = useState<ServiceRow[]>(initialServices);

  const activityLogId = new URLSearchParams(useLocation().search).get("id");
  const [mutateNote] = useCreateOrUpdateActivityLogMutation();
  const [updateLog] = useUpdateActivityLogMutation();
  const [submitNotes, {isLoading: isSubmitting}] = useSubmitActivityLogNotesMutation();
  const {data: activityLog, isLoading} = useGetSingleActivityLogQuery(activityLogId!, {
    skip: !activityLogId
  });

  const [noteInfo, setNoteInfo] = useState({
    jobType: "",
    ISPOutcome: "",
    totalHours: "",
    reportingStartDate: new Date(),
    reportingEndDate: new Date(),
  })

  const debouncedMutateNote = useDebounce(
    async (params: any) => {
      await mutateNote(params).unwrap().catch(error => {
        console.error('Failed to update activity:', error);
      });
    },
    500
  );

  const debounceUpdateNote = useDebounce(
    async (params: any) => {
      await updateLog(params).unwrap().catch(error => {
        console.error('Failed to update activity:', error);
      });
    },
    500
  )

  const updateIntervention = async (
    id: string,
    index: number,
    field: keyof InterventionRow,
    value: string
  ) => {
    setInterventions((prevInterventions) => {
      return prevInterventions.map((intervention, activityIndex) => {
        if ((id && intervention.id === id) || (index === activityIndex)) {
          return {...intervention, [field]: value}
        } else {
          return intervention
        }
      })
    });

    const currentInterventions = interventions;

    let intervention;
    if (id) {
      intervention = currentInterventions.find(intervention => intervention.id === id);
    } else {
      intervention = currentInterventions[index];
    }

    if (!intervention) return;

    const newIntervention = {
      ...intervention,
      [field]: value
    };

    const training = newIntervention.training;

    if (training && id === "") {
      await mutateNote({
        activityLog: activityLogId!,
        data: {
          id: id,
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: format(new Date(), "yyyy-MM-dd"),
          metadata: {
            training: newIntervention.training,
            employerVision: newIntervention.employerVision,
            achievementPlan: newIntervention.achievementPlan,
            type: "intervention"
          },
          index
        }
      }).unwrap();
    } else if (training && id !== "") {
      debouncedMutateNote({
        activityLog: activityLogId!,
        data: {
          id: id,
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: format(new Date(), "yyyy-MM-dd"),
          metadata: {
            training: newIntervention.training,
            employerVision: newIntervention.employerVision,
            achievementPlan: newIntervention.achievementPlan,
            type: "intervention"
          },
          index
        }
      });
    }
  };

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
            servicesProvided: newService.servicesProvided,
            EmployeeProgress: newService.EmployeeProgress,
            type: "service"
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
            servicesProvided: newService.servicesProvided,
            EmployeeProgress: newService.EmployeeProgress,
            type: "service"
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
      // Validate interventions
      const interventionErrors = interventions.filter((intervention) => !intervention.id);
      if (interventionErrors.length > 0) {
        toast.error(`Please fill in all required fields for intervention rows ${interventionErrors.map((_, index) => index + 1).toString()}`);
        return;
      }

      // Validate services
      const serviceErrors = services.filter((service) => !service.id);
      if (serviceErrors.length > 0) {
        toast.error(`Please fill in all required fields for service dates ${serviceErrors.map(service => service.datesOfSeServices.date).toString()}`);
        return;
      }

      // Combine all note IDs from both tables
      const allNoteIds = [
        ...interventions.map((intervention) => intervention.id),
        ...services.map((service) => service.id)
      ];

      await submitNotes({
        activityLog: activityLogId!,
        logNoteIds: allNoteIds
      }).unwrap();

      setInterventions(initialInterventions);
      setServices(initialServices);
      toast.success('Intervention Plan and Service Log submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting activity log:', error);
      toast.error(error?.data?.message || 'Failed to submit activity log.');
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
        reportingStartDate: updateNoteInfo?.reportingStartDate?.toISOString()?.slice(0, 10),
        reportingEndDate: updateNoteInfo?.reportingEndDate?.toISOString()?.slice(0, 10)
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
        const serviceNotes = activityLog.notes.filter((note) => note.metadata?.type === "service");
        const newServices = services.map((service, index) => {
          if (!service.id) {
            if (serviceNotes.length > index) {
              service.id = serviceNotes[index].id;
            }
          }
          return service;
        });
        setServices(newServices);
      } else {
        const serviceNotes = activityLog.notes.filter((note) => note.metadata?.type === "service");
        const formattedServiceNotes = serviceNotes.map((note) => ({
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
          servicesProvided: note.metadata?.servicesProvided || "",
          EmployeeProgress: note.metadata?.EmployeeProgress || "",
        }));
        setServices([
          ...formattedServiceNotes,
          ...initialServices.slice(formattedServiceNotes.length)
        ]);
      }

      if (interventions.some((intervention) => intervention.id)) {
        const interventionNotes = activityLog.notes.filter((note) => note.metadata?.type === "intervention");
        const newInterventions = interventions.map((intervention, index) => {
          if (!intervention.id) {
            if (interventionNotes.length > index) {
              intervention.id = interventionNotes[index].id;
            }
          }
          return intervention;
        });
        setInterventions(newInterventions);
      } else {
        const interventionNotes = activityLog.notes.filter((note) => note.metadata?.type === "intervention");
        const formattedInterventionNotes = interventionNotes.map((note) => ({
          id: note.id,
          training: note.metadata?.training || "",
          employerVision: note.metadata?.employerVision || "",
          achievementPlan: note.metadata?.achievementPlan || "",
        }));
        setInterventions([
          ...formattedInterventionNotes,
          ...initialInterventions.slice(formattedInterventionNotes.length)
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
        jobType: activityLog.metadata?.jobType,
        ISPOutcome: activityLog.metadata?.ISPOutcome,
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
              className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4"
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
              className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4"
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
            className="min-h-[80px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
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
            className="min-h-[80px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
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
                  selected={noteInfo.reportingStartDate}
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
            className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4 w-full"
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
                    className={`grid grid-cols-3 gap-0 min-h-[71px] transition-colors ${
                      index < interventions.length - 1 ? 'border-b border-[#b2b2b3]' : ''
                    } hover:bg-white`}
                  >
                    {/* Standard Required */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell
                        value={intervention.training}
                        onChange={(value) => updateIntervention(intervention.id, index, 'training', value)}
                        fieldName="What is the standard required?"
                        pageTitle={pageTitle}
                      />
                    </div>
                    {/* Employee Performance */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell
                        value={intervention.employerVision}
                        onChange={(value) => updateIntervention(intervention.id, index, 'employerVision', value)}
                        fieldName="How does the employee currently perform the tasks, actions, areas related to these standards?"
                        pageTitle={pageTitle}
                      />
                    </div>
                    {/* Addressing Issues */}
                    <div className="px-4 py-3 flex items-center justify-center">
                      <ContentEditableCell
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
                    <tr className="hover:bg-white transition-colors grid grid-cols-4 gap-0 min-w-[1163px] h-full">
                      <td className={`border-r ${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]  `}>
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
                            /></td>
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
                                    onChange={async (newValue) => {
                                      const updatedHours = {...service.noOfHours, [key]: newValue};
                                      // Auto-calculate total if both start and end are set
                                      if (key === 'start' && updatedHours.end) {
                                        updatedHours.total = calculateHoursDifference(newValue, updatedHours.end);
                                      } else if (key === 'end' && updatedHours.start) {
                                        updatedHours.total = calculateHoursDifference(updatedHours.start, newValue);
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
                          <ContentEditableCell
                            value={service.servicesProvided}
                            onChange={(value) => updateService(service.id, index, 'servicesProvided', value)}
                            fieldName="What SE services were provided during this visit?"
                            pageTitle={pageTitle}
                          />
                        </div>
                      </td>
                      <td className={`border-r ${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]`}>
                        <div className="flex items-center justify-center min-h-[147px]">
                          <ContentEditableCell
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
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm"
          >
            {isSubmitting ? "Submitting..." : "Submit Both Tables"}
          </Button>
        </div>

        {/* Floating Action Button */}
        <VoiceInputButton/>
      </div>
    </VoiceRecordingProvider>
  );
}

