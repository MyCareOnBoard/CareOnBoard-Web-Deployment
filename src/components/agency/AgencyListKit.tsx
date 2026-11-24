import type { ReactNode } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Dark teal primary action (page header buttons, dialog submit). */
export const agencyPrimaryButton = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#003839] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#0b4c4d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0f7e7d] dark:hover:bg-[#13908f]";
/** White outlined secondary action. */
export const agencyOutlineButton = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#dcdfe2] bg-white px-4 text-[14px] font-semibold text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5";
/** Text field / select box in the agency style. */
export const agencyField = "w-full rounded-[10px] border border-[#dcdfe2] bg-white px-3.5 text-[14px] text-[#10141a] placeholder:text-[#9aa1a7] outline-none transition-colors focus:border-[#007679] focus:ring-2 focus:ring-[#007679]/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-[#151c22] dark:text-[#f4f6f7]";
/** Teal underlined row link ("Route", "Remind", "View"). */
export const agencyRowLink = "inline-flex cursor-pointer items-center gap-1 rounded text-[14px] font-medium text-[#007679] underline underline-offset-4 hover:text-[#005c5e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#7fd3d3]";
/** Round "…" menu trigger at the end of a row. */
export const agencyRowMenuButton = "grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-[#e4e7ea] text-[#4b535b] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:opacity-60 dark:border-white/15 dark:text-[#c9d1d4] dark:hover:bg-white/5";
/** Dropdown menu item. */
export const agencyMenuItem = "flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[14px] text-[#10141a] dark:text-[#f4f6f7]";
export const agencyMenuContent = "z-[70] min-w-[190px] rounded-[12px] border-[#e4e7ea] bg-white p-1.5 dark:border-white/10 dark:bg-[#1b232b]";

/** White bordered card that holds a toolbar, a table and a footer. */
export function AgencyListCard({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cn("min-w-0 overflow-hidden rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]", className)}>
      {children}
    </section>
  );
}

/** Grey segmented control; each option can show a count. */
export function AgencySegmented<T extends string>({ label, value, onChange, options, className }: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex max-w-full overflow-x-auto rounded-[12px] bg-[#f4f5f6] p-1 dark:bg-white/5", className)}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button key={option.value} type="button" aria-pressed={on} onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[9px] px-3 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679]",
              on ? "bg-white font-medium text-[#10141a] shadow-[0_1px_2px_rgba(16,20,26,0.08)] dark:bg-[#1b232b] dark:text-[#f4f6f7]"
                : "text-[#4b535b] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]",
            )}>
            {option.label}
            {option.count !== undefined && (
              <span className={cn(
                "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[12px] font-medium tabular-nums",
                on ? "bg-[#0f7e7d] text-white" : "bg-[#e4e7ea] text-[#4b535b] dark:bg-white/10 dark:text-[#c9d1d4]",
              )}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AgencySearchField({ value, onChange, placeholder = "Search", label, className }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
}) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{label}</span>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b737a]" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(agencyField, "h-10 pl-10")} />
    </label>
  );
}

/** "Staff: All ▾": a native select (keyboard and screen readers for free) with a prefix label. */
export function AgencyFilterSelect({ label, value, onChange, options, className }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={cn("relative inline-flex h-10 min-w-0 items-center rounded-[10px] border border-[#dcdfe2] bg-white pl-3.5 text-[14px] text-[#10141a] focus-within:border-[#007679] focus-within:ring-2 focus-within:ring-[#007679]/15 dark:border-white/15 dark:bg-[#151c22] dark:text-[#f4f6f7]", className)}>
      <span className="shrink-0 text-[#4b535b] dark:text-[#9aa4a8]">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="h-full min-w-0 cursor-pointer appearance-none truncate bg-transparent pl-1 pr-9 outline-none">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 h-4 w-4 text-[#4b535b] dark:text-[#9aa4a8]" />
    </label>
  );
}

export type AgencyTone = "green" | "amber" | "red" | "grey" | "slate" | "teal";

