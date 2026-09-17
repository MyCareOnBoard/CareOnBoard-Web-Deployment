import { noteServiceDate } from '@/lib/notes/noteTypes';
import { useNoteOperation } from '@/lib/notes/useNoteOperation';
import { NoteFieldErrors, focusNoteError } from '@/pages/shared/notes/NoteFieldErrors';
import type { NoteFieldError } from '@/pages/userPanel/notes/apiTypes';
import React, {useEffect, useState, useRef} from "react";
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
import {useLocation, useNavigate} from "react-router";
import {
  useCreateOrUpdateActivityLogMutation,
  useGetSingleActivityLogQuery,
  useSubmitActivityLogNotesMutation
} from "@/pages/userPanel/notes/api";
import {useAuth} from "@/utils/auth";
import {toast} from "sonner";

const initialActivities = [
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
  {id: "", date: undefined, units: "", strategies: "", activities: "", location: "", notes: ""},
]

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

export default function ActivitiesLogTemplate(props: ActivitiesLogTemplateProps) {
  const id = new URLSearchParams(useLocation().search).get("id");
  return <ActivitiesLogForm key={id} {...props} />;
}

function ActivitiesLogForm({title}: ActivitiesLogTemplateProps) {
  const [openDatePopoverId, setOpenDatePopoverId] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>(initialActivities);
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;
  const {user} = useAuth();

  const navigate = useNavigate();
  const activityLogId = new URLSearchParams(useLocation().search).get("id");

  const {data: activityLog, isLoading} = useGetSingleActivityLogQuery(activityLogId!, {
    skip: !activityLogId
  });
  const operation = useNoteOperation();
  const submitting = useRef(false);
  const [flushing, setFlushing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<NoteFieldError[]>([]);
  const hydrated = useRef(false);
  const failedSaves = useRef(new Set<string>());
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [mutateNote] = useCreateOrUpdateActivityLogMutation();
  const [submitNotes, {isLoading: isSubmitting}] = useSubmitActivityLogNotesMutation();

  const currentDate = new Date().toLocaleDateString("en-US", {month: "long", day: "numeric"});

  const lockedIds = new Set([...submittedIds, ...(activityLog?.submittedNotes ?? []).map(note => note.id), ...(activityLog?.approvedNotes ?? []).map(note => note.id)]);
  const updateActivity = (_id: string, index: number, field: keyof ActivityRow, value: any) => {
    if ((operation.pending || submitting.current) || lockedIds.has(activitiesRef.current[index].id)) return;
    activitiesRef.current = activitiesRef.current.map((item, i) => i === index ? {...item, [field]: value} : item);
    setActivities(activitiesRef.current);
    const saveKey = `activity:${index}`;
    saveChain.current = saveChain.current.catch(() => {}).then(async () => {
        failedSaves.current.add(saveKey);
        const current = activitiesRef.current[index];
        const date = current.date;
        const metadata = {units: current.units, strategies: current.strategies, activities: current.activities, location: current.location, notes: current.notes};
        if (!(date)) return;
        const {data} = await mutateNote({
        activityLog: activityLogId!,
        data: {
          id: current.id,
          startDate: format(date, "yyyy-MM-dd"),
          endDate: format(date, "yyyy-MM-dd"),
          metadata: metadata
        }
      }).unwrap();
        failedSaves.current.delete(saveKey);
        if (!current.id && data?.id) {
          activitiesRef.current = activitiesRef.current.map((item, i) => i === index ? {...item, id: data.id} : item);
          setActivities(activitiesRef.current);
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

  const handleSubmit = async () => {
    if (submitting.current) return;
    submitting.current = true; setFlushing(true);
    try {
      await saveChain.current.catch(() => {});
      submitting.current = false;
      for (const key of [...failedSaves.current]) {
        const [kind, position] = key.split(':'); const index = Number(position);
        if (kind === 'activity') updateActivity('', index, 'date', activitiesRef.current[index].date);
      }
      submitting.current = true;
      await saveChain.current;
      if (failedSaves.current.size) throw new Error("Some rows have unsaved changes. Check their dates and try saving again before submitting.");
      const logNoteIds = [...activitiesRef.current].filter(row => row.id && !lockedIds.has(row.id)).map(row => row.id);
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

  useEffect(() => {
    if (isLoading || !activityLog || hydrated.current) return;
    hydrated.current = true;
    const notes = [...activityLog.notes, ...(activityLog.submittedNotes ?? []), ...(activityLog.approvedNotes ?? [])];
    const modifyActivityNotes = notes.map((note) => ({
          id: note.id,
          date: noteServiceDate(note.startDate),
          units: note.metadata?.units ?? "",
          strategies: note.metadata?.strategies ?? "",
          activities: note.metadata?.activities ?? "",
          location: note.metadata?.location ?? "",
          notes: note.metadata?.notes ?? "",
        }));
    activitiesRef.current = [...modifyActivityNotes, ...initialActivities.slice(modifyActivityNotes.length)];
    setActivities(activitiesRef.current);
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
          {title.replace(":serviceCode", activityLog?.metadata?.serviceCode ?? "")}
        </h2>

        {/* Name of Individual */}
        <div className="mb-6">
          <p className="text-[14px] font-semibold leading-[1.4] text-black font-['Urbanist',sans-serif]">
            Name of Individual : {activityLog?.metadata?.individual}
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
                    key={index}
                    data-note-id={activity.id}
                    className={`grid grid-cols-[112px_120px_160px_230px_140px_1fr] gap-0 min-h-[71px] transition-colors ${
                      index < activities.length - 1 ? 'border-b border-[#b2b2b3]' : ''
                    } hover:bg-white`}
                  >
                    {/* Date */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <Popover
                        open={openDatePopoverId === String(index)}
                        onOpenChange={(open) => { if (!lockedIds.has(activity.id) && !operation.pending) setOpenDatePopoverId(open ? String(index) : null); }}
                      >
                        <PopoverTrigger asChild>
                          <button data-note-field="startDate" disabled={lockedIds.has(activity.id) || flushing}
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
                            disabled={{
                              after: new Date()
                            }}
                            defaultMonth={activity.date ?? new Date()}
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
                    </div>
                    {/* Units */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <Input disabled={lockedIds.has(activity.id) || operation.pending || flushing}
                        type="number"
                        aria-label="Units" data-note-field="units"
                        value={activity.units}
                        onChange={(e) => updateActivity(activity.id, index, 'units', e.target.value)}
                        className="h-auto p-0 border-0 bg-transparent text-center focus-visible:ring-0 text-[14px] w-full"
                      />
                    </div>
                    {/* Strategies */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell fieldKey="strategies"
                        readOnly={lockedIds.has(activity.id) || operation.pending || flushing}
                        value={activity.strategies}
                        onChange={(value) => updateActivity(activity.id, index, 'strategies', value)}
                        fieldName="Strategies Addressed Today"
                        pageTitle={title}
                      />
                    </div>
                    {/* Activities */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell fieldKey="activities"
                        readOnly={lockedIds.has(activity.id) || operation.pending || flushing}
                        value={activity.activities}
                        onChange={(value) => updateActivity(activity.id, index, 'activities', value)}
                        fieldName="Today's Activities to Address Strategies"
                        pageTitle={title}
                      />
                    </div>
                    {/* Location */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell fieldKey="location"
                        readOnly={lockedIds.has(activity.id) || operation.pending || flushing}
                        value={activity.location}
                        onChange={(value) => updateActivity(activity.id, index, 'location', value)}
                        fieldName="Location of Activities"
                        pageTitle={title}
                      />
                    </div>
                    {/* Notes */}
                    <div className="px-4 py-3 flex items-center justify-center">
                      <ContentEditableCell fieldKey="notes"
                        readOnly={lockedIds.has(activity.id) || operation.pending || flushing}
                        value={activity.notes}
                        onChange={(value) => updateActivity(activity.id, index, 'notes', value)}
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

        <NoteFieldErrors errors={fieldErrors} />
        {/* Total Units Label - Positioned below Units column */}
        <div className="mt-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-black font-['Urbanist',sans-serif]">
            Total Units : {activities.reduce((acc, activity) => acc + (Number(activity.units) || 0), 0)}
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
            value={user?.fullName ?? ""}
            placeholder="Enter name"
            className="max-w-md"
            disabled={true}
          />
          <p className="mt-2 text-[12px] font-normal leading-[normal] text-black font-['Urbanist',sans-serif]">
            {currentDate}
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

