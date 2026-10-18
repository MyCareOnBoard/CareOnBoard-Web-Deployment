import type { ReactNode } from "react";
import { FileCode2, FileText, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClaimReportDownloadAction = {
  label: string;
  /** What the file is for, shown under the label. */
  detail: string;
  busy: boolean;
  onClick: () => void;
};

type ClaimReportActionsFooterProps = {
  /** Save status or lock note, shown on the left. */
  status?: ReactNode;
  /** Shown above the buttons, e.g. why the 837P file couldn't be made. */
  notice?: ReactNode;
  pdf: ClaimReportDownloadAction;
  /** Hidden when the user can't export this claim. */
  x12?: ClaimReportDownloadAction | null;
  onSend: () => void;
  onClose: () => void;
};

const BUTTON_CLASS =
  "inline-flex min-h-[48px] w-full cursor-pointer items-center gap-3 rounded-[10px] px-4 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";
const OUTLINE_CLASS = "border border-[#e5e5e6] bg-white text-[#10141a] hover:bg-[#eef4f5]";

function DownloadButton({
  action,
  icon,
  className,
}: {
  action: ClaimReportDownloadAction;
  icon: ReactNode;
  className: string;
}) {
  return (
    <button
      type="button"
      disabled={action.busy}
      aria-busy={action.busy}
      aria-label={`${action.label}. ${action.detail}`}
      onClick={action.onClick}
      className={cn(BUTTON_CLASS, "sm:max-w-[300px]", className)}
    >
      {icon}
      <span className="flex min-w-0 flex-col">
        <span className="text-[14px] font-medium leading-5">{action.label}</span>
        <span className="truncate text-[12px] leading-4 opacity-80">{action.detail}</span>
      </span>
    </button>
  );
}

/**
 * Pinned footer of the claim report. It sits outside the print root and is
 * marked no-print, so it never shows in the PDF.
 */
export default function ClaimReportActionsFooter({
  status = null,
  notice = null,
  pdf,
  x12 = null,
  onSend,
  onClose,
}: ClaimReportActionsFooterProps) {
  return (
    <footer className="claim-report-no-print shrink-0 space-y-3 border-t border-[#e5e5e6] bg-white px-4 py-4 sm:px-6">
      {notice ? <div className="max-h-[30dvh] overflow-y-auto">{notice}</div> : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-h-[20px] text-[13px] text-[#808081]">{status}</div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={cn(BUTTON_CLASS, OUTLINE_CLASS, "justify-center text-[14px] font-medium")}
          >
            Close
          </button>
          <DownloadButton
            action={pdf}
            className={OUTLINE_CLASS}
            icon={<FileText className="h-5 w-5 shrink-0 text-[#00b4b8]" aria-hidden />}
          />
          {x12 ? (
            <DownloadButton
              action={x12}
              className={OUTLINE_CLASS}
              icon={<FileCode2 className="h-5 w-5 shrink-0 text-[#00b4b8]" aria-hidden />}
            />
          ) : null}
          <button
            type="button"
            onClick={onSend}
            className={cn(
              BUTTON_CLASS,
              "justify-center bg-[#00b4b8] text-[14px] font-medium text-white hover:bg-[#009da1] active:bg-[#009199]",
            )}
          >
            <Send className="h-4 w-4 shrink-0" aria-hidden />
            Send claim report
          </button>
        </div>
      </div>
    </footer>
  );
}
