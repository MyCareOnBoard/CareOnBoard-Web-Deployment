import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/utils/auth";
import { CHHA_PERSONAL_CARE_ACTIVITIES } from "@/lib/notes/hhaPersonalCareActivities";
import type { ClientBasicInfo } from "@/lib/notes/clientBasicInfo";
import { getNoteTitle } from "@/lib/notes/noteTypes";
import HhaNoteHeader from "@/pages/userPanel/notes/components/HhaNoteHeader";
import {
  useCreateOrUpdateActivityLogMutation,
  useGetSingleActivityLogQuery,
  useSubmitActivityLogNotesMutation,
} from "@/pages/userPanel/notes/api";

function clientInfoFromMetadata(metadata?: Record<string, any>): ClientBasicInfo {
  return {
    name: metadata?.clientName || metadata?.individual || "",
    dob: metadata?.clientDob || "",
    address: metadata?.clientAddress || "",
    phone: metadata?.clientPhone || "",
  };
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

  const [mutateNote, { isLoading: isSaving }] = useCreateOrUpdateActivityLogMutation();
  const [submitNotes, { isLoading: isSubmitting }] = useSubmitActivityLogNotesMutation();
  const { data: activityLog, isLoading } = useGetSingleActivityLogQuery(activityLogId, {
    skip: !activityLogId,
  });

  const clientInfo = useMemo(
    () => clientInfoFromMetadata(activityLog?.metadata),
    [activityLog?.metadata],
  );

  useEffect(() => {
    if (activityLog && activityLog.notes.length > 0) {
      const note = activityLog.notes[activityLog.notes.length - 1];
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

  const readOnly = activityLog?.status && activityLog.status !== "active";

  return (
    <div className="space-y-6">
      <HhaNoteHeader
        agencyName={activityLog?.metadata?.agencyName ?? user?.agency?.name ?? ""}
        title={getNoteTitle("hha-personal-care")}
        client={clientInfo}
      />

      <div>
        <p className="mb-3 text-[14px] font-semibold text-[#10141a] font-['Urbanist',sans-serif]">
          Personal care activities performed
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CHHA_PERSONAL_CARE_ACTIVITIES.map((activity) => {
            const checked = checkedActivities.includes(activity);
            return (
              <label
                key={activity}
                className={`flex cursor-pointer items-center gap-3 rounded-[10px] border p-3 text-[14px] font-medium font-['Urbanist',sans-serif] transition-colors ${
                  checked ? "border-[#00b4b8] bg-[rgba(0,180,184,0.08)]" : "border-[#e1e3e8] bg-white"
                } ${readOnly ? "pointer-events-none opacity-80" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={Boolean(readOnly)}
                  onChange={() => toggleActivity(activity)}
                  className="h-4 w-4 accent-[#00b4b8]"
                />
                <span className="text-[#10141a]">{activity}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="max-w-md">
        <label className="mb-1 block text-[12px] font-normal text-[#10141a] font-['Urbanist',sans-serif]">
          Completed by
        </label>
        <Input type="text" value={user?.fullName ?? ""} disabled className="h-11 rounded-xl" />
        <p className="mt-2 text-[12px] font-normal text-black font-['Urbanist',sans-serif]">
          {format(new Date(), "MMMM d, yyyy")}
        </p>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-[60px] bg-[#b2b2b3] px-6 py-2 text-[12px] font-semibold text-white font-['Urbanist',sans-serif]"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="cursor-pointer rounded-[60px] bg-[#00b4b8] px-6 py-2 text-[12px] font-semibold text-white font-['Urbanist',sans-serif]"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      )}
    </div>
  );
}
