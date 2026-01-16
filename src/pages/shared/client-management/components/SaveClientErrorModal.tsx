import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(90vw,426px)] gap-6 p-5"
      >
        <div className="relative inline-grid h-[100px] w-[100px] shrink-0">
          <div className="absolute inset-0 rounded-full bg-[#fef2f2]" />
          <div className="absolute left-[14.5px] top-[14px] flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-[#d53411]">
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
          <p className="text-[32px] font-semibold leading-normal text-[#10141a]">
            Error Saving Client
          </p>
          <p className="whitespace-pre-wrap text-[16px] font-medium leading-[1.6] text-[#808081]">
            {message}
          </p>
          <Button
            onClick={() => onOpenChange(false)}
            className="mt-2 h-11 rounded-[60px] bg-[#00b4b8] text-white hover:bg-[#00a0a4] px-6"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
