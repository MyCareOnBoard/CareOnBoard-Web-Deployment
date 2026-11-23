import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bot, Clock, Inbox, Loader2, Star } from "lucide-react";
import { AgencyStatCard } from "@/components/agency/AgencyShell";
import { getSupportReport, supportErrorMessage, type SupportDesk, type SupportReport } from "@/lib/api/support";
import { fieldClass } from "./SupportTeamDrawer";
import { cn } from "@/lib/utils";

function minutesLabel(value: number | null) {
  if (value === null) return "—";
  if (value < 60) return `${value} min`;
  const hours = Math.round((value / 60) * 10) / 10;
  return `${hours} h`;
}

/** Desk numbers: volume, how much the assistant resolved, first response, ratings. */
export function SupportReportsPanel({ desk }: { desk: SupportDesk }) {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<SupportReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    getSupportReport(desk, days)
      .then((loaded) => { if (!cancelled) setReport(loaded); })
      .catch((error) => toast.error(supportErrorMessage(error, "The report could not be loaded.")));
    return () => { cancelled = true; };
  }, [desk, days]);

  const bars = (rows: { label: string; count: number }[]) => {
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[13px]">
            <span className="truncate text-[#10141a] dark:text-[#f4f6f7]">{row.label}</span>
            <span className="tabular-nums text-[#5d6b73] dark:text-[#9aa4a8]">{row.count}</span>
            <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-[#edf1f2] dark:bg-white/10">
              <span className="block h-full rounded-full bg-[#007679]" style={{ width: `${(row.count / max) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="support-report-days" className="text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Period</label>
        <select id="support-report-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className={cn(fieldClass, "w-auto")}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      {!report ? (
        <div className="grid place-items-center py-16"><Loader2 aria-label="Loading report" className="h-6 w-6 animate-spin text-[#5d6b73]" /></div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AgencyStatCard icon={Inbox} label="Cases" value={report.total} footnote={`${report.open} open · ${report.urgent} urgent`} />
            <AgencyStatCard icon={Bot} label="Solved by the assistant" value={`${report.aiResolutionRate}%`} footnote={`${report.resolvedByAi} confirmed by the person · ${report.escalated} handed to a person`} />
            <AgencyStatCard icon={Clock} label="Median first reply" value={minutesLabel(report.medianFirstResponseMinutes)} footnote={`${report.overdue} past their reply target now`} />
            <AgencyStatCard icon={Star} label="Rating" value={report.averageRating ?? "—"} footnote={report.ratingCount ? `${report.ratingCount} ratings` : "No ratings yet"} />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <section className="rounded-[14px] border border-[#e3e8ea] p-4 dark:border-white/10">
              <h3 className="mb-3 text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">By topic</h3>
              {report.byCategory.length ? bars(report.byCategory.map((r) => ({ label: r.category, count: r.count }))) : <p className="text-[13px] text-[#5d6b73]">No cases yet.</p>}
            </section>
            {desk === "corporate" ? (
              <section className="rounded-[14px] border border-[#e3e8ea] p-4 dark:border-white/10">
                <h3 className="mb-3 text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">By agency</h3>
                {report.byAgency.length ? bars(report.byAgency.map((r) => ({ label: r.agency, count: r.count }))) : <p className="text-[13px] text-[#5d6b73]">No cases yet.</p>}
              </section>
            ) : null}
            <section className="rounded-[14px] border border-[#e3e8ea] p-4 dark:border-white/10">
              <h3 className="mb-3 text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Most used articles</h3>
              {report.topArticles.length ? (
                <ul className="flex flex-col gap-2 text-[13px]">
                  {report.topArticles.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3">
                      <span className="text-[#10141a] dark:text-[#f4f6f7]">{a.title}</span>
                      <span className="shrink-0 tabular-nums text-[#5d6b73] dark:text-[#9aa4a8]">{a.usedCount}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-[13px] text-[#5d6b73]">Your own articles show here once the assistant uses them.</p>}
              {report.openGaps > 0 && <p className="mt-3 text-[12.5px] text-[#8a5300]">{report.openGaps} questions had no article. See Knowledge base.</p>}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
