import {useState} from 'react';
import {careerUncertain} from '@/lib/api/career-planning';
import { useNoteOperation } from '@/lib/notes/useNoteOperation';
import { CornerDownLeft } from "lucide-react";
import { useApproveSubmittedNotesMutation, useRejectSubmittedNotesMutation } from "@/pages/agency/notes/api";

interface EditableNoteActionsProps {
  submissionId: string;
  onEdit: () => void;
  canEdit?: boolean;
}

export default function EditableNoteActions({ submissionId, onEdit, canEdit = true }: EditableNoteActionsProps) {
  const [approveNotes, { isLoading: isApproving }] = useApproveSubmittedNotesMutation();
  const [rejectNotes, { isLoading: isRejecting }] = useRejectSubmittedNotesMutation();
  const operation = useNoteOperation();
  const [unknownAction,setUnknownAction]=useState<'approve'|'return'|null>(null);
  const [errorMessage,setErrorMessage]=useState('');
  const isMutating = operation.pending || isApproving || isRejecting;

  const approve = async () => {
    try {
      await operation.run({action: 'approve', resourceId: submissionId}, operationId => approveNotes({submissionId, operationId}).unwrap());
      setUnknownAction(null);setErrorMessage('');
    } catch (error) {
      setUnknownAction(careerUncertain(error)?'approve':null);setErrorMessage(careerUncertain(error)?'Approval could not be confirmed. Check approval before another action.':'Unable to approve these notes. Please try again.');
    }
  };

  const reject = async () => {
    try {
      await operation.run({action: 'return', resourceId: submissionId}, operationId => rejectNotes({submissionId, operationId}).unwrap());
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
        className="cursor-pointer rounded-full bg-[#B2B2B3] px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#9a9a9b]"
      >
        Edit
      </button>}
      <button
        onClick={() => void approve()}
        disabled={isMutating||unknownAction==='return'}
        className={`rounded-full bg-[#0EAF52] px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#0c9644] ${isMutating ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {isApproving ? "Approving..." : unknownAction==='approve' ? "Check approval" : "Approve"}
      </button>
      <button
        onClick={() => void reject()}
        disabled={isMutating||unknownAction==='approve'}
        className={`flex items-center gap-1 rounded-full bg-[#FF6900] px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#e55f00] ${isMutating ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <CornerDownLeft size={14} />
        {isRejecting ? "Returning..." : unknownAction==='return' ? "Check return" : canEdit ? "Return" : "Return for correction"}
      </button>
      {errorMessage&&<p role="alert" className="text-sm">{errorMessage}</p>}
    </>
  );
}
