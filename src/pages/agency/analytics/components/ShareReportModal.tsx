import React, { useState } from "react";

import { Check, Copy, Link } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShareReportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ShareReportModal({
  open,
  onClose,
}: ShareReportModalProps) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for browsers that don't support clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent
        className="
          fixed
          !left-auto
          !right-6
          !top-6
          !translate-x-0
          !translate-y-0

          w-[520px]
          max-w-[calc(100vw-32px)]

          rounded-[32px]
          border-none
          bg-white
          p-0

          shadow-[0_20px_80px_rgba(15,23,42,0.12)]
        "
      >
        <DialogHeader className="space-y-0">
          <div className="flex items-center justify-between px-6 py-6">
            <div>
              <DialogTitle className="text-left text-[28px] font-semibold text-[#111827]">
                Share report
              </DialogTitle>

              <p className="mt-2 text-[15px] text-[#374151]">
                Share this analytics report with your team
              </p>
            </div>
          </div>

          <div className="h-[1px] w-full bg-[#12B5B0]" />
        </DialogHeader>

        <div className="px-6 pt-6 pb-8 space-y-6">
          {/* Link */}
          <div>
            <label className="mb-3 block text-[15px] font-medium text-[#111827]">
              Report link
            </label>

            <div
              className="
                flex items-center gap-3
                rounded-2xl border border-[#E5E7EB]
                bg-[#F9FAFB]
                px-4 py-3
              "
            >
              <Link className="h-5 w-5 shrink-0 text-[#6B7280]" />

              <span className="flex-1 truncate text-[14px] text-[#374151]">
                {url}
              </span>

              <button
                onClick={copyLink}
                className="
                  flex shrink-0 items-center gap-2
                  rounded-xl bg-[#12B5B0]
                  px-3 py-2
                  text-[13px] font-medium text-white
                  transition-all hover:bg-[#0FA5A0]
                "
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="
              flex h-[52px] w-full items-center justify-center
              rounded-full
              bg-[#12B5B0]
              text-[16px] font-medium text-white
              transition-all hover:bg-[#0FA5A0]
            "
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}