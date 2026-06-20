import React, { useMemo } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { SubmittedNoteDetails } from "@/pages/agency/notes/apiTypes";
import { getNoteTitle } from "@/lib/notes/noteTypes";
import type { ClientBasicInfo } from "@/lib/notes/clientBasicInfo";
import HhaNoteHeader from "@/pages/userPanel/notes/components/HhaNoteHeader";

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
  const clientInfo = useMemo<ClientBasicInfo>(
    () => ({
      name: submittedNote?.metadata?.clientName || submittedNote?.metadata?.individual || "",
      dob: submittedNote?.metadata?.clientDob || "",
      address: submittedNote?.metadata?.clientAddress || "",
      phone: submittedNote?.metadata?.clientPhone || "",
    }),
    [submittedNote?.metadata],
  );

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
        client={clientInfo}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReadOnlyField label="Service code" value={submittedNote?.metadata?.serviceCode ?? ""} />
        <ReadOnlyField label="Shift start time" value={submittedNote?.metadata?.shiftStartTime ?? ""} />
        <ReadOnlyField label="Shift end time" value={submittedNote?.metadata?.shiftEndTime ?? ""} />
        <ReadOnlyField label="Service goal" value={submittedNote?.metadata?.serviceGoal ?? ""} />
      </div>

      <div className="mt-8 overflow-x-auto">
        <div className="min-w-[700px] rounded-[6px] border border-[#b2b2b3]">
          <div className="grid grid-cols-[140px_220px_1fr] bg-[#eef4f5]">
            <div className="border-b border-r border-[#b2b2b3] px-4 py-3 text-center text-[14px] text-black font-['Urbanist',sans-serif]">
              Date
            </div>
            <div className="border-b border-r border-[#b2b2b3] px-4 py-3 text-center text-[14px] text-black font-['Urbanist',sans-serif]">
              Activity
            </div>
            <div className="border-b border-[#b2b2b3] px-4 py-3 text-center text-[14px] text-black font-['Urbanist',sans-serif]">
              Description
            </div>
          </div>
          {rows.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-[#808081] font-['Urbanist',sans-serif]">
              No activities recorded.
            </div>
          ) : (
            rows.map((note) => (
              <div key={note.id} className="grid grid-cols-[140px_220px_1fr] bg-white">
                <div className="border-b border-r border-[#b2b2b3] px-4 py-3 text-[14px] text-[#10141a] font-['Urbanist',sans-serif]">
                  {note.startDate ? format(new Date(note.startDate), "dd.MM.yy") : ""}
                </div>
                <div className="border-b border-r border-[#b2b2b3] px-4 py-3 text-[14px] text-[#10141a] font-['Urbanist',sans-serif]">
                  {note.metadata?.activity ?? ""}
                </div>
                <div className="border-b border-[#b2b2b3] px-4 py-3 text-[14px] text-[#10141a] font-['Urbanist',sans-serif]">
                  {note.metadata?.description ?? ""}
                </div>
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
