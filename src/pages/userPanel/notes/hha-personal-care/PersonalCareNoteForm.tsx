import LockedNoteEvidence from '@/pages/shared/notes/LockedNoteEvidence';
import { NoteFieldErrors } from '@/pages/shared/notes/NoteFieldErrors';
import React, { useCallback, useMemo } from "react";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/utils/auth";
import { CHHA_PERSONAL_CARE_ACTIVITIES } from "@/lib/notes/hhaPersonalCareActivities";
import { getNoteTitle, noteServiceDate } from "@/lib/notes/noteTypes";
import HhaNoteHeader, { HhaNoteInfoItem } from "@/pages/userPanel/notes/components/HhaNoteHeader";
import { useGetSingleActivityLogQuery } from "@/pages/userPanel/notes/api";
import { useSingleRowNote } from "@/pages/userPanel/notes/useSingleRowNote";
import { EMPTY_PERSONAL_CARE, readPersonalCare, writePersonalCare, type PersonalCareValues } from "./personalCare";

function infoItemsFromMetadata(metadata?: Record<string, any>): HhaNoteInfoItem[] {
  return [
    { label: "Client name", value: metadata?.clientName || metadata?.individual || "" },
    { label: "Address", value: metadata?.clientAddress || "" },
    { label: "Service code", value: metadata?.serviceCode || "" },
    { label: "Shift date", value: metadata?.shiftDate || "" },
    { label: "Clocked in", value: metadata?.clockedInAt || metadata?.shiftStartTime || "" },
    { label: "Clocked out", value: metadata?.clockedOutAt || metadata?.shiftEndTime || "" },
  ];
}

/**
 * Personal Care Service Note form: agency header, auto-filled client info, the
 * fixed CHHA activities checklist, and completed-by/date. Shared by the DSP note
 * page and the clock-out modal so both render identically.
 */
export default function PersonalCareNoteForm(props: {activityLogId: string; onSubmitted?: () => void}) {
  return <PersonalCareNoteContent key={props.activityLogId} {...props} />;
}

function PersonalCareNoteContent({
  activityLogId,
  onSubmitted,
}: {
  activityLogId: string;
  onSubmitted?: () => void;
}) {
  const { user } = useAuth();
  const signer = user?.fullName ?? "";
  const { data: activityLog, isLoading } = useGetSingleActivityLogQuery(activityLogId, {
    skip: !activityLogId,
  });
  const write = useCallback((values: PersonalCareValues) => writePersonalCare(values, signer), [signer]);
  // The clock-out modal saves on demand only, so no autosave here.
  const note = useSingleRowNote<PersonalCareValues>({
    activityLogId, log: activityLog, empty: EMPTY_PERSONAL_CARE, read: readPersonalCare, write,
    hasContent: (values) => values.checkedActivities.length > 0, emptyMessage: "Select at least one activity performed.",
    autosaveMs: 0, onSubmitted,
  });
  const checkedActivities = note.values.checkedActivities;
  const existingNoteId = note.rowId;
  const locked = note.locked;

  const infoItems = useMemo(
    () => infoItemsFromMetadata(activityLog?.metadata),
    [activityLog?.metadata],
  );

  const toggleActivity = (activity: string) => {
    if (note.retrySubmission) return;
    note.update((current) => ({
      ...current,
      checkedActivities: current.checkedActivities.includes(activity)
        ? current.checkedActivities.filter((a) => a !== activity)
        : [...current.checkedActivities, activity],
    }));
  };

  const handleSubmit = async () => {
    if (await note.submit() === "sent") toast.success("Personal Care Note submitted.");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent" />
      </div>
    );
  }

  const completion = {name: note.values.completedBy, date: note.values.completionDate};

  return (
    <div className="space-y-6" data-note-id={existingNoteId}>
      <NoteFieldErrors errors={note.fieldErrors} />
      <LockedNoteEvidence onEdit={row => void note.editDraft(row)} displayedId={existingNoteId} notes={note.rows} />
      {note.retrySubmission ? <p role="status" className="text-sm">Submission could not be confirmed. Submit again to retry safely before editing.</p> : null}
      <HhaNoteHeader
        agencyName={activityLog?.metadata?.agencyName ?? user?.agency?.name ?? ""}
        title={getNoteTitle("hha-personal-care")}
        items={infoItems}
      />

      <div className="rounded-[20px] border border-white bg-[#FFFFFF4D] p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">
              Personal care activities performed
            </p>
            <p className="text-[13px] font-medium leading-[1.4] text-[#808081]">
              Select every task completed during the visit.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[rgba(0,180,184,0.1)] px-3 py-1 text-[13px] font-semibold text-[#00b4b8]">
            {checkedActivities.length}/{CHHA_PERSONAL_CARE_ACTIVITIES.length}
          </span>
        </div>
        <div data-note-field="checkedActivities" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {CHHA_PERSONAL_CARE_ACTIVITIES.map((activity) => {
            const checked = checkedActivities.includes(activity);
            return (
              <label
                key={activity}
                className={`flex items-center gap-3 rounded-[12px] border px-4 py-3 text-[14px] font-medium transition-all ${
                  checked
                    ? "border-[#00b4b8] bg-[rgba(0,180,184,0.08)]"
                    : "border-[#e1e3e8] bg-white hover:border-[#00b4b8]/50"
                } ${locked ? "pointer-events-none opacity-80" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={locked || note.busy}
                  onChange={() => toggleActivity(activity)}
                  className="sr-only"
                />
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    checked
                      ? "border-[#00b4b8] bg-[#00b4b8] text-white"
                      : "border-[#cccccd] bg-white text-transparent"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="text-[#10141a]">{activity}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="rounded-[20px] border border-white bg-[#FFFFFF4D] p-6 shadow-sm">
        <p className="mb-1.5 text-[12px] font-medium leading-[1.4] text-[#808081]">Completed by</p>
        <p className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">
          {locked ? completion.name || "Not recorded" : signer || "Not recorded"}
        </p>
        <p className="mt-1 text-[13px] font-medium leading-[1.4] text-[#808081]">
          {locked ? (noteServiceDate(completion.date) ? format(noteServiceDate(completion.date)!, "MMMM d, yyyy") : "Completion date not recorded") : format(new Date(), "MMMM d, yyyy")}
        </p>
      </div>

      {locked ? (
        <p className="pt-2 text-[13px] font-medium text-[#0eaf52]">This note has been submitted.</p>
      ) : null}

      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={() => void note.saveDraft()}
          disabled={locked || note.saveState === "saving" || note.busy}
          className="rounded-full bg-[#b2b2b3] px-8 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#9a9a9b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {note.saveState === "saving" ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={locked || note.isSubmitting}
          className="rounded-full bg-[#00b4b8] px-8 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#009da1] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {locked ? "Submitted" : note.isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
