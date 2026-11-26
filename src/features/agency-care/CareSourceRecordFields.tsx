import { useEffect, useState } from "react";
import { ArrowLeftRight, Check, Search, ShieldCheck, UserRound } from "lucide-react";
import { agencyField, initialsOf } from "@/components/agency/AgencyListKit";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { CareFailure } from "./ui";

export type CareSourceRecord = { id: string; firstName?: string; lastName?: string; servicePrograms?: string[] };
/** Programs a destination agency can confirm for a care workspace. */
export const CARE_SOURCE_PROGRAMS = [
  { value: "ddd", label: "DDD", detail: "Developmental disabilities services" },
  { value: "hha", label: "HHA", detail: "Home health aide services" },
];

const recordName = (record: CareSourceRecord) => [record.firstName, record.lastName].filter(Boolean).join(" ") || "Unnamed client";
const sectionLabel = "text-[13px] font-semibold text-[#10141a] dark:text-[#f4f6f7]";
const hint = "text-[13px] font-normal text-[#5b636b] dark:text-[#9aa4a8]";
const option = "flex cursor-pointer items-center gap-3 rounded-[12px] border px-3 py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[#007679]";
const optionOff = "border-[#e4e7ea] bg-white hover:bg-[#f7f9fa] dark:border-white/10 dark:bg-transparent dark:hover:bg-white/5";
const optionOn = "border-[#007679] bg-[#eef8f8] dark:border-[#7fd3d3] dark:bg-[#0f7e7d]/15";
const tick = "grid h-5 w-5 shrink-0 place-items-center border text-white";

function Avatar({ name, on }: { name?: string; on?: boolean }) {
  return (
    <span aria-hidden="true" className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-medium",
      on || name ? "bg-[#e0f3f3] text-[#005c5e] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]" : "border border-dashed border-[#c5cbd0] text-[#6b737a] dark:border-white/20")}>
      {name ? initialsOf(name) : <UserRound className="h-4 w-4" />}
    </span>
  );
}

/**
 * The fields for proposing a link between a care workspace and one of the caller's own client records:
 * search for the record, pick the programs it covers, and confirm both are the same person.
 */
