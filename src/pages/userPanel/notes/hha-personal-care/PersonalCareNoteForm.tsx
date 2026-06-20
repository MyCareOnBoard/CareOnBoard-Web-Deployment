import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/utils/auth";
import { CHHA_PERSONAL_CARE_ACTIVITIES } from "@/lib/notes/hhaPersonalCareActivities";
import { getNoteTitle } from "@/lib/notes/noteTypes";
import HhaNoteHeader, { HhaNoteInfoItem } from "@/pages/userPanel/notes/components/HhaNoteHeader";
import {
  useCreateOrUpdateActivityLogMutation,
  useGetSingleActivityLogQuery,
  useSubmitActivityLogNotesMutation,
} from "@/pages/userPanel/notes/api";

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
export default function PersonalCareNoteForm({
  activityLogId,
  onSubmitted,
}: {
  activityLogId: string;
  onSubmitted?: () => void;
}) {
  const { user } = useAuth();
  const [checkedActivities, setCheckedActivities] = useState<string[]>([]);
  const [existingNoteId, setExistingNoteId] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  const [mutateNote, { isLoading: isSaving }] = useCreateOrUpdateActivityLogMutation();
  const [submitNotes, { isLoading: isSubmitting }] = useSubmitActivityLogNotesMutation();
  const { data: activityLog, isLoading } = useGetSingleActivityLogQuery(activityLogId, {
    skip: !activityLogId,
  });

  const infoItems = useMemo(
    () => infoItemsFromMetadata(activityLog?.metadata),
    [activityLog?.metadata],
  );

  useEffect(() => {
    // Prefer the active (editable) note; fall back to a submitted note so a
    // locked note still shows what was checked after a reload.
    const sourceNotes =
      activityLog?.notes?.length ? activityLog.notes : activityLog?.submittedNotes ?? [];
    if (sourceNotes.length > 0) {
      const note = sourceNotes[sourceNotes.length - 1];
      setCheckedActivities(note?.metadata?.checkedActivities ?? []);
      setExistingNoteId(note.id);
    }
  }, [activityLog]);

  const toggleActivity = (activity: string) => {
    setCheckedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity],
    );
  };

  const buildPayload = () => ({
    id: existingNoteId,
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    metadata: {
      checkedActivities,
      completedBy: user?.fullName ?? "",
      completionDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const handleSave = async () => {
    try {
      const { data } = await mutateNote({ activityLog: activityLogId, data: buildPayload() }).unwrap();
      setExistingNoteId(data.id);
      toast.success("Personal Care Note saved.");
    } catch (error) {
      console.error("Error saving personal care note:", error);
      toast.error("Failed to save note.");
    }
  };

  const handleSubmit = async () => {
    if (checkedActivities.length === 0) {
      toast.error("Select at least one activity performed.");
      return;
    }
    try {
      const { data } = await mutateNote({ activityLog: activityLogId, data: buildPayload() }).unwrap();
      await submitNotes({ activityLog: activityLogId, logNoteIds: [data.id] }).unwrap();
      setSubmitted(true);
      toast.success("Personal Care Note submitted.");
      onSubmitted?.();
    } catch (error) {
      console.error("Error submitting personal care note:", error);
      toast.error("Failed to submit note.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent" />
      </div>
    );
  }

  // Lock the form once the note is submitted: the log status stays "active"
  // server-side, so a local flag is the reliable signal in-session.
  const readOnly = Boolean(activityLog?.status && activityLog.status !== "active");
  const locked = submitted || readOnly || Boolean(activityLog?.hasSubmittedNotes);

  return (
    <div className="space-y-6">
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
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                  disabled={locked}
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
          {user?.fullName ?? "—"}
        </p>
        <p className="mt-1 text-[13px] font-medium leading-[1.4] text-[#808081]">
          {format(new Date(), "MMMM d, yyyy")}
        </p>
      </div>

      {locked ? (
        <p className="pt-2 text-[13px] font-medium text-[#0eaf52]">This note has been submitted.</p>
      ) : null}

      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={locked || isSaving}
          className="rounded-full bg-[#b2b2b3] px-8 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#9a9a9b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={locked || isSubmitting}
          className="rounded-full bg-[#00b4b8] px-8 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#009da1] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {locked ? "Submitted" : isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
