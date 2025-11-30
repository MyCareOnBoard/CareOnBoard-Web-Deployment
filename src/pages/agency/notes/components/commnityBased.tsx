import {VoiceRecordingProvider} from "@/contexts/VoiceRecordingContext";
import {Input} from "@/components/ui/input";
import {Checkbox} from "@/components/ui/checkbox";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import TimePicker from "@/components/TimePicker";
import ContentEditableCell from "@/components/ContentEditableCell";
import VoiceInputButton from "@/components/VoiceInputButton";
import React, {useEffect, useState} from "react";
import {useUpdateSubmittedNoteMutation} from "@/pages/agency/notes/api";
import {useDebounce} from "@/hooks/useDebounce";
import {format} from "date-fns";
import {SubmittedNoteDetails} from "@/pages/agency/notes/apiTypes";


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


const initialActivities = [
  {id: "", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
  {id: "", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
  {id: "", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
  {id: "", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
  {id: "", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
  {id: "", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
  {id: "", date: undefined, startTime: "", endTime: "", activity: "", description: ""},
]


export default function AgencyCommunityBasedNote(
  {submissionId, isLoading, submittedNote}: {
    submissionId: string | null;
    isLoading: boolean;
    submittedNote?: SubmittedNoteDetails;
  }
) {
  const [openDatePopoverId, setOpenDatePopoverId] = useState<string | null>(null);

  const [mutateNote] = useUpdateSubmittedNoteMutation();

  const [activities, setActivities] = useState<ActivityRow[]>(initialActivities);

  const [serviceStrategies, setServiceStrategies] = useState<ServiceStrategy[]>([
    {
      id: "dailyLiving",
      label: "Assistance with Activities of Daily Living (such as getting dressed, eating, personal hygiene, etc.)",
      checked: false
    },
    {
      id: "communityParticipation",
      label: "Assistance with Increasing Community Participation (such as daily errands, attending events, restaurant, purchasing items, travel training, etc.)",
      checked: false
    },
    {
      id: "independence",
      label: "Assistance with Increasing Independence (such as helping the individual learn to do laundry, cook, clean, dress, grocery shop, pay for items, etc.)",
      checked: false
    },
    {
      id: "support",
      label: "Assistance with On-The-Job Support (such as safety awareness, using the restroom, attending to task, lunch/breaks, etc.)",
      checked: false
    },
    {
      id: "learning",
      label: "Assistance with Learning Activities (such as basic tutoring – math, reading, writing; support in attending a class; etc.)",
      checked: false
    },
  ]);

  const currentDate = new Date().toLocaleDateString("en-US", {month: "long", day: "numeric"});

  const debouncedMutateNote = useDebounce(
    async (params: any) => {
      await mutateNote(params).unwrap().catch(error => {
        console.error('Failed to update activity:', error);
      });
    },
    500
  );

  const updateActivity = async (
    id: string,
    index: number,
    field: keyof ActivityRow,
    value: any,
  ) => {
    setActivities(prevActivities => {
      return prevActivities.map((act, activityIndex) => {
        if ((id && act.id === id) || (index === activityIndex)) {
          return {...act, [field]: value};
        } else {
          return act;
        }
      });
    });

    const currentActivities = activities;

    let activity;
    if (id) {
      activity = currentActivities.find(activity => activity.id === id);
    } else {
      activity = currentActivities[index];
    }

    if (!activity) return;

    const newActivity = {
      ...activity,
      [field]: value
    };

    const date = newActivity.date;
    const startTime = field === "startTime" ? value : newActivity.startTime;
    const endTime = field === "endTime" ? value : newActivity.endTime;

    if (date && startTime && endTime && id === "") {
      await mutateNote({
        submissionId: submissionId!,
        data: {
          id: id,
          startDate: format(date, "yyyy-MM-dd") + "T" + startTime,
          endDate: format(date, "yyyy-MM-dd") + "T" + endTime,
          metadata: {
            activity: newActivity.activity,
            description: newActivity.description,
          }
        }
      }).unwrap();
    } else if (date && startTime && endTime && id !== "") {
      debouncedMutateNote({
        submissionId: submissionId!,
        data: {
          id: id,
          startDate: format(date, "yyyy-MM-dd") + "T" + startTime,
          endDate: format(date, "yyyy-MM-dd") + "T" + endTime,
          metadata: {
            activity: newActivity.activity,
            description: newActivity.description,
          }
        }
      });
    }
  }

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

  useEffect(() => {
    if (!isLoading && submittedNote && submittedNote.notes.length > 0) {
      // Sort notes by startDate before mapping
      const sortedNotes = [...submittedNote.notes].sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });

      const modifyActivityNotes = sortedNotes.map((note) => ({
        id: note.id,
        date: note.startDate?.split("T")?.[0] ? new Date(note.startDate?.split("T")?.[0]) : undefined,
        startTime: note.startDate ? new Date(note.startDate).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }) : "",
        endTime: note.endDate ? new Date(note.endDate).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }) : "",
        activity: note.metadata?.activity || "",
        description: note.metadata?.description || "",
      }));
      setActivities([
        ...modifyActivityNotes,
        ...initialActivities.slice(modifyActivityNotes.length)
      ]);
    }
  }, [isLoading, submittedNote]);

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
    <VoiceRecordingProvider pageTitle="Community Based/Individual – Activities Log">
      <div className="min-h-[calc(100vh-200px)] pb-20">
        {/* Form Title */}
        <h2
          className="text-[20px] font-semibold leading-[1.6] text-[#10141a] text-center mb-2 font-['Urbanist',sans-serif]">
          Community Based/Individual – Activities Log ({submittedNote?.metadata?.serviceCode})
        </h2>

        {/* Applicability Note */}
        <p
          className="text-[14px] font-semibold leading-[1.4] text-black text-center mb-8 font-['Urbanist',sans-serif]">
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
              value={submittedNote?.metadata?.individual || ""}
              placeholder=""
              className="w-full"
              disabled={true}
            />
          </div>
          <div className="flex-1">
            <label
              className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
              Service plan year
            </label>
            <Input
              type="text"
              value={submittedNote?.metadata?.serviceYear || ""}
              placeholder=""
              className="w-full"
              disabled={true}
            />
          </div>
          <div className="flex-1">
            <label
              className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
              Service Code
            </label>
            <Input
              type="text"
              value={submittedNote?.metadata?.serviceCode || ""}
              disabled={true}
              className="w-full"
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
            value={submittedNote?.metadata?.ISPOutcome || ""}
            placeholder=""
            className="w-full"
            disabled={true}
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
                checked={submittedNote?.metadata?.strategies?.includes(strategy.id) || strategy.checked}
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
              <div className="border-b border-[#b2b2b3] bg-white h-[71px]">
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
              <div className={submittedNote?.status === "submitted" ? "bg-[#eef4f5]" : "bg-white"}>
                {activities?.map((activity, index) => (
                  <div
                    key={index}
                    className={`grid grid-cols-[112px_120px_120px_350px_1fr] gap-0 min-h-[71px] transition-colors ${
                      index < activities?.length - 1 ? 'border-b border-[#b2b2b3]' : ''
                    } hover:bg-white`}
                  >
                    {/* Date */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      {submittedNote?.status === "submitted" ? (
                        <Popover
                          open={openDatePopoverId === String(index)}
                          onOpenChange={(open) => setOpenDatePopoverId(open ? String(index) : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="w-full h-full flex items-center justify-center focus:outline-none cursor-pointer"
                            >
                              <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
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
                              disabled={{
                                after: new Date()
                              }}
                              onSelect={async (date) => {
                                if (date) {
                                  await updateActivity(activity.id, index, 'date', date);
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
                      ) : (
                        <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                          {formatDisplayDate(activity.date)}
                        </span>
                      )}
                    </div>
                    {/* Start Time */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      {submittedNote?.status === "submitted" ? (
                        <TimePicker
                          value={activity.startTime}
                          onChange={(value) => updateActivity(activity.id, index, 'startTime', value)}
                        />
                      ) : (
                        <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                          {activity.startTime}
                        </span>
                      )}
                    </div>
                    {/* End Time */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      {submittedNote?.status === "submitted" ? (
                        <TimePicker
                          value={activity.endTime}
                          onChange={(value) => updateActivity(activity.id, index, 'endTime', value)}
                        />
                      ) : (
                        <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                          {activity.endTime}
                        </span>
                      )}
                    </div>
                    {/* Activity */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      {submittedNote?.status === "submitted" ? (
                        <ContentEditableCell
                          value={activity.activity}
                          onChange={(value) => updateActivity(activity.id, index, 'activity', value)}
                          fieldName="Individualized Activity"
                          pageTitle="Community Based/Individual – Activities Log"
                        />
                      ) : (
                        <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                          {activity.activity}
                        </span>
                      )}
                    </div>
                    {/* Description */}
                    <div className="px-4 py-3 flex items-center justify-center">
                      {submittedNote?.status === "submitted" ? (
                        <ContentEditableCell
                          value={activity.description}
                          onChange={(value) => updateActivity(activity.id, index, 'description', value)}
                          fieldName="Description"
                          pageTitle="Community Based/Individual – Activities Log"
                        />
                      ) : (
                        <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                          {activity.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submitted By Section */}
        <div className="mt-8">
          <label
            className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
            Submitted by
          </label>
          <Input
            type="text"
            value={submittedNote?.employee?.fullName || ""}
            placeholder=""
            disabled={true}
            className="max-w-md"
          />
          <p className="mt-2 text-[12px] font-normal leading-[normal] text-black font-['Urbanist',sans-serif]">
            {submittedNote?.submittedAt ? new Date(submittedNote.submittedAt).toLocaleDateString("en-US", {month: "long", day: "numeric", year: "numeric"}) : currentDate}
          </p>
        </div>

        {/* Floating Action Button - Only show when editable */}
        {submittedNote?.status === "submitted" && <VoiceInputButton/>}
      </div>
    </VoiceRecordingProvider>
  )
}