const TONES: Record<AgencyTone, { pill: string; dot: string }> = {
  green: { pill: "bg-[#e6f6ec] text-[#1a7f37] dark:bg-[#30a46c]/15 dark:text-[#7ee2a8]", dot: "bg-[#30a46c]" },
  amber: { pill: "bg-[#fcf5dc] text-[#7a5800] dark:bg-[#e0b400]/15 dark:text-[#f0cf6b]", dot: "bg-[#e0b400]" },
  red: { pill: "bg-[#fde8e6] text-[#b42318] dark:bg-[#ef4444]/15 dark:text-[#f8a1a1]", dot: "bg-[#e5484d]" },
  grey: { pill: "bg-[#eef0f2] text-[#2a3138] dark:bg-white/10 dark:text-[#c9d1d4]", dot: "bg-[#6b737a]" },
  slate: { pill: "bg-[#e3e8f0] text-[#2a3a52] dark:bg-[#3e63dd]/15 dark:text-[#a9bdf5]", dot: "bg-[#4b5d78] dark:bg-[#a9bdf5]" },
  teal: { pill: "bg-[#e0f3f3] text-[#005c5e] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]", dot: "bg-[#0f7e7d]" },
};

/** Small status pill with a coloured dot. */
export function AgencyPill({ tone, children, className }: { tone: AgencyTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 text-[12px] font-medium", TONES[tone].pill, className)}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", TONES[tone].dot)} />{children}
    </span>
  );
}

export function initialsOf(name?: string | null) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)).toUpperCase();
}

/** Photo or initials disc, name and a grey second line (an ID or a role). */
export function AgencyPerson({ name, detail, imageUrl }: { name: string; detail?: ReactNode; imageUrl?: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e0f3f3] text-[13px] font-medium text-[#005c5e] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]">
          {initialsOf(name)}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-medium text-[#10141a] dark:text-[#f4f6f7]">{name}</span>
        {detail && <span className="mt-0.5 block truncate text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{detail}</span>}
      </span>
    </div>
  );
}

/** Page numbers to show: all when few, otherwise the ends and the neighbours of the current page. */
function pageList(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => { if (i && n - sorted[i - 1] > 1) out.push("gap"); out.push(n); });
  return out;
}

const pageButton = "inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-[8px] border border-[#dcdfe2] bg-white px-2.5 text-[13px] text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5";

/**
 * Footer: "Showing 5 of 44 trips" and Previous / 1 2 3 / Next. When the total is unknown
 * (pages omitted), it shows Previous / current page / Next and relies on hasNext.
 */
export function AgencyPagination({ summary, page, pages, hasNext, onPage, disabled }: {
  summary: ReactNode;
  page: number;
  /** Total pages, when the total is known. */
  pages?: number;
  /** Whether another page follows; used when pages is not known. */
  hasNext?: boolean;
  onPage: (page: number) => void;
  disabled?: boolean;
}) {
  const known = pages !== undefined;
  const showNav = known ? pages > 1 : page > 1 || !!hasNext;
  const nextDisabled = disabled || (known ? page >= pages : !hasNext);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eceef0] px-4 py-3 text-[13px] text-[#4b535b] dark:border-white/10 dark:text-[#9aa4a8]">
      <span>{summary}</span>
      {showNav && (
        <nav aria-label="Pages" className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={pageButton} disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
          {!known && (
            <span aria-current="page" className={cn(pageButton, "cursor-default border-[#003839] bg-[#003839] text-white hover:bg-[#003839] dark:border-[#0f7e7d] dark:bg-[#0f7e7d]")}>{page}</span>
          )}
          {known && pageList(page, pages).map((n, i) => n === "gap"
            ? <span key={`gap-${i}`} aria-hidden="true" className="px-1">…</span>
            : (
              <button key={n} type="button" aria-current={n === page ? "page" : undefined} aria-label={`Page ${n}`} disabled={disabled} onClick={() => onPage(n)}
                className={cn(pageButton, n === page && "border-[#003839] bg-[#003839] text-white hover:bg-[#003839] dark:border-[#0f7e7d] dark:bg-[#0f7e7d]")}>
                {n}
              </button>
            ))}
          <button type="button" className={pageButton} disabled={nextDisabled} onClick={() => onPage(page + 1)}>Next</button>
        </nav>
      )}
    </div>
  );
}

/** Table header cell and row styles shared by the list pages. */
export const agencyTh = "px-4 py-2.5 text-left text-[13px] font-normal text-[#4b535b] dark:text-[#9aa4a8]";
export const agencyTheadRow = "border-y border-[#eceef0] bg-[#f8f9fa] dark:border-white/10 dark:bg-white/5";
export const agencyTr = "border-b border-[#eceef0] align-middle transition-colors last:border-b-0 hover:bg-[#f8f9fa] dark:border-white/10 dark:hover:bg-white/5";
export const agencyTd = "px-4 py-3 text-[14px] text-[#10141a] dark:text-[#e6eaec]";
