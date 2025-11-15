import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CalendarDaysIcon from "@/assets/icons/calendar-days.svg?react";
import { format } from "date-fns";
import VoiceInputButton from "@/components/VoiceInputButton";
import ContentEditableCell from "@/components/ContentEditableCell";
import TimePicker from "@/components/TimePicker";
import { VoiceRecordingProvider } from "@/contexts/VoiceRecordingContext";

type ServiceRow = {
  id: string;
  datesOfSeServices: {date: Date | undefined; seProfessional: string};
  noOfHours: {start: string; end: string; total: string};
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

export default function SupportedEmploymentPrePage() {
  const pageTitle = "Supported Employment Services – Pre-Employment Service Log";
  
  const [individualName, setIndividualName] = useState("");
  const [totalHours, setTotalHours] = useState("");
  const [reportingStartDate, setReportingStartDate] = useState<Date | undefined>(undefined);
  const [reportingEndDate, setReportingEndDate] = useState<Date | undefined>(undefined);
  const [completedBy, setCompletedBy] = useState("");
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [openServiceDateId, setOpenServiceDateId] = useState<string | null>(null);
  
  const [services, setServices] = useState<ServiceRow[]>([
    { id: "1", datesOfSeServices: {date: undefined, seProfessional: ""}, noOfHours: {start: "", end: "", total: ""}, activityConducted: "", whatWasDone: "", howDidThisAssist: "" },
    { id: "2", datesOfSeServices: {date: undefined, seProfessional: ""}, noOfHours: {start: "", end: "", total: ""}, activityConducted: "", whatWasDone: "", howDidThisAssist: "" },
    { id: "3", datesOfSeServices: {date: undefined, seProfessional: ""}, noOfHours: {start: "", end: "", total: ""}, activityConducted: "", whatWasDone: "", howDidThisAssist: "" },
    { id: "4", datesOfSeServices: {date: undefined, seProfessional: ""}, noOfHours: {start: "", end: "", total: ""}, activityConducted: "", whatWasDone: "", howDidThisAssist: "" },
  ]);

  const updateService = (id: string, field: keyof ServiceRow, value: any) => {
    setServices(services.map(service => 
      service.id === id ? { ...service, [field]: value } : service
    ));
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

  return (
    <VoiceRecordingProvider pageTitle={pageTitle}>
      <div className="min-h-[calc(100vh-200px)] pb-20">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif]">
            Notes
          </h1>
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
        <h2 className="text-[20px] font-semibold leading-[1.6] text-[#10141a] text-center mb-8 font-['Urbanist',sans-serif]">
          Supported Employment Services – Pre-Employment Service Log (TDHJ/3421)
        </h2>

        {/* Top Form Fields */}
        <div className="mb-6 flex flex-col gap-1">
          <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
            Name of Individual
          </label>
          <Input
            type="text"
            value={individualName}
            onChange={(e) => setIndividualName(e.target.value)}
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
              value={totalHours}
              onChange={(e) => setTotalHours(e.target.value)}
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
                      value={reportingStartDate ? format(reportingStartDate, "MMMM d, yyyy") : ""}
                      placeholder="Select date"
                      readOnly
                      className="text-[#10141a] border-0 bg-transparent"
                    />
                    <InputGroupAddon align="inline-end">
                      <CalendarDaysIcon className="h-5 w-5 text-[#808081]" />
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
                  selected={reportingStartDate}
                  defaultMonth={reportingStartDate ?? new Date()}
                  onSelect={(selectedDate) => {
                    if (selectedDate) {
                      setReportingStartDate(selectedDate);
                      setIsStartDateOpen(false);
                    }
                  }}
                  formatters={{
                    formatMonthDropdown: (date) =>
                      date.toLocaleString("default", { month: "long" }),
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
                      value={reportingEndDate ? format(reportingEndDate, "MMMM d, yyyy") : ""}
                      placeholder="Select date"
                      readOnly
                      className="text-[#10141a] border-0 bg-transparent"
                    />
                    <InputGroupAddon align="inline-end">
                      <CalendarDaysIcon className="h-5 w-5 text-[#808081]" />
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
                  selected={reportingEndDate}
                  defaultMonth={reportingEndDate ?? new Date()}
                  onSelect={(selectedDate) => {
                    if (selectedDate) {
                      setReportingEndDate(selectedDate);
                      setIsEndDateOpen(false);
                    }
                  }}
                  formatters={{
                    formatMonthDropdown: (date) =>
                      date.toLocaleString("default", { month: "long" }),
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
            value={completedBy}
            onChange={(e) => setCompletedBy(e.target.value)}
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
              <table className="w-full bg-[#eef4f5]" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  {services.map((service, index) => (
                    <React.Fragment key={service.id}>
                      <tr className="hover:bg-white transition-colors grid grid-cols-5 gap-0 min-w-[1163px] h-full">
                        <td className={`border-r ${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]`}>
                          <tr className="flex flex-col min-h-[147px]">
                            <td className="border-b border-[#b2b2b3] flex">
                              <div className="bg-[#D9D9D9] w-[80px] h-[49px] flex items-center justify-center">Date:</div>
                              <div className="flex-1 flex items-center justify-center">
                                <Popover 
                                  open={openServiceDateId === service.id} 
                                  onOpenChange={(open) => setOpenServiceDateId(open ? service.id : null)}
                                >
                                  <PopoverTrigger asChild>
                                    <button 
                                      type="button" 
                                      className="w-full h-full flex items-center justify-center focus:outline-none cursor-pointer"
                                    >
                                      <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                                        {formatDisplayDate(service.datesOfSeServices.date)}
                                      </span>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
                                    <Calendar
                                      mode="single"
                                      className="bg-white"
                                      captionLayout="dropdown"
                                      startMonth={new Date(1924, 0)}
                                      endMonth={new Date()}
                                      selected={service.datesOfSeServices.date}
                                      defaultMonth={service.datesOfSeServices.date ?? new Date()}
                                      onSelect={(date) => {
                                        if (date) {
                                          updateService(service.id, 'datesOfSeServices', {
                                            ...service.datesOfSeServices,
                                            date: date
                                          });
                                          setOpenServiceDateId(null);
                                        }
                                      }}
                                      formatters={{
                                        formatMonthDropdown: (date) =>
                                          date.toLocaleString("default", { month: "long" }),
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
                                onChange={(value) => updateService(service.id, 'datesOfSeServices', {
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
                                <div className="bg-[#D9D9D9] w-[80px] h-full flex items-center justify-end pe-5 capitalize">{key}:</div>
                                <div className="flex-1 flex items-center justify-center">
                                  {key === 'start' || key === 'end' ? (
                                    <TimePicker
                                      value={value}
                                      onChange={(newValue) => {
                                        const updatedHours = { ...service.noOfHours, [key]: newValue };
                                        // Auto-calculate total if both start and end are set
                                        if (key === 'start' && updatedHours.end) {
                                          updatedHours.total = calculateHoursDifference(newValue, updatedHours.end);
                                        } else if (key === 'end' && updatedHours.start) {
                                          updatedHours.total = calculateHoursDifference(updatedHours.start, newValue);
                                        }
                                        updateService(service.id, 'noOfHours', updatedHours);
                                      }}
                                    />
                                  ) : (
                                    <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
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
                              onValueChange={(value) => updateService(service.id, 'activityConducted', value)}
                            >
                              <SelectTrigger className="w-full h-[44px] bg-white border border-[#cccccd] rounded-[12px]">
                                <SelectValue placeholder="Please select" />
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
                              onChange={(value) => updateService(service.id, 'whatWasDone', value)}
                              fieldName="What was done related to the activity"
                              pageTitle={pageTitle}
                            />
                          </div>
                        </td>
                        <td className={`${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]`}>
                          <div className="flex items-center justify-center min-h-[147px]">
                            <ContentEditableCell
                              value={service.howDidThisAssist}
                              onChange={(value) => updateService(service.id, 'howDidThisAssist', value)}
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

        {/* Floating Action Button */}
        <VoiceInputButton />
      </div>
    </VoiceRecordingProvider>
  );
}

