import React from "react";
import { X } from "lucide-react";
import PersonalCareNoteForm from "@/pages/userPanel/notes/hha-personal-care/PersonalCareNoteForm";

interface PersonalCareNoteModalProps {
  isOpen: boolean;
  activityLogId: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}

/**
 * Shown immediately after a DSP clocks out of a personal-care shift. Wraps the
 * shared PersonalCareNoteForm so the aide checks what they did and submits.
 */
export function PersonalCareNoteModal({
  isOpen,
  activityLogId,
  onClose,
  onSubmitted,
}: PersonalCareNoteModalProps) {
  if (!isOpen || !activityLogId) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-[#b2b2b3] p-2 text-white hover:bg-[#9a9a9b]"
          >
            <X className="h-5 w-5" />
          </button>
          <PersonalCareNoteForm activityLogId={activityLogId} onSubmitted={onSubmitted} />
        </div>
      </div>
    </>
  );
}
