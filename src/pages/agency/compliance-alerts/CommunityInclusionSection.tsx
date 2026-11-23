import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CiWeeklyLogGrid } from "@/components/ci/CiWeeklyLogGrid";
import { Routes } from "@/routes/constants";
import { ciApi, addDays, apiErrorMessage, CI_PROGRAMS, type CiDashboard, type CiProgram } from "@/lib/api/ci-tracker";
import type { ComplianceView } from "./workspaceScope";

/**
 * Compliance alerts › Community inclusion: client-weeks whose activity logs are
 * overdue, due soon, or have items to check (no goal, no place, attendance not marked).
 */
export default function CommunityInclusionSection({ view, onApply }: {
  view: ComplianceView;
  onApply: (filters: Partial<ComplianceView>) => void;
}) {
  const [program, setProgram] = useState<CiProgram | "all">("all");
  const [data, setData] = useState<CiDashboard | null>(null);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    ciApi.dashboard({ weekStart: view.startDate, program: program === "all" ? undefined : program }, controller.signal)
      .then(setData)
      .catch((err) => { if (!controller.signal.aborted) setError(apiErrorMessage(err, "Community inclusion status could not be loaded.")); });
    return () => controller.abort();
  }, [view.startDate, program]);

  const needsAttention = (data?.rows || []).filter((r) => r.state === "overdue" || r.state === "due_soon" || r.flags.length > 0);
  const shown = data ? { ...data, rows: showAll ? data.rows : needsAttention } : null;
  const s = data?.summary;
  const tiles = s ? [
    { label: "Overdue client-weeks", value: s.states.overdue, tone: s.states.overdue ? "text-[#b42318]" : "" },
    { label: "Due soon", value: s.states.due_soon, tone: s.states.due_soon ? "text-[#8a5a00]" : "" },
    { label: "Missing logs", value: s.logs.missing, tone: s.logs.missing ? "text-[#b42318]" : "" },
    { label: "Rows linked to a goal", value: s.goalCoverage == null ? "—" : `${s.goalCoverage}%`, tone: "" },
  ] : [];

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous week" disabled={!data} onClick={() => data && onApply({ startDate: addDays(data.weekStart, -7) })} className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-[#dce7e8] disabled:opacity-50"><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button>
          <button type="button" aria-label="Next week" disabled={!data} onClick={() => data && onApply({ startDate: addDays(data.weekStart, 7) })} className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-[#dce7e8] disabled:opacity-50"><ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
          {view.startDate && <button type="button" onClick={() => onApply({ startDate: undefined })} className="ml-1 cursor-pointer text-sm font-medium text-[#007f84] underline underline-offset-2">This week</button>}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-[#5e7378]">
          Program
          <select value={program} onChange={(e) => setProgram(e.target.value as CiProgram | "all")} className="h-9 rounded-lg border border-[#dce7e8] bg-white px-2 text-sm text-[#10141a]">
            <option value="all">Both</option>
            {(Object.keys(CI_PROGRAMS) as CiProgram[]).map((key) => <option key={key} value={key}>{CI_PROGRAMS[key].label}</option>)}
          </select>
        </label>
      </div>

      {error && <p role="alert" className="text-sm text-[#b42318]">{error}</p>}
      {s && (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-xl border border-[#dce7e8] px-4 py-3">
              <dt className="text-xs text-[#5e7378]">{t.label}</dt>
              <dd className={`mt-1 text-2xl font-semibold text-[#10141a] ${t.tone}`}>{t.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {!error && (
        <>
          <CiWeeklyLogGrid
            week={shown}
            title={showAll ? "All client-weeks" : "Client-weeks that need attention"}
            notesHref={Routes.agency.notes}
            emptyText={showAll ? "No community inclusion or day program shifts this week." : "Nothing needs attention this week."}
          />
          {data && data.rows.length > needsAttention.length && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="self-start cursor-pointer text-sm font-medium text-[#007f84] underline underline-offset-2">
              {showAll ? "Show only what needs attention" : `Show all ${data.rows.length} client-weeks`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
