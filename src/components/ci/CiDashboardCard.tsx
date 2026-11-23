import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Users } from "lucide-react";
import { formatShiftLocation, type Shift } from "@/lib/api/shifts";
import { Routes } from "@/routes/constants";
import { viewerShiftRange } from "@/lib/shift-time";
import { ciApi, CI_NOTE_TYPES, formatCivilDate, type CiWeek } from "@/lib/api/ci-tracker";

/** Staff dashboard: the next group outing and how this week's outing logs stand. */
/** `upcoming` is in start order; `all` is every loaded shift, for counting the group. */
export function CiDashboardCard({ upcoming, all }: { upcoming: Shift[]; all: Shift[] }) {
  const outingShifts = useMemo(() => upcoming.filter((s) => s.ciSessionId && CI_NOTE_TYPES.includes(s.notesType || "")), [upcoming]);
  const [week, setWeek] = useState<CiWeek | null>(null);
  const enabled = outingShifts.length > 0;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    ciApi.weeklyStatus({}, controller.signal).then(setWeek).catch(() => undefined);
    return () => controller.abort();
  }, [enabled]);
  if (!enabled) return null;

  const next = outingShifts[0];
  const groupSize = new Set(all.filter((s) => s.ciSessionId === next.ciSessionId).map((s) => s.id)).size || 1;
  const outstanding = week?.rows.reduce((sum, r) => sum + r.missingDates.length + r.incompleteDates.length, 0) ?? 0;
  const route = next.notesType === "day-habilitation" ? Routes.userPanel.dayProgram : Routes.userPanel.communityInclusion;

  return (
    <section aria-label="Group outings" className="rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(16,40,44,0.06)] dark:bg-[#1b232b]">
      <h2 className="text-[16px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Group outings</h2>
      <div className="mt-3 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e6f4f4] text-[#007679] dark:bg-white/10 dark:text-[#7fe0e2]"><Users aria-hidden="true" className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{formatCivilDate(next.date, { weekday: "short", day: "numeric", month: "short" })} · {viewerShiftRange(next)}</p>
          <p className="text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Group · {groupSize} client{groupSize === 1 ? "" : "s"}{formatShiftLocation(next.location) ? ` · ${formatShiftLocation(next.location)}` : ""}</p>
        </div>
      </div>
      {week && (
        <p className="mt-3 text-[13px] text-[#34434c] dark:text-[#dbe3e6]">
          {outstanding ? `${outstanding} outing log${outstanding === 1 ? "" : "s"} to finish this week.` : "Outing logs are up to date this week."}
        </p>
      )}
      <Link to={`${route}?date=${encodeURIComponent(next.date)}`} className="mt-3 inline-block text-[13px] font-semibold text-[#007679] underline underline-offset-2 dark:text-[#7fe0e2]">Take attendance</Link>
    </section>
  );
}

export default CiDashboardCard;