export function CareSourceRecordFields({
  careClientName, careAgencyName, onSearch, searching, searchError, onRetry, records, clientId, onClientId, programs, onPrograms, confirmed, onConfirmed,
}: {
  careClientName: string;
  careAgencyName: string;
  /** Called with the trimmed text once typing pauses; fewer than two characters clears the search. */
  onSearch: (query: string) => void;
  searching: boolean;
  searchError?: string;
  onRetry: () => void;
  records?: CareSourceRecord[];
  clientId: string;
  onClientId: (clientId: string) => void;
  programs: string[];
  onPrograms: (programs: string[]) => void;
  confirmed: boolean;
  onConfirmed: (confirmed: boolean) => void;
}) {
  const [text, setText] = useState("");
  // The chosen record stays on screen after the search text changes.
  const [chosen, setChosen] = useState<CareSourceRecord | null>(null);
  const typed = text.trim();
  const query = useDebounce(typed);
  const waiting = typed.length >= 2 && (query !== typed || searching);
  useEffect(() => { onSearch(query.length >= 2 ? query : ""); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps
  const selected = chosen?.id === clientId ? chosen : null;
  function choose(record: CareSourceRecord) {
    setChosen(record);
    onClientId(record.id);
    // Start from the programs this record is enrolled in; the user can still change them.
    const enrolled = CARE_SOURCE_PROGRAMS.map((program) => program.value).filter((value) => record.servicePrograms?.includes(value));
    if (enrolled.length) onPrograms(enrolled);
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-center gap-2 rounded-[14px] bg-[#f4f6f7] p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] dark:bg-white/5" aria-label="Records to connect" role="group">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={careClientName} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{careClientName}</p>
            <p className={cn(hint, "truncate")}>Care workspace · {careAgencyName}</p>
          </div>
        </div>
        <ArrowLeftRight aria-hidden="true" className="mx-auto h-4 w-4 rotate-90 text-[#6b737a] sm:rotate-0" />
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={selected ? recordName(selected) : undefined} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{selected ? recordName(selected) : "Not selected yet"}</p>
            <p className={cn(hint, "truncate")}>Your client record</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-2">
          <span className={sectionLabel}>1. Find your client record</span>
          <span className="relative block">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b737a]" />
            <input type="search" value={text} onChange={(event) => setText(event.target.value)} maxLength={80} autoComplete="off"
              placeholder="Search your clients by name" className={cn(agencyField, "h-11 pl-10")} />
          </span>
        </label>
        <div aria-live="polite">
          {searchError ? <CareFailure message={searchError} onRetry={onRetry} />
            : typed.length < 2 ? <p className={hint}>{selected ? "Search again to choose a different record." : "Type at least 2 characters to search the clients in your agency."}</p>
            : waiting ? <p className={hint} role="status">Searching…</p>
            : !records?.length ? <p className={hint}>No client records match “{typed}”. Check the spelling or try the last name.</p>
            : (
              <div role="radiogroup" aria-label="Matching client records" className="flex max-h-[232px] flex-col gap-2 overflow-y-auto pr-1">
                {records.map((record) => {
                  const on = record.id === clientId;
                  return (
                    <label key={record.id} className={cn(option, on ? optionOn : optionOff)}>
                      <input type="radio" name="care-source-record" className="sr-only" checked={on} onChange={() => choose(record)} />
                      <Avatar name={recordName(record)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{recordName(record)}</span>
                        <span className={cn(hint, "block truncate")}>{record.servicePrograms?.length ? record.servicePrograms.map((program) => program.toUpperCase()).join(" · ") : "No programs on file"}</span>
                      </span>
                      <span aria-hidden="true" className={cn(tick, "rounded-full", on ? "border-[#007679] bg-[#007679]" : "border-[#c5cbd0] bg-white text-transparent dark:border-white/25 dark:bg-transparent")}><Check className="h-3 w-3" /></span>
                    </label>
                  );
                })}
              </div>
            )}
        </div>
      </div>

      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className={cn(sectionLabel, "mb-2 p-0")}>2. Programs to confirm</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CARE_SOURCE_PROGRAMS.map((program) => {
            const on = programs.includes(program.value);
            return (
              <label key={program.value} className={cn(option, on ? optionOn : optionOff)}>
                <input type="checkbox" className="sr-only" checked={on}
                  onChange={(event) => onPrograms(event.target.checked ? [...programs, program.value] : programs.filter((value) => value !== program.value))} />
                <span aria-hidden="true" className={cn(tick, "rounded-[6px]", on ? "border-[#007679] bg-[#007679]" : "border-[#c5cbd0] bg-white text-transparent dark:border-white/25 dark:bg-transparent")}><Check className="h-3 w-3" /></span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{program.label}</span>
                  <span className={cn(hint, "block")}>{program.detail}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className={cn(option, "items-start", confirmed ? optionOn : "border-[#f0d9a8] bg-[#fff9ec] dark:border-[#b98a2c]/50 dark:bg-[#b98a2c]/10")}>
        <input type="checkbox" className="sr-only" checked={confirmed} onChange={(event) => onConfirmed(event.target.checked)} />
        <span aria-hidden="true" className={cn(tick, "mt-0.5 rounded-[6px]", confirmed ? "border-[#007679] bg-[#007679]" : "border-[#c5cbd0] bg-white text-transparent dark:border-white/25 dark:bg-transparent")}><Check className="h-3 w-3" /></span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />I verified these records are the same person</span>
          <span className={cn(hint, "block")}>The other agency must also confirm before anything is published to this record.</span>
        </span>
      </label>
    </div>
  );
}
