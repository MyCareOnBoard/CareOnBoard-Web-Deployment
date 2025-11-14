import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import CalendarDaysIcon from "@/assets/icons/calendar-days.svg?react";
import InformationCircleIcon from "@/assets/icons/information-circle.svg?react";
import { format } from "date-fns";
import VoiceInputButton from "@/components/VoiceInputButton";
import VoiceEnabledTextarea from "@/components/VoiceEnabledTextarea";
import ContentEditableCell from "@/components/ContentEditableCell";
import { VoiceRecordingProvider } from "@/contexts/VoiceRecordingContext";

type InterventionRow = {
  id: string;
  training: string;
  employerVision: string;
  achievementPlan: string;
};

type ServiceRow = {
  id: string;
  date: string;
  seProfessional: string;
  startTime: string;
  endTime: string;
  total: string;
  servicesProvided: string;
  progress: string;
};

export default function SupportedEmploymentInterventionPage() {
  const pageTitle = "Supported Employment Services – Intervention Plan and Service Log";
  
  const [individualName, setIndividualName] = useState("");
  const [employer, setEmployer] = useState("");
  const [typeOfJob, setTypeOfJob] = useState("");
  const [applicableOutcomes, setApplicableOutcomes] = useState("");
  const [totalHours, setTotalHours] = useState("");
  const [reportingStartDate, setReportingStartDate] = useState<Date | undefined>(undefined);
  const [reportingEndDate, setReportingEndDate] = useState<Date | undefined>(undefined);
  const [completedBy, setCompletedBy] = useState("");
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  
  const [interventions, setInterventions] = useState<InterventionRow[]>([
    { id: "1", training: "", employerVision: "", achievementPlan: "" },
    { id: "2", training: "", employerVision: "", achievementPlan: "" },
    { id: "3", training: "", employerVision: "", achievementPlan: "" },
    { id: "4", training: "", employerVision: "", achievementPlan: "" },
    { id: "5", training: "", employerVision: "", achievementPlan: "" },
    { id: "6", training: "", employerVision: "", achievementPlan: "" },
    { id: "7", training: "", employerVision: "", achievementPlan: "" },
  ]);

  const [services, setServices] = useState<ServiceRow[]>([
    { id: "1", date: "", seProfessional: "", startTime: "", endTime: "", total: "", servicesProvided: "", progress: "" },
    { id: "2", date: "", seProfessional: "", startTime: "", endTime: "", total: "", servicesProvided: "", progress: "" },
    { id: "3", date: "", seProfessional: "", startTime: "", endTime: "", total: "", servicesProvided: "", progress: "" },
    { id: "4", date: "", seProfessional: "", startTime: "", endTime: "", total: "", servicesProvided: "", progress: "" },
  ]);

  const updateIntervention = (id: string, field: keyof InterventionRow, value: string) => {
    setInterventions(interventions.map(intervention => 
      intervention.id === id ? { ...intervention, [field]: value } : intervention
    ));
  };

  const updateService = (id: string, field: keyof ServiceRow, value: string) => {
    setServices(services.map(service => 
      service.id === id ? { ...service, [field]: value } : service
    ));
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
          Supported Employment Services – Intervention Plan and Service Log (TDHJ/3421)
        </h2>

        {/* Top Form Fields */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col gap-1">
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
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Employer
            </label>
            <Input
              type="text"
              value={employer}
              onChange={(e) => setEmployer(e.target.value)}
              className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4"
            />
          </div>
        </div>

        {/* Type of Job Section */}
        <div className="mb-6">
          <label className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
            Type of job (brief description of the work generally performed by the individual)
          </label>
          <VoiceEnabledTextarea
            value={typeOfJob}
            onChange={setTypeOfJob}
            className="min-h-[80px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
            placeholder=""
            fieldName="Type of Job"
            pageTitle={pageTitle}
          />
        </div>

        {/* Applicable ISP Outcomes */}
        <div className="mb-6">
          <label className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
            Applicable ISP Outcome(s)
          </label>
          <VoiceEnabledTextarea
            value={applicableOutcomes}
            onChange={setApplicableOutcomes}
            className="min-h-[80px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
            placeholder=""
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

        {/* Intervention Plan Table */}
        <div className="overflow-x-auto mb-6">
          <div className="w-full min-w-[1163px]">
            {/* Table Header */}
            <div className="border border-[#b2b2b3] rounded-tl-[2px] rounded-tr-[2px] overflow-hidden">
              <div className="border-b border-[#b2b2b3] bg-[#eef4f5] min-h-[71px]">
                <div className="grid grid-cols-3 gap-0 h-full">
                  <div className="relative px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="absolute top-2 right-2 h-4 w-4 cursor-pointer">
                          <InformationCircleIcon className="h-4 w-4 text-[#10141a]" />
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
                          <InformationCircleIcon className="h-4 w-4 text-[#10141a]" />
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
                    key={intervention.id}
                    className={`grid grid-cols-3 gap-0 min-h-[71px] transition-colors ${
                      index < interventions.length - 1 ? 'border-b border-[#b2b2b3]' : ''
                    } hover:bg-white`}
                  >
                    {/* Standard Required */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell
                        value={intervention.training}
                        onChange={(value) => updateIntervention(intervention.id, 'training', value)}
                        fieldName="What is the standard required?"
                        pageTitle={pageTitle}
                      />
                    </div>
                    {/* Employee Performance */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell
                        value={intervention.employerVision}
                        onChange={(value) => updateIntervention(intervention.id, 'employerVision', value)}
                        fieldName="How does the employee currently perform the tasks, actions, areas related to these standards?"
                        pageTitle={pageTitle}
                      />
                    </div>
                    {/* Addressing Issues */}
                    <div className="px-4 py-3 flex items-center justify-center">
                      <ContentEditableCell
                        value={intervention.achievementPlan}
                        onChange={(value) => updateIntervention(intervention.id, 'achievementPlan', value)}
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
                      How is the employee progressing toward his/her outcomes and meeting the standards that have been identified above?
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="border border-[#b2b2b3] rounded-bl-[2px] rounded-br-[2px] border-t-0">
              <div className="bg-[#eef4f5]">
                {services.map((service, index) => (
                  <div key={service.id} className="grid grid-cols-[140px_150px_1fr_1fr] grid-rows-[49px_49px_49px]" style={{ display: 'grid' }}>
                    {/* Column 1, Row 1: Date */}
                    <div className="border-r border-b border-[#b2b2b3] px-4 py-3 flex items-center">
                      <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                        Date :
                      </p>
                    </div>
                    
                    {/* Column 2, Row 1: Start */}
                    <div className="border-r border-b border-[#b2b2b3] px-4 py-3 flex items-center">
                      <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                        Start :
                      </p>
                    </div>
                    
                    {/* Column 3, Rows 1-3: Services Provided (rowspan) */}
                    <div className={`border-r ${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3] px-4 py-3 flex items-center justify-center`} style={{ gridRow: '1 / 4' }}>
                      <ContentEditableCell
                        value={service.servicesProvided}
                        onChange={(value) => updateService(service.id, 'servicesProvided', value)}
                        fieldName="What SE services were provided during this visit?"
                        pageTitle={pageTitle}
                      />
                    </div>
                    
                    {/* Column 4, Rows 1-3: Progress (rowspan) */}
                    <div className={`${index < services.length - 1 ? 'border-b border-[#b2b2b3]' : ''} px-4 py-3 flex items-center justify-center`} style={{ gridRow: '1 / 4' }}>
                      <ContentEditableCell
                        value={service.progress}
                        onChange={(value) => updateService(service.id, 'progress', value)}
                        fieldName="How is the employee progressing toward his/her outcomes and meeting the standards that have been identified above?"
                        pageTitle={pageTitle}
                      />
                    </div>

                    {/* Column 1, Row 2: SE Professionals */}
                    <div className="border-r border-b border-[#b2b2b3] px-4 py-3 flex items-center">
                      <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                        SE Professionals :
                      </p>
                    </div>
                    
                    {/* Column 2, Row 2: End */}
                    <div className="border-r border-b border-[#b2b2b3] px-4 py-3 flex items-center">
                      <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                        End :
                      </p>
                    </div>

                    {/* Column 1, Row 3: Empty */}
                    <div className={`border-r ${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3]`}>
                    </div>
                    
                    {/* Column 2, Row 3: Total */}
                    <div className={`border-r ${index < services.length - 1 ? 'border-b' : ''} border-[#b2b2b3] px-4 py-3 flex items-center`}>
                      <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                        Total :
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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

        {/* Floating Action Button */}
        <VoiceInputButton />
      </div>
    </VoiceRecordingProvider>
  );
}

