import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { useUpdateSubmittedNoteMutation } from "@/pages/agency/notes/api";
import { SubmittedNoteDetails } from "@/pages/agency/notes/apiTypes";
import { CHHA_PERSONAL_CARE_ACTIVITIES } from "@/lib/notes/hhaPersonalCareActivities";
import { getNoteTitle } from "@/lib/notes/noteTypes";
import HhaNoteHeader, { HhaNoteInfoItem } from "@/pages/userPanel/notes/components/HhaNoteHeader";

interface AgencyPersonalCareNoteProps {
  submissionId: string | null;
  isLoading: boolean;
  submittedNote?: SubmittedNoteDetails;
}

export default function AgencyPersonalCareNote({
  submissionId,
  isLoading,
  submittedNote,
}: AgencyPersonalCareNoteProps) {
  const [checkedActivities, setCheckedActivities] = useState<string[]>([]);
  const [noteId, setNoteId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [mutateNote] = useUpdateSubmittedNoteMutation();

  const isEditable = submittedNote?.status === "submitted";

  const infoItems = useMemo<HhaNoteInfoItem[]>(
    () => [
      { label: "Client name", value: submittedNote?.metadata?.clientName || submittedNote?.metadata?.individual || "" },
      { label: "Address", value: submittedNote?.metadata?.clientAddress || "" },
      { label: "Service code", value: submittedNote?.metadata?.serviceCode || "" },
      { label: "Shift date", value: submittedNote?.metadata?.shiftDate || "" },
      { label: "Clocked in", value: submittedNote?.metadata?.clockedInAt || submittedNote?.metadata?.shiftStartTime || "" },
      { label: "Clocked out", value: submittedNote?.metadata?.clockedOutAt || submittedNote?.metadata?.shiftEndTime || "" },
    ],
    [submittedNote?.metadata],
  );

  useEffect(() => {
    if (!isLoading && submittedNote && submittedNote.notes.length > 0) {
      const note = submittedNote.notes[0];
      setNoteId(note.id);
      setStartDate(note.startDate ?? "");
      setCheckedActivities(note?.metadata?.checkedActivities ?? []);
    }
  }, [isLoading, submittedNote]);

  const toggleActivity = async (activity: string) => {
    if (!isEditable || !submissionId || !noteId) return;
    const next = checkedActivities.includes(activity)
      ? checkedActivities.filter((a) => a !== activity)
      : [...checkedActivities, activity];
    setCheckedActivities(next);
    try {
      await mutateNote({
        submissionId,
        data: {
          id: noteId,
          startDate: startDate || format(new Date(), "yyyy-MM-dd"),
          endDate: startDate || format(new Date(), "yyyy-MM-dd"),
          metadata: { ...(submittedNote?.notes?.[0]?.metadata ?? {}), checkedActivities: next },
        },
      }).unwrap();
    } catch (error) {
      console.error("Error updating personal care note:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-[300px] pb-10">
      <HhaNoteHeader
        agencyName={submittedNote?.metadata?.agencyName ?? ""}
        title={getNoteTitle("hha-personal-care")}
        items={infoItems}
      />

      <div className="mt-6 rounded-[20px] border border-white bg-[#FFFFFF4D] p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">
            Personal care activities performed
          </p>
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
                className={`flex items-center gap-3 rounded-[12px] border px-4 py-3 text-[14px] font-medium ${
                  checked ? "border-[#00b4b8] bg-[rgba(0,180,184,0.08)]" : "border-[#e1e3e8] bg-white"
                } ${isEditable ? "cursor-pointer" : "pointer-events-none opacity-90"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!isEditable}
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

      <div className="mt-6 rounded-[20px] border border-white bg-[#FFFFFF4D] p-6 shadow-sm">
        <p className="mb-1.5 text-[12px] font-medium leading-[1.4] text-[#808081]">Submitted by</p>
        <p className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">
          {submittedNote?.employee?.fullName || "—"}
        </p>
        <p className="mt-1 text-[13px] font-medium leading-[1.4] text-[#808081]">
          {submittedNote?.submittedAt
            ? new Date(submittedNote.submittedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : ""}
        </p>
      </div>
    </div>
  );
}
