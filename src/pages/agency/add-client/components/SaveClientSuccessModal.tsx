import React from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";

type SaveClientSuccessModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName?: string;
};

export function SaveClientSuccessModal({
  open,
  onOpenChange,
  clientName,
}: SaveClientSuccessModalProps) {
  const subtitle = clientName
    ? `You have saved ${clientName}\nas a client in your database`
    : `You have saved the client\nas a client in your database`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(90vw,426px)] gap-6 p-5"
      >
        {/* Success Icon */}
        <div className="relative inline-grid h-[100px] w-[100px] shrink-0">
          <div className="absolute inset-0 rounded-full bg-[#f0faf4]" />
          <div className="absolute left-[14.5px] top-[14px] flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-[#0eaf52]">
            <svg
              className="h-6 w-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="flex w-full flex-col items-center text-center">
          <p className="text-[32px] font-semibold leading-normal text-[#10141a]">
            Client Added
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[16px] font-medium leading-[1.6] text-[#808081]">
            {subtitle}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}


