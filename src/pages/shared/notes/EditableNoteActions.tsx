import { CornerDownLeft } from "lucide-react";
import { useApproveSubmittedNotesMutation, useRejectSubmittedNotesMutation } from "@/pages/agency/notes/api";

interface EditableNoteActionsProps {
  submissionId: string;
  onEdit: () => void;
}

export default function EditableNoteActions({ submissionId, onEdit }: EditableNoteActionsProps) {
  const [approveNotes, { isLoading: isApproving }] = useApproveSubmittedNotesMutation();
  const [rejectNotes, { isLoading: isRejecting }] = useRejectSubmittedNotesMutation();
  const isMutating = isApproving || isRejecting;

  const approve = async () => {
    try {
      await approveNotes(submissionId).unwrap();
    } catch (error) {
      console.error("Failed to approve notes:", error);
      alert("Failed to approve notes. Please try again.");
    }
  };

  const reject = async () => {
    try {
      await rejectNotes(submissionId).unwrap();
    } catch (error) {
      console.error("Failed to return notes:", error);
      alert("Failed to return notes. Please try again.");
    }
  };

  return (
    <>
      <button
        onClick={onEdit}
        className="cursor-pointer rounded-full bg-[#B2B2B3] px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#9a9a9b]"
      >
        Edit
      </button>
      <button
        onClick={() => void approve()}
        disabled={isMutating}
        className={`rounded-full bg-[#0EAF52] px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#0c9644] ${isMutating ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {isApproving ? "Approving..." : "Approve"}
      </button>
      <button
        onClick={() => void reject()}
        disabled={isMutating}
        className={`flex items-center gap-1 rounded-full bg-[#FF6900] px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#e55f00] ${isMutating ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <CornerDownLeft size={14} />
        {isRejecting ? "Returning..." : "Return"}
      </button>
    </>
  );
}
