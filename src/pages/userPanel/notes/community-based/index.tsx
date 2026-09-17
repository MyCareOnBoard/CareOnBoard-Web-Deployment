import { noteTimedFields, noteEndDate } from '@/lib/notes/noteTypes';
import { useNoteOperation } from '@/lib/notes/useNoteOperation';
import { NoteFieldErrors, focusNoteError } from '@/pages/shared/notes/NoteFieldErrors';
import type { NoteFieldError } from '@/pages/userPanel/notes/apiTypes';
import React, {useEffect, useState, useRef} from "react";
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
import {useLocation, useNavigate} from "react-router";
import {
  useCreateOrUpdateActivityLogMutation,
  useGetSingleActivityLogQuery,
  useSubmitActivityLogNotesMutation, useUpdateActivityLogMutation
} from "@/pages/userPanel/notes/api";
import {toast} from "sonner";
import {useAuth} from "@/utils/auth";

type ActivityRow = {
  originalStartDate?: string;
  originalEndDate?: string;
  dateTimeEdited?: boolean;
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

export default function CommunityBasedPage() {
  const id = new URLSearchParams(useLocation().search).get("id");
  return <CommunityBasedPageForm key={id} />;
}

function CommunityBasedPageForm() {
  const [openDatePopoverId, setOpenDatePopoverId] = useState<string | null>(null);

  const navigate = useNavigate();
  const {user} = useAuth();
  const activityLogId = new URLSearchParams(useLocation().search).get("id");

  const {data: activityLog, isLoading} = useGetSingleActivityLogQuery(activityLogId!, {
    skip: !activityLogId,
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
  const [updateLogMutation] = useUpdateActivityLogMutation();
  const headerSave = useRef<Promise<unknown>>(Promise.resolve());
  const updateLog = (payload: Parameters<typeof updateLogMutation>[0]) => ({unwrap: () => {
    headerSave.current = headerSave.current.catch(() => {}).then(() => updateLogMutation(payload).unwrap());
    return headerSave.current;
  }});
  const [submitNotes, {isLoading: isSubmitting}] = useSubmitActivityLogNotesMutation();

  const [activities, setActivities] = useState<ActivityRow[]>(initialActivities);
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;

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

  const lockedIds = new Set([...submittedIds, ...(activityLog?.submittedNotes ?? []).map(note => note.id), ...(activityLog?.approvedNotes ?? []).map(note => note.id)]);
  const updateActivity = (_id: string, index: number, field: keyof ActivityRow, value: any) => {
    if ((operation.pending || submitting.current) || lockedIds.has(activitiesRef.current[index].id)) return;
    activitiesRef.current = activitiesRef.current.map((item, i) => i === index ? {...item, [field]: value, dateTimeEdited: item.dateTimeEdited || ["date", "startTime", "endTime"].includes(field)} : item);
    setActivities(activitiesRef.current);
    const saveKey = `activity:${index}`;
    saveChain.current = saveChain.current.catch(() => {}).then(async () => {
        failedSaves.current.add(saveKey);
        const current = activitiesRef.current[index];
        const date = current.date;
        const startTime = current.startTime; const endTime = current.endTime;
        if (!(date && startTime && endTime)) return;
        const {data} = await mutateNote({
        activityLog: activityLogId!,
        data: {
          id: current.id,
          startDate: !current.dateTimeEdited && current.originalStartDate ? current.originalStartDate : format(date, "yyyy-MM-dd") + "T" + startTime,
          endDate: !current.dateTimeEdited && current.originalEndDate ? current.originalEndDate : noteEndDate(date, startTime, endTime, activityLog?.serviceDates) + "T" + endTime,
          metadata: {
            activity: current.activity,
            description: current.description,
          }
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

  const toggleStrategy = (id: string) => {
    setServiceStrategies((prevState) => {
      const newServiceStrategies = prevState.map(strategy =>
        strategy.id === id ? {...strategy, checked: !strategy.checked} : strategy
      )

      if (activityLogId) {
        const strategies = newServiceStrategies.filter(strategy => strategy.checked).map(strategy => strategy.id);
        updateLog({
          activityLog: activityLogId,
          data: {
            strategies
          }
        }).unwrap();
      }

      return newServiceStrategies
    });
  };

  const handleSubmit = async () => {
    if (submitting.current) return;
    submitting.current = true; setFlushing(true);
    try {
      await saveChain.current.catch(() => {});
      submitting.current = false;
      for (const key of [...failedSaves.current]) {
        const [kind, position] = key.split(':'); const index = Number(position);
        if (kind === 'activity') updateActivity('', index, 'description', activitiesRef.current[index].description);
      }
      submitting.current = true;
      await saveChain.current;
      await headerSave.current;
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
    const timezone = activityLog.timezone ?? (!activityLog.shiftId ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined);
    const modifyActivityNotes = notes.map(note => {
      const start = noteTimedFields(note.startDate, timezone);
      const end = noteTimedFields(note.endDate, timezone);
      return {id: note.id, date: start.date, startTime: start.time, endTime: end.time,
        originalStartDate: note.startDate, originalEndDate: note.endDate,
        activity: note.metadata?.activity ?? '', description: note.metadata?.description ?? ''};
    });
    activitiesRef.current = [...modifyActivityNotes, ...initialActivities.slice(modifyActivityNotes.length)];
    setActivities(activitiesRef.current);
    if (!isLoading && activityLog && activityLog.metadata?.strategies?.length > 0) {
      setServiceStrategies((prevState) => prevState.map((strategy) => ({
        ...strategy,
        checked: activityLog.metadata?.strategies?.includes(strategy.id)
      })))
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
    <VoiceRecordingProvider pageTitle="Community Based/Individual – Activities Log">
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
          className="text-[20px] font-semibold leading-[1.6] text-[#10141a] text-center mb-2 font-['Urbanist',sans-serif]">
          Community Based/Individual – Activities Log ({activityLog?.metadata?.serviceCode})
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
              value={activityLog?.metadata?.individual || ""}
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
              value={activityLog?.metadata?.serviceYear || ""}
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
              value={activityLog?.metadata?.serviceCode || ""}
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
            value={activityLog?.metadata?.ISPOutcome || ""}
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
                checked={activityLog?.metadata?.strategies?.includes(strategy.id) || strategy.checked}
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
                {activities?.map((activity, index) => (
                  <div
                    key={index}
                    data-note-id={activity.id}
                    className={`grid grid-cols-[112px_120px_120px_350px_1fr] gap-0 min-h-[71px] transition-colors ${
                      index < activities?.length - 1 ? 'border-b border-[#b2b2b3]' : ''
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
                    </div>
                    {/* Start Time */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <TimePicker disabled={lockedIds.has(activity.id) || operation.pending || flushing}
                        value={activity.startTime}
                        onChange={(value) => updateActivity(activity.id, index, 'startTime', value)}
                      />
                    </div>
                    {/* End Time */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <TimePicker disabled={lockedIds.has(activity.id) || operation.pending || flushing}
                        value={activity.endTime}
                        onChange={(value) => updateActivity(activity.id, index, 'endTime', value)}
                      />
                    </div>
                    {/* Activity */}
                    <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                      <ContentEditableCell fieldKey="activity"
                        readOnly={lockedIds.has(activity.id) || operation.pending || flushing}
                        value={activity.activity}
                        onChange={(value) => updateActivity(activity.id, index, 'activity', value)}
                        fieldName="Individualized Activity"
                        pageTitle="Community Based/Individual – Activities Log"
                      />
                    </div>
                    {/* Description */}
                    <div className="px-4 py-3 flex items-center justify-center">
                      <ContentEditableCell fieldKey="description"
                        readOnly={lockedIds.has(activity.id) || operation.pending || flushing}
                        value={activity.description}
                        onChange={(value) => updateActivity(activity.id, index, 'description', value)}
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
            value={user?.fullName || ""}
            placeholder=""
            disabled={true}
            className="max-w-md"
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

