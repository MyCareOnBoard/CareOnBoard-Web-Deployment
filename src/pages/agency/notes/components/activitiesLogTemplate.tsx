import {VoiceRecordingProvider} from "@/contexts/VoiceRecordingContext";
import {Input} from "@/components/ui/input";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import ContentEditableCell from "@/components/ContentEditableCell";
import VoiceInputButton from "@/components/VoiceInputButton";
import React, {useEffect, useState} from "react";
import {useUpdateSubmittedNoteMutation} from "@/pages/agency/notes/api";
import {format} from "date-fns";
import {SubmittedNoteDetails} from "@/pages/agency/notes/apiTypes";
import InformationCircleIcon from "@/assets/icons/information-circle.svg?react";


type ActivityRow = {
  id: string;
  date: Date | undefined;
  units: string;
  strategies: string;
  activities: string;
  location: string;
  notes: string;
};

const initialActivities = [
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
]

interface AgencyActivitiesLogTemplateProps {
  title: string;
  submissionId: string | null;
  isLoading: boolean;
  submittedNote?: SubmittedNoteDetails;
}

export default function AgencyActivitiesLogTemplate(
  {title, submissionId, isLoading, submittedNote}: AgencyActivitiesLogTemplateProps
) {
  const [openDatePopoverId, setOpenDatePopoverId] = useState<string | null>(null);

  const [mutateNote] = useUpdateSubmittedNoteMutation();

  const [activities, setActivities] = useState<ActivityRow[]>(initialActivities);

  const currentDate = new Date().toLocaleDateString("en-US", {month: "long", day: "numeric"});

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
    const metadata = {
      units: newActivity.units,
      strategies: newActivity.strategies,
      activities: newActivity.activities,
      location: newActivity.location,
      notes: newActivity.notes,
    };

    const hasAnyValue = date || metadata.units || metadata.strategies || metadata.activities || metadata.location || metadata.notes;

    if (hasAnyValue && id === "") {
      if (!submissionId) {
        console.warn('Cannot update note: submissionId is undefined');
        return;
      }
      await mutateNote({
        submissionId: submissionId,
        data: {
          id: id,
          startDate: date ? format(date, "yyyy-MM-dd") : "",
          endDate: date ? format(date, "yyyy-MM-dd") : "",
          metadata: metadata
        }
      }).unwrap();
    } else if (hasAnyValue && id !== "") {
      if (!submissionId) {
        console.warn('Cannot update note: submissionId is undefined');
        return;
      }
      await mutateNote({
        submissionId: submissionId!,
        data: {
          id: id,
          startDate: date ? format(date, "yyyy-MM-dd") : "",
          endDate: date ? format(date, "yyyy-MM-dd") : "",
          metadata: metadata
        }
      }).unwrap().catch(error => {
        console.error('Failed to update activity:', error);
      });
    }
  }

  const formatDisplayDate = (date: Date | undefined) => {
    if (!date) {
      return "";
    }
    return format(date, "dd.MM.yy");
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
        units: note.metadata?.units || "",
        strategies: note.metadata?.strategies || "",
        activities: note.metadata?.activities || "",
        location: note.metadata?.location || "",
        notes: note.metadata?.notes || "",
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

  const displayTitle = title.replace(':serviceCode', submittedNote?.metadata?.serviceCode || '');

  return (
    <VoiceRecordingProvider pageTitle={displayTitle}>
      <div className="min-h-[calc(100vh-200px)] pb-20">
        {/* Form Title */}
        <h2
          className="text-[20px] font-semibold leading-[1.6] text-[#10141a] text-center mb-8 font-['Urbanist',sans-serif]">
          {displayTitle}
        </h2>

        {/* Name of Individual */}
        <div className="mb-6">
          <p className="text-[14px] font-semibold leading-[1.4] text-black font-['Urbanist',sans-serif]">
            Name of Individual : {submittedNote?.metadata?.individual}
          </p>
        </div>

        {/* Activities Log Table */}
        <div className="overflow-x-auto mb-6">
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
              <div className={submittedNote?.status === "submitted" ? "bg-[#eef4f5]" : "bg-white"}>
                {activities?.map((activity, index) => (
                  <div
                    key={index}
                    className={`grid grid-cols-[112px_120px_160px_230px_140px_1fr] gap-0 min-h-[71px] transition-colors ${
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
                    {/* Units */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      {submittedNote?.status === "submitted" ? (
                        <ContentEditableCell
                          value={activity.units}
                          onChange={(value) => updateActivity(activity.id, index, 'units', value)}
                          fieldName="Units"
                          pageTitle={displayTitle}
                        />
                      ) : (
                        <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                          {activity.units}
                        </span>
                      )}
                    </div>
                    {/* Strategies */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      {submittedNote?.status === "submitted" ? (
                        <ContentEditableCell
                          value={activity.strategies}
                          onChange={(value) => updateActivity(activity.id, index, 'strategies', value)}
                          fieldName="Strategies"
                          pageTitle={displayTitle}
                        />
                      ) : (
                        <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                          {activity.strategies}
                        </span>
                      )}
                    </div>
                    {/* Activities */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      {submittedNote?.status === "submitted" ? (
                        <ContentEditableCell
                          value={activity.activities}
                          onChange={(value) => updateActivity(activity.id, index, 'activities', value)}
                          fieldName="Activities"
                          pageTitle={displayTitle}
                        />
                      ) : (
                        <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                          {activity.activities}
                        </span>
                      )}
                    </div>
                    {/* Location */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      {submittedNote?.status === "submitted" ? (
                        <ContentEditableCell
                          value={activity.location}
                          onChange={(value) => updateActivity(activity.id, index, 'location', value)}
                          fieldName="Location"
                          pageTitle={displayTitle}
                        />
                      ) : (
                        <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                          {activity.location}
                        </span>
                      )}
                    </div>
                    {/* Notes */}
                    <div className="px-4 py-3 flex items-center justify-center">
                      {submittedNote?.status === "submitted" ? (
                        <ContentEditableCell
                          value={activity.notes}
                          onChange={(value) => updateActivity(activity.id, index, 'notes', value)}
                          fieldName="Notes"
                          pageTitle={displayTitle}
                        />
                      ) : (
                        <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                          {activity.notes}
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
            {submittedNote?.submittedAt ? new Date(submittedNote.submittedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric"
            }) : currentDate}
          </p>
        </div>

        {/* Floating Action Button - Only show when editable */}
        {submittedNote?.status === "submitted" && <VoiceInputButton/>}
      </div>
    </VoiceRecordingProvider>
  )
}
