import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SaveClientErrorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorMessage?: string;
};

export function SaveClientErrorModal({
  open,
  onOpenChange,
  errorMessage,
}: SaveClientErrorModalProps) {
  const message = errorMessage || "Failed to save client. Please try again.";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[min(90vw,426px)] gap-6 p-5 bg-white rounded-[24px] border-none">
        <div className="relative inline-grid h-[100px] w-[100px] shrink-0 mx-auto">
          <div className="absolute inset-0 rounded-full bg-[#fef2f2]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-[#d53411]">
            <svg
              className="h-6 w-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="flex w-full flex-col items-center text-center gap-4">
          <AlertDialogTitle className="text-[32px] font-semibold leading-normal text-[#10141a]">
            Error Saving Client
          </AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap text-[16px] font-medium leading-[1.6] text-[#808081]">
            {message}
          </AlertDialogDescription>
          <AlertDialogAction
            onClick={() => onOpenChange(false)}
            className="mt-2 h-11 rounded-[60px] bg-[#00b4b8] text-white hover:bg-[#00a0a4] px-6"
          >
            Close
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
