import React, {useState} from "react";
import {Input} from "@/components/ui/input";
import {Checkbox} from "@/components/ui/checkbox";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import {format} from "date-fns";
import VoiceInputButton from "@/components/VoiceInputButton";
import TimePicker from "@/components/TimePicker";
import ContentEditableCell from "@/components/ContentEditableCell";
import {VoiceRecordingProvider} from "@/contexts/VoiceRecordingContext";
import {Button} from "@/components/ui/button";
import {Routes} from "@/routes/constants";
import {ArrowLeft} from "lucide-react";
import {useNavigate} from "react-router";

type ActivityRow = {
  id: string;
  date: Date | undefined;
  startTime: string;
  endTime: string;
  activity: string;
  description: string;
};

type ServiceStrategy = {
  id: string;
  label: string;
  checked: boolean;
};

export default function CommunityBasedPage() {
  const [name, setName] = useState("");
  const [servicePlanYear, setServicePlanYear] = useState("");
  const [serviceCode] = useState("TDHJ/3421");
  const [ispOutcome, setIspOutcome] = useState("");
  const [completedBy, setCompletedBy] = useState("");
  const [openDatePopoverId, setOpenDatePopoverId] = useState<string | null>(null);

  const navigate = useNavigate();

  const [serviceStrategies, setServiceStrategies] = useState<ServiceStrategy[]>([
    {
      id: "adl",
      label: "Assistance with Activities of Daily Living (such as getting dressed, eating, personal hygiene, etc.)",
      checked: false
    },
    {
      id: "community",
      label: "Assistance with Increasing Community Participation (such as daily errands, attending events, restaurant, purchasing items, travel training, etc.)",
      checked: false
    },
    {
      id: "independence",
      label: "Assistance with Increasing Independence (such as helping the individual learn to do laundry, cook, clean, dress, grocery shop, pay for items, etc.)",
      checked: false
    },
    {
      id: "job-support",
      label: "Assistance with On-The-Job Support (such as safety awareness, using the restroom, attending to task, lunch/breaks, etc.)",
      checked: false
    },
    {
      id: "learning",
      label: "Assistance with Learning Activities (such as basic tutoring – math, reading, writing; support in attending a class; etc.)",
      checked: false
    },
  ]);

  const [activities, setActivities] = useState<ActivityRow[]>([
    {id: "1", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
    {id: "2", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
    {id: "3", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
    {id: "4", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
    {id: "5", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
    {id: "6", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
    {id: "7", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
  ]);

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

  const toggleStrategy = (id: string) => {
    setServiceStrategies(serviceStrategies.map(strategy =>
      strategy.id === id ? {...strategy, checked: !strategy.checked} : strategy
    ));
  };

  return (
    <VoiceRecordingProvider pageTitle="Community Based/Individual – Activities Log">
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
          className="text-[20px] font-semibold leading-[1.6] text-[#10141a] text-center mb-2 font-['Urbanist',sans-serif]">
          Community Based/Individual – Activities Log (TDHJ/3421)
        </h2>

        {/* Applicability Note */}
        <p className="text-[14px] font-semibold leading-[1.4] text-black text-center mb-8 font-['Urbanist',sans-serif]">
          (Not applicable when delivering daily rate version of Individual Supports. Only used for 15 minute unit
          version)
        </p>

        {/* Top Form Fields */}
        <div className="flex gap-6 mb-6">
          <div className="flex-1">
            <label
              className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
              Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label
              className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
              Service plan year
            </label>
            <Input
              type="text"
              value={servicePlanYear}
              onChange={(e) => setServicePlanYear(e.target.value)}
              placeholder=""
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label
              className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
              Service Code
            </label>
            <Input
              type="text"
              value={serviceCode}
              disabled
              className="w-full text-[#b2b2b3]"
            />
          </div>
        </div>

        {/* ISP Outcome */}
        <div className="mb-6">
          <label
            className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
            ISP Outcome
          </label>
          <Input
            type="text"
            value={ispOutcome}
            onChange={(e) => setIspOutcome(e.target.value)}
            placeholder=""
            className="w-full"
          />
        </div>

        {/* Service Strategies */}
        <div className="mb-6">
          <p className="text-[14px] font-semibold leading-[1.4] text-black mb-3 font-['Urbanist',sans-serif]">
            Service Strategies (check all that apply):
          </p>
          <div className="space-y-3">
            {serviceStrategies.map((strategy) => (
              <Checkbox
                key={strategy.id}
                checked={strategy.checked}
                onChange={() => toggleStrategy(strategy.id)}
                label={strategy.label}
                labelClassName="text-[14px] font-normal leading-[1.4] text-[#808081] font-['Urbanist',sans-serif]"
              />
            ))}
          </div>
        </div>

        {/* Activities Log Table */}
        <div className="overflow-x-auto mb-6">
          <div className="w-[1163px]">
            {/* Table Header */}
            <div className="border border-[#b2b2b3] rounded-tl-[2px] rounded-tr-[2px] overflow-hidden">
              <div className="border-b border-[#b2b2b3] bg-[#eef4f5] h-[71px]">
                <div className="grid grid-cols-[112px_120px_120px_350px_1fr] gap-0 h-full">
                  <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                      Date
                    </p>
                  </div>
                  <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <p
                      className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif] whitespace-pre-wrap">
                      {"Start\nTime"}
                    </p>
                  </div>
                  <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <p
                      className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif] whitespace-pre-wrap">
                      {"End\nTime"}
                    </p>
                  </div>
                  <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                      Individualized Activity
                    </p>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center text-center">
                    <p
                      className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif] whitespace-pre-wrap">
                      {"Tell us about the day, and how the activities will help\nthe individual reach the above outcome"}
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
                    className={`grid grid-cols-[112px_120px_120px_350px_1fr] gap-0 min-h-[71px] transition-colors ${
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
                    {/* Start Time */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <TimePicker
                        value={activity.startTime}
                        onChange={(value) => updateActivity(activity.id, 'startTime', value)}
                      />
                    </div>
                    {/* End Time */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <TimePicker
                        value={activity.endTime}
                        onChange={(value) => updateActivity(activity.id, 'endTime', value)}
                      />
                    </div>
                    {/* Activity */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell
                        value={activity.activity}
                        onChange={(value) => updateActivity(activity.id, 'activity', value)}
                        fieldName="Individualized Activity"
                        pageTitle="Community Based/Individual – Activities Log"
                      />
                    </div>
                    {/* Description */}
                    <div className="px-4 py-3 flex items-center justify-center">
                      <ContentEditableCell
                        value={activity.description}
                        onChange={(value) => updateActivity(activity.id, 'description', value)}
                        fieldName="Description"
                        pageTitle="Community Based/Individual – Activities Log"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
            placeholder=""
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

