import { CalendarDays } from "lucide-react";
import ListPager, { listCountLabel, readListMeta, usePagedRows } from "./ListPager";
import { RecordRow, recordHref } from "./recordLink";
import { formatShiftRowClockDisplay } from "@/lib/shift-row-time";

// Fixed column widths so every row lines up: date, client, staff, scheduled time, clock in, clock out, status.
// Scheduled time shows from sm up and the clock columns from lg up, so names keep room on small screens.
const SHIFT_COLUMNS =
  "grid items-center gap-3 px-4 py-2.5 grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)_88px] " +
  "sm:grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)_140px_96px] " +
  "lg:grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)_140px_76px_76px_96px]";

interface ShiftRow {
  id: string;
  clientName?: string | null;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  assignedDSP?: string | null;
  clockedInAt?: string | null;
  clockedOutAt?: string | null;
}

function statusBadge(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "active" || s === "ongoing" || s === "assigned")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "open" || s === "pending" || s === "available" || s === "unassigned")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "completed")
    return "bg-gray-100 text-gray-600 border-gray-200";
  if (s === "cancelled" || s === "expired")
    return "bg-red-50 text-red-600 border-red-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

// Same clock display as the shift pages, with a dash when there is no punch.
function formatClock(value?: string | null) {
  if (!value) return "—";
  const shown = formatShiftRowClockDisplay(value);
  return shown === "--:-- --" ? "—" : shown;
}

export default function ShiftListCard({ data, meta: rawMeta, onSendMessage }: { data: unknown; meta?: unknown; onSendMessage?: (text: string) => void }) {
  const meta = readListMeta(rawMeta);
  const shifts = Array.isArray(data) ? (data as ShiftRow[]) : [];
  const paging = usePagedRows(shifts);

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f3fafa]">
        <CalendarDays className="h-4 w-4 text-[#00b4b8]" />
        <span className="text-[13px] font-semibold text-[#10141a]">Shifts</span>
        <span className="ml-auto text-[12px] text-[#6b7280]">{listCountLabel(shifts.length, meta)}</span>
      </div>

      {shifts.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-[#6b7280]">No shifts found.</p>
      ) : (
        <div className="divide-y divide-[#f3f4f6]">
          <div className={`${SHIFT_COLUMNS} bg-[#fafafa] text-[11px] font-medium uppercase tracking-wide text-[#9ca3af]`}>
            <span>Date</span>
            <span>Client</span>
            <span>Staff</span>
            <span className="hidden sm:block">Scheduled</span>
            <span className="hidden lg:block">Clock in</span>
            <span className="hidden lg:block">Clock out</span>
            <span>Status</span>
          </div>
          {paging.pageRows.map((shift, i) => (
            <RecordRow
              key={shift.id || i}
              href={recordHref({ kind: "shift", id: shift.id })}
              className={`${SHIFT_COLUMNS} text-[12px] sm:text-[13px]`}
            >
              <span className="font-medium text-[#10141a]">{formatDate(shift.date)}</span>
              <span className="truncate text-[#374151]" title={shift.clientName || undefined}>{shift.clientName || "—"}</span>
              <span
                className={`truncate ${shift.assignedDSP ? "text-[#374151]" : "text-[#9ca3af]"}`}
                title={shift.assignedDSP || undefined}
              >
                {shift.assignedDSP || "Unassigned"}
              </span>
              <span className="hidden truncate text-[#6b7280] sm:block">
                {shift.startTime || ""}
                {shift.endTime ? `–${shift.endTime}` : ""}
              </span>
              <span className={`hidden truncate lg:block ${shift.clockedInAt ? "text-[#374151]" : "text-[#9ca3af]"}`}>
                {formatClock(shift.clockedInAt)}
              </span>
              <span className={`hidden truncate lg:block ${shift.clockedOutAt ? "text-[#374151]" : "text-[#9ca3af]"}`}>
                {formatClock(shift.clockedOutAt)}
              </span>
              <span>
                <span className={`inline-block max-w-full truncate rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${statusBadge(shift.status)}`}>
                  {shift.status || "—"}
                </span>
              </span>
            </RecordRow>
          ))}
        </div>
      )}
      <ListPager loaded={shifts.length} meta={meta} paging={paging} noun="shifts" onSendMessage={onSendMessage} />
    </div>
  );
}
