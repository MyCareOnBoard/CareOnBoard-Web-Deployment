import {useState} from 'react';
import {careerUncertain} from '@/lib/api/career-planning';
import { useNoteOperation } from '@/lib/notes/useNoteOperation';
import { CornerDownLeft } from "lucide-react";
import { useApproveSubmittedNotesMutation, useRejectSubmittedNotesMutation } from "@/pages/agency/notes/api";
import type { GoalAlignmentInput } from "@/pages/agency/notes/apiTypes";

interface EditableNoteActionsProps {
  submissionId: string;
  onEdit: () => void;
  canEdit?: boolean;
  /** Community inclusion / day program reviews: sent with approve and return. */
  goalAlignment?: GoalAlignmentInput;
}

export default function EditableNoteActions({ submissionId, onEdit, canEdit = true, goalAlignment }: EditableNoteActionsProps) {
  const [approveNotes, { isLoading: isApproving }] = useApproveSubmittedNotesMutation();
  const [rejectNotes, { isLoading: isRejecting }] = useRejectSubmittedNotesMutation();
  const operation = useNoteOperation();
  const [unknownAction,setUnknownAction]=useState<'approve'|'return'|null>(null);
  const [errorMessage,setErrorMessage]=useState('');
  const isMutating = operation.pending || isApproving || isRejecting;

  const approve = async () => {
    try {
      await operation.run({action: 'approve', resourceId: submissionId}, operationId => approveNotes({submissionId, operationId, goalAlignment}).unwrap());
      setUnknownAction(null);setErrorMessage('');
    } catch (error) {
      setUnknownAction(careerUncertain(error)?'approve':null);setErrorMessage(careerUncertain(error)?'Approval could not be confirmed. Check approval before another action.':'Unable to approve these notes. Please try again.');
    }
  };

  const reject = async () => {
    try {
      await operation.run({action: 'return', resourceId: submissionId}, operationId => rejectNotes({submissionId, operationId, goalAlignment}).unwrap());
      setUnknownAction(null);setErrorMessage('');
    } catch (error) {
      setUnknownAction(careerUncertain(error)?'return':null);setErrorMessage(careerUncertain(error)?'Return could not be confirmed. Check return before another action.':'Unable to return these notes. Please try again.');
    }
  };

  return (
    <>
      {canEdit && <button
        disabled={isMutating||Boolean(unknownAction)}
        onClick={onEdit}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 border border-[#dcdfe2] bg-white text-[#10141a] hover:bg-[#f4f6f7] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5"
      >
        Edit
      </button>}
      <button
        onClick={() => void approve()}
        disabled={isMutating||unknownAction==='return'}
        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 bg-[#003839] text-white hover:bg-[#0b4c4d] dark:bg-[#0f7e7d] dark:hover:bg-[#13908f] ${isMutating ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {isApproving ? "Approving..." : unknownAction==='approve' ? "Check approval" : "Approve"}
      </button>
      <button
        onClick={() => void reject()}
        disabled={isMutating||unknownAction==='approve'}
        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 border border-[#f1c4bf] bg-white text-[#b42318] hover:bg-[#fdf2f1] dark:border-[#f8a1a1]/30 dark:bg-transparent dark:text-[#f8a1a1] ${isMutating ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <CornerDownLeft aria-hidden="true" size={14} />
        {isRejecting ? "Returning..." : unknownAction==='return' ? "Check return" : canEdit ? "Return" : "Return for correction"}
      </button>
      {errorMessage&&<p role="alert" className="text-sm text-[#b42318] dark:text-[#f8a1a1]">{errorMessage}</p>}
    </>
  );
}
