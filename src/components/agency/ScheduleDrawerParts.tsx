import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared look for the Add schedule drawer and its group outing form. */
export const DRAWER_LABEL = "text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]";
export const DRAWER_FIELD =
  "flex h-11 w-full items-center gap-2.5 rounded-[10px] border border-[#dcdfe2] bg-white px-3.5 text-left text-[14px] text-[#10141a] outline-none transition-colors focus-visible:border-[#0b8a8c] focus-visible:ring-2 focus-visible:ring-[#0b8a8c]/20 disabled:cursor-not-allowed disabled:bg-[#f4f5f6] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7]";
export const DRAWER_HINT = "text-[12px] text-[#5b636b] dark:text-[#9aa4a8]";
export const DRAWER_ERROR = "text-[12px] text-[#b42318] dark:text-[#ffb4a9]";
export const DRAWER_PRIMARY =
  "inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#003839] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#00494a] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#00a3a7] dark:text-[#06292a]";
export const DRAWER_SECONDARY =
  "inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#dcdfe2] bg-white px-4 text-[14px] font-semibold text-[#10141a] transition-colors hover:bg-[#f4f5f6] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7]";

/** A titled band ("CLIENT AND SERVICE") and its fields. */
export function DrawerSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title}>
      <h3 className="bg-[#f4f5f6] px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5b636b] dark:bg-white/5 dark:text-[#9aa4a8]">
        {title}
      </h3>
      <div className={cn("flex flex-col gap-4 px-6 py-4", className)}>{children}</div>
    </section>
  );
}

/** Two-up segmented choice, e.g. One time | Recurring. */
export function DrawerSegmented<T extends string>({ label, value, options, onChange, disabled, invalid }: {
  label: string;
  value: T | "" | undefined;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "grid gap-1 rounded-[10px] bg-[#f4f5f6] p-1 dark:bg-white/5",
        invalid && "ring-1 ring-[#b42318]",
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 cursor-pointer rounded-[8px] text-[14px] transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              selected
                ? "bg-white font-medium text-[#10141a] shadow-sm dark:bg-[#1b232b] dark:text-[#f4f6f7]"
                : "text-[#5b636b] hover:text-[#10141a] dark:text-[#9aa4a8]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Grey-blue summary box ("12 shifts will be created …"). */
export function DrawerNote({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  return (
    <div
      role="status"
      className={cn(
        "flex gap-2.5 rounded-[10px] px-3.5 py-3 text-[13px] leading-relaxed",
        tone === "info"
          ? "bg-[#dfe5ee] text-[#22344a] dark:bg-[#1d2d40] dark:text-[#c3d4ea]"
          : "bg-[#fff4d6] text-[#8a5a00] dark:bg-[#3d2f0a] dark:text-[#ffd27a]",
      )}
    >
      <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
