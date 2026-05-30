import { cn } from "@/lib/utils";

/** Shared card shell — aligned with ProfileSectionCard */
export const settingsCardShellClass = cn(
  "flex flex-col overflow-hidden rounded-2xl border border-[#e8eaed]/80 bg-white",
  "shadow-[0_1px_3px_rgba(16,20,26,0.06),0_8px_24px_rgba(16,20,26,0.04)]",
  "[content-visibility:auto] [contain-intrinsic-size:auto_320px]",
);

export const settingsCardHeaderClass = "border-b border-[#eef0f2] px-5 py-4 sm:px-6";

export const settingsCardTitleClass =
  "text-[17px] font-semibold tracking-tight text-[#10141a] sm:text-lg";

export const settingsCardSubtitleClass = "mt-0.5 text-[13px] leading-snug text-[#808081]";

export const settingsCardBodyClass = "px-5 py-4 sm:px-6 sm:py-5";

export const settingsFieldLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.05em] text-[#808081]";

export const settingsFieldDescriptionClass = "mt-1 text-[13px] leading-snug text-[#808081]";

export const settingsAlertInfoClass =
  "flex items-start gap-2 rounded-xl border border-[#00b4b8]/20 bg-[#e8fafa] p-3 text-sm text-[#10141a]";

export const settingsAlertErrorClass =
  "flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600";

export const settingsTabPillActiveClass =
  "h-9 rounded-[60px] border border-[#00b4b8] bg-[#00b4b8] px-4 text-[12px] font-medium leading-[1.4] text-white backdrop-blur-[22px]";

export const settingsTabPillInactiveClass =
  "h-9 rounded-[60px] border border-[#b2b2b3] px-4 text-[12px] font-medium leading-[1.4] text-[#b2b2b3] backdrop-blur-[22px] hover:border-[#808081] hover:text-[#808081]";

export const settingsActionBtnClass =
  "h-9 min-h-9 rounded-lg px-3.5 text-[13px] font-medium shadow-none transition-colors focus-visible:ring-offset-0";
