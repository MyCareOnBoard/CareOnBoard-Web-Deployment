import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { useUpdateSubmittedNoteMutation } from "@/pages/agency/notes/api";
import { SubmittedNoteDetails } from "@/pages/agency/notes/apiTypes";
import { CHHA_PERSONAL_CARE_ACTIVITIES } from "@/lib/notes/hhaPersonalCareActivities";
import { getNoteTitle } from "@/lib/notes/noteTypes";
import type { ClientBasicInfo } from "@/lib/notes/clientBasicInfo";
import HhaNoteHeader from "@/pages/userPanel/notes/components/HhaNoteHeader";

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

  const clientInfo = useMemo<ClientBasicInfo>(
    () => ({
      name: submittedNote?.metadata?.clientName || submittedNote?.metadata?.individual || "",
      dob: submittedNote?.metadata?.clientDob || "",
      address: submittedNote?.metadata?.clientAddress || "",
      phone: submittedNote?.metadata?.clientPhone || "",
    }),
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
        client={clientInfo}
      />

      <div className="mt-6">
        <p className="mb-3 text-[14px] font-semibold text-[#10141a] font-['Urbanist',sans-serif]">
          Personal care activities performed
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CHHA_PERSONAL_CARE_ACTIVITIES.map((activity) => {
            const checked = checkedActivities.includes(activity);
            return (
              <label
                key={activity}
                className={`flex items-center gap-3 rounded-[10px] border p-3 text-[14px] font-medium font-['Urbanist',sans-serif] ${
                  checked ? "border-[#00b4b8] bg-[rgba(0,180,184,0.08)]" : "border-[#e1e3e8] bg-white"
                } ${isEditable ? "cursor-pointer" : "pointer-events-none opacity-90"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!isEditable}
                  onChange={() => toggleActivity(activity)}
                  className="h-4 w-4 accent-[#00b4b8]"
                />
                <span className="text-[#10141a]">{activity}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <label className="mb-1 block text-[12px] font-normal text-[#10141a] font-['Urbanist',sans-serif]">
          Submitted by
        </label>
        <Input type="text" value={submittedNote?.employee?.fullName || ""} disabled className="max-w-md" />
        <p className="mt-2 text-[12px] font-normal text-black font-['Urbanist',sans-serif]">
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
