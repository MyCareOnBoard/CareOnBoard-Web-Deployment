import type { BadgeTone } from "./x12ExportUtils";

const TONE_CLASS: Record<BadgeTone, string> = {
  success: "bg-[#ecfdf3] text-[#027a48]",
  warning: "bg-[#fffaeb] text-[#b54708]",
  danger: "bg-[#fef3f2] text-[#b42318]",
  neutral: "bg-[#f2f4f7] text-[#344054]",
};

/** Small pill for validation and NJMMIS status on 837P files. */
export default function X12StatusBadge({ label, tone, title }: { label: string; tone: BadgeTone; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-medium ${TONE_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}
