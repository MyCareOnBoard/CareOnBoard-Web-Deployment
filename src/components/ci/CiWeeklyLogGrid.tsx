import { Check, X, Minus } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import {
  DAY_CELL_LABELS,
  FLAG_LABELS,
  WEEK_STATE_LABELS,
  formatCivilDate,
  rosterLabel,
  weekDates,
  type CiDayCell,
  type CiWeek,
  type CiWeekRow,
} from "@/lib/api/ci-tracker";

const cellStyle: Record<CiDayCell, string> = {
  none: "text-[#a3a9ae]",
  not_marked: "bg-[#eef1f3] text-[#4b535b] dark:bg-white/10 dark:text-[#c9d1d4]",
  did_not_attend: "bg-[#eef1f3] text-[#4b535b] dark:bg-white/10 dark:text-[#c9d1d4]",
  missing: "bg-[#fde8e6] text-[#b42318] dark:bg-[#4a1b17] dark:text-[#ffb4a9]",
  draft: "bg-[#fff4d6] text-[#8a5a00] dark:bg-[#3d2f0a] dark:text-[#ffd27a]",
  submitted: "bg-[#e3f6ec] text-[#0f7a43] dark:bg-[#0f3523] dark:text-[#7fe0aa]",
  approved: "bg-[#e3f6ec] text-[#0f7a43] dark:bg-[#0f3523] dark:text-[#7fe0aa]",
};

function CellMark({ cell }: { cell: CiDayCell }) {
  const label = DAY_CELL_LABELS[cell];
  if (cell === "none") return <Minus aria-label={label} className="mx-auto h-3.5 w-3.5 text-[#c4c9cd]" />;
  const content =
    cell === "submitted" || cell === "approved" ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> :
    cell === "did_not_attend" ? <X aria-hidden="true" className="h-3.5 w-3.5" /> :
    cell === "missing" ? "!" : cell === "draft" ? "D" : "?";
  return (
    <span title={label} aria-label={label} role="img" className={cn("mx-auto grid h-7 w-7 place-items-center rounded-md text-xs font-semibold", cellStyle[cell])}>
      {content}
    </span>
  );
}

const stateStyle: Record<CiWeekRow["state"], string> = {
  on_track: "bg-[#e3f6ec] text-[#0f7a43] dark:bg-[#0f3523] dark:text-[#7fe0aa]",
  complete: "bg-[#e3f6ec] text-[#0f7a43] dark:bg-[#0f3523] dark:text-[#7fe0aa]",
  due_soon: "bg-[#fff4d6] text-[#8a5a00] dark:bg-[#3d2f0a] dark:text-[#ffd27a]",
  overdue: "bg-[#fde8e6] text-[#b42318] dark:bg-[#4a1b17] dark:text-[#ffb4a9]",
};

export function CiWeekStateBadge({ row }: { row: CiWeekRow }) {
  const outstanding = row.missingDates.length + row.incompleteDates.length;
  const detail =
    row.state === "complete" || row.state === "on_track"
      ? !row.goalsApproved && row.daysAttended ? "Goals needed" : WEEK_STATE_LABELS[row.state]
      : row.missingDates.length ? `${row.missingDates.length} missing` : outstanding ? `${outstanding} draft` : WEEK_STATE_LABELS[row.state];
  const style = !row.goalsApproved && row.daysAttended && (row.state === "complete" || row.state === "on_track") ? stateStyle.due_soon : stateStyle[row.state];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium", style)}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {detail}
    </span>
  );
}

const legend: CiDayCell[] = ["submitted", "draft", "missing", "not_marked", "did_not_attend"];

/** "This week's activity logs": client by day, with the weekly due time. */
export function CiWeeklyLogGrid({ week, title = "This week's activity logs", notesHref, onSelectRow, emptyText = "No attended days this week yet." }: {
  week: CiWeek | null;
  title?: string;
  notesHref?: string;
  onSelectRow?: (row: CiWeekRow) => void;
  emptyText?: string;
}) {
  const dates = week ? weekDates(week.weekStart) : [];
  const due = week?.dueAt ? new Date(week.dueAt) : null;
  return (
    <section aria-label={title} className="rounded-[14px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
        <h2 className="text-base font-medium text-[#10141a] dark:text-[#f4f6f7]">{title}</h2>
        {week && (
          <p className="text-[13px] text-[#5b636b] dark:text-[#9aa4a8]">
            {formatCivilDate(week.weekStart, { day: "numeric", month: "short" })} – {formatCivilDate(week.weekEnd, { day: "numeric", month: "short" })}
            {due && <> · logs due {new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(due)}</>}
          </p>
        )}
        <ul className="ml-auto flex flex-wrap items-center gap-3 text-xs text-[#5b636b] dark:text-[#9aa4a8]">
          {legend.map((cell) => (
            <li key={cell} className="flex items-center gap-1.5"><CellMark cell={cell} />{DAY_CELL_LABELS[cell]}</li>
          ))}
        </ul>
        {notesHref && <Link to={notesHref} className="text-[13px] font-medium text-[#0b5c5d] underline underline-offset-2 dark:text-[#7fd3d3]">Open in Notes</Link>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-y border-[#eceef0] bg-[#f7f8f9] text-left text-xs font-medium text-[#5b636b] dark:border-white/10 dark:bg-white/5 dark:text-[#9aa4a8]">
              <th scope="col" className="px-4 py-2.5 font-medium">Client</th>
              {dates.map((d) => (
                <th key={d} scope="col" className="px-2 py-2.5 text-center font-medium">{formatCivilDate(d, { weekday: "short", day: "numeric" })}</th>
              ))}
              <th scope="col" className="px-3 py-2.5 font-medium">Logs</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Week status</th>
            </tr>
          </thead>
          <tbody>
            {!week || week.rows.length === 0 ? (
              <tr><td colSpan={dates.length + 3} className="px-4 py-8 text-center text-[#5b636b] dark:text-[#9aa4a8]">{week ? emptyText : "Loading…"}</td></tr>
            ) : (
              week.rows.map((row) => (
                <tr key={row.id} className="border-b border-[#f0f1f3] last:border-0 dark:border-white/5">
                  <th scope="row" className="px-4 py-2.5 text-left font-medium text-[#10141a] dark:text-[#f4f6f7]">
                    {onSelectRow ? (
                      <button type="button" onClick={() => onSelectRow(row)} className="cursor-pointer text-left hover:underline">{rosterLabel(row)}</button>
                    ) : rosterLabel(row)}
                    {row.flags.length > 0 && (
                      <span className="mt-0.5 block text-xs font-normal text-[#8a5a00] dark:text-[#ffd27a]" title={[...new Set(row.flags.map((f) => FLAG_LABELS[f.code] || f.code))].join(", ")}>
                        {row.flags.length} item{row.flags.length === 1 ? "" : "s"} to check
                      </span>
                    )}
                  </th>
                  {dates.map((d) => <td key={d} className="px-2 py-2.5 text-center"><CellMark cell={row.days[d] || "none"} /></td>)}
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#2a3138] dark:text-[#c9d1d4]">{row.logsSubmitted} of {row.logsRequired}</td>
                  <td className="px-3 py-2.5"><CiWeekStateBadge row={row} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
