import React from "react";
import { Input } from "@/components/ui/input";
import { SubmittedNoteDetails } from "@/pages/agency/notes/apiTypes";
import { getNoteTitle } from "@/lib/notes/noteTypes";
import HhaNoteHeader, { InfoField } from "@/pages/userPanel/notes/components/HhaNoteHeader";

interface AgencyHhaServiceActivityLogProps {
  submissionId: string | null;
  isLoading: boolean;
  submittedNote?: SubmittedNoteDetails;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-normal text-[#10141a] font-['Urbanist',sans-serif]">{label}</label>
      <Input type="text" value={value} disabled className="h-11 rounded-xl bg-[#fafbfc]" />
    </div>
  );
}

export default function AgencyHhaServiceActivityLog({
  isLoading,
  submittedNote,
}: AgencyHhaServiceActivityLogProps) {
  const rows = submittedNote?.notes ?? [];

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
        title={getNoteTitle("hha-service-log")}
        items={[]}
      />

      <div className="mt-6 flex flex-col gap-4">
        <InfoField
          label="Client name"
          value={submittedNote?.metadata?.clientName || submittedNote?.metadata?.individual || ""}
        />
        <InfoField label="Address" value={submittedNote?.metadata?.clientAddress || ""} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ReadOnlyField label="Service code" value={submittedNote?.metadata?.serviceCode ?? ""} />
        <ReadOnlyField label="Shift start time" value={submittedNote?.metadata?.shiftStartTime ?? ""} />
        <ReadOnlyField label="Shift end time" value={submittedNote?.metadata?.shiftEndTime ?? ""} />
      </div>

      <div className="mt-4">
        <ReadOnlyField label="Service goal" value={submittedNote?.metadata?.serviceGoal ?? ""} />
      </div>

      <div className="mt-8">
        <div className="rounded-[6px] border border-[#b2b2b3]">
          <div className="border-b border-[#b2b2b3] bg-[#eef4f5] px-4 py-3 text-center text-[14px] text-black font-['Urbanist',sans-serif]">
            Describe the day and how the activities helped the individual work toward the service goal above.
          </div>
          {rows.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-[#808081] font-['Urbanist',sans-serif]">
              No activities recorded.
            </div>
          ) : (
            rows.map((note) => (
              <div
                key={note.id}
                className="border-b border-[#b2b2b3] px-4 py-3 text-[14px] text-[#10141a] font-['Urbanist',sans-serif] whitespace-pre-wrap"
              >
                {[note.metadata?.activity, note.metadata?.description].filter(Boolean).join(" — ")}
              </div>
            ))
          )}
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
