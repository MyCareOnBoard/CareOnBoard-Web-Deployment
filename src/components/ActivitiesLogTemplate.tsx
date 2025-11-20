import React, {useState} from "react";
import {Input} from "@/components/ui/input";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import {format} from "date-fns";
import InformationCircleIcon from "@/assets/icons/information-circle.svg?react";
import VoiceInputButton from "@/components/VoiceInputButton";
import ContentEditableCell from "@/components/ContentEditableCell";
import {VoiceRecordingProvider} from "@/contexts/VoiceRecordingContext";
import {Button} from "@/components/ui/button";
import {Routes} from "@/routes/constants";
import {ArrowLeft} from "lucide-react";
import {useNavigate} from "react-router";

type ActivityRow = {
  id: string;
  date: Date | undefined;
  units: string;
  strategies: string;
  activities: string;
  location: string;
  notes: string;
};

interface ActivitiesLogTemplateProps {
  title: string;
}

export default function ActivitiesLogTemplate({title}: ActivitiesLogTemplateProps) {
  const [individualName, setIndividualName] = useState("");
  const [totalUnits, setTotalUnits] = useState("");
  const [completedBy, setCompletedBy] = useState("");
  const [openDatePopoverId, setOpenDatePopoverId] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([
    {id: "1", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
    {id: "2", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
    {id: "3", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
    {id: "4", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
    {id: "5", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
    {id: "6", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
    {id: "7", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
  ]);

  const navigate = useNavigate();

  const currentDate = new Date().toLocaleDateString("en-US", {month: "long", day: "numeric"});

  const updateActivity = (id: string, field: keyof ActivityRow, value: any) => {
    setActivities(activities.map(activity =>
      activity.id === id ? {...activity, [field]: value} : activity
    ));
  };

  const formatDisplayDate = (date: Date | undefined) => {
    if (!date) {
      return "";
    }
    return format(date, "dd.MM.yy");
  };

  return (
    <VoiceRecordingProvider pageTitle={title}>
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
          className="text-[20px] font-semibold leading-[1.6] text-[#10141a] text-center mb-8 font-['Urbanist',sans-serif] whitespace-pre-wrap">
          {title}
        </h2>

        {/* Name of Individual */}
        <div className="mb-6">
          <p className="text-[14px] font-semibold leading-[1.4] text-black font-['Urbanist',sans-serif]">
            Name of Individual :
          </p>
        </div>

        {/* Activities Log Table */}
        <div className="overflow-x-auto">
          <div className="w-[1163px]">
            {/* Table Header */}
            <div className="border border-[#b2b2b3] rounded-tl-[2px] rounded-tr-[2px] overflow-hidden">
              <div className="border-b border-[#b2b2b3] bg-[#eef4f5] h-[71px]">
                <div className="grid grid-cols-[112px_120px_160px_230px_140px_1fr] gap-0 h-full">
                  <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                      Date
                    </p>
                  </div>
                  <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                      # of Units
                    </p>
                  </div>
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
                          Strategies addressed from the Individual Service Plan (ISP)
                        </p>
                      </PopoverContent>
                    </Popover>
                    <p
                      className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif] whitespace-pre-wrap">
                      {"Strategies\nAddressed\nToday"}
                    </p>
                  </div>
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
                        <p
                          className="text-[10px] font-normal leading-[1.6] text-black font-['Urbanist',sans-serif] whitespace-pre-wrap">
                          {`can use calendars or other activity  lists that reflect today's activities, if  applicable`}
                        </p>
                      </PopoverContent>
                    </Popover>
                    <p
                      className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif] whitespace-pre-wrap">
                      {"Today\u2019s Activities to Address\nStrategies"}
                    </p>
                  </div>
                  <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <p
                      className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif] whitespace-pre-wrap">
                      {"Location of\nActivities"}
                    </p>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center text-center">
                    <p
                      className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif] whitespace-pre-wrap">
                      {"Notes Related to Today\u2019s Activities &\nProgress Toward Outcome(s)"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="border border-[#b2b2b3] rounded-bl-[2px] rounded-br-[2px] border-t-0">
              <div className="bg-[#eef4f5]">
                {activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`grid grid-cols-[112px_120px_160px_230px_140px_1fr] gap-0 min-h-[71px] transition-colors ${
                      index < activities.length - 1 ? 'border-b border-[#b2b2b3]' : ''
                    } hover:bg-white`}
                  >
                    {/* Date */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <Popover
                        open={openDatePopoverId === activity.id}
                        onOpenChange={(open) => setOpenDatePopoverId(open ? activity.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full h-full flex items-center justify-center focus:outline-none cursor-pointer"
                          >
                          <span
                            className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                            {formatDisplayDate(activity.date)}
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
                            selected={activity.date}
                            defaultMonth={activity.date ?? new Date()}
                            onSelect={(date) => {
                              if (date) {
                                updateActivity(activity.id, 'date', date);
                                setOpenDatePopoverId(null);
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
                    {/* Units */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <Input
                        type="number"
                        value={activity.units}
                        onChange={(e) => updateActivity(activity.id, 'units', e.target.value)}
                        className="h-auto p-0 border-0 bg-transparent text-center focus-visible:ring-0 text-[14px] w-full"
                      />
                    </div>
                    {/* Strategies */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell
                        value={activity.strategies}
                        onChange={(value) => updateActivity(activity.id, 'strategies', value)}
                        fieldName="Strategies Addressed Today"
                        pageTitle={title}
                      />
                    </div>
                    {/* Activities */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell
                        value={activity.activities}
                        onChange={(value) => updateActivity(activity.id, 'activities', value)}
                        fieldName="Today's Activities to Address Strategies"
                        pageTitle={title}
                      />
                    </div>
                    {/* Location */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell
                        value={activity.location}
                        onChange={(value) => updateActivity(activity.id, 'location', value)}
                        fieldName="Location of Activities"
                        pageTitle={title}
                      />
                    </div>
                    {/* Notes */}
                    <div className="px-4 py-3 flex items-center justify-center">
                      <ContentEditableCell
                        value={activity.notes}
                        onChange={(value) => updateActivity(activity.id, 'notes', value)}
                        fieldName="Notes Related to Today's Activities & Progress Toward Outcome(s)"
                        pageTitle={title}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Total Units Label - Positioned below Units column */}
        <div className="mt-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-black font-['Urbanist',sans-serif]">
            Total Units :
          </p>
        </div>

        {/* Completed By Section */}
        <div className="mt-8">
          <label
            className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
            Completed by
          </label>
          <Input
            type="text"
            value={completedBy}
            onChange={(e) => setCompletedBy(e.target.value)}
            placeholder="Enter name"
            className="max-w-md"
          />
          <p className="mt-2 text-[12px] font-normal leading-[normal] text-black font-['Urbanist',sans-serif]">
            {currentDate}
          </p>
        </div>

        {/* Floating Action Button */}
        <VoiceInputButton/>
      </div>
    </VoiceRecordingProvider>
  );
}

