import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { NoteBanner } from "@/pages/userPanel/notes/components/NotesKit";
import { useCarePanel } from "@/components/ci/carePanel";
import { ciApi, type CiWeek } from "@/lib/api/ci-tracker";

/**
 * Notes list banner for staff with community inclusion / day program shifts:
 * those logs are due once a week, not 24 hours after each shift.
 */
export function CiWeeklyDueBanner({ enabled }: { enabled: boolean }) {
  const [week, setWeek] = useState<CiWeek | null>(null);
  const carePanel = useCarePanel();
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    ciApi.weeklyStatus({}, controller.signal).then(setWeek).catch(() => undefined);
    return () => controller.abort();
  }, [enabled]);
  if (!enabled || !week?.rows.length) return null;
  const outstanding = week.rows.reduce((sum, r) => sum + r.missingDates.length + r.incompleteDates.length, 0);
  const due = week.dueAt ? new Intl.DateTimeFormat(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" }).format(new Date(week.dueAt)) : null;
  const overdue = week.rows.some((r) => r.state === "overdue");
  // Open the program with work left (or the only one there is) on its week view.
  const program = (week.rows.find((r) => r.missingDates.length + r.incompleteDates.length > 0) ?? week.rows[0]).program;
  return (
    <NoteBanner tone={overdue ? "red" : outstanding ? "amber" : "green"} role="status" icon={<CalendarClock className="h-4 w-4" />}
      action={<button type="button" onClick={() => carePanel.open(program, { view: "week" })} className="cursor-pointer font-semibold underline underline-offset-2">See the week</button>}>
      {outstanding
        ? <><span className="font-semibold">{outstanding} community inclusion or day program log{outstanding === 1 ? "" : "s"} to finish this week.</span>{due ? ` They're due ${due}.` : ""}</>
        : <>Community inclusion and day program logs are up to date this week.{due ? ` The week closes ${due}.` : ""}</>}
    </NoteBanner>
  );
}

export default CiWeeklyDueBanner;
