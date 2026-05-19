import { CalendarDays } from "lucide-react";

interface ShiftRow {
  id: string;
  clientName?: string | null;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  assignedDSP?: string | null;
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

export default function ShiftListCard({ data }: { data: unknown }) {
  const shifts = Array.isArray(data) ? (data as ShiftRow[]) : [];

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f3fafa]">
        <CalendarDays className="h-4 w-4 text-[#00b4b8]" />
        <span className="text-[13px] font-semibold text-[#10141a]">Shifts</span>
        <span className="ml-auto text-[12px] text-[#6b7280]">{shifts.length}</span>
      </div>

      {shifts.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-[#6b7280]">No shifts found.</p>
      ) : (
        <div className="divide-y divide-[#f3f4f6]">
          {shifts.map((shift, i) => (
            <div key={shift.id || i} className="flex items-center gap-3 px-4 py-2.5 text-[12px] sm:text-[13px]">
              <span className="w-14 shrink-0 font-medium text-[#10141a]">{formatDate(shift.date)}</span>
              <span className="flex-1 truncate text-[#374151]">{shift.clientName || "—"}</span>
              <span className="shrink-0 text-[#6b7280]">
                {shift.startTime || ""}
                {shift.endTime ? `–${shift.endTime}` : ""}
              </span>
              {shift.assignedDSP && (
                <span className="hidden sm:block shrink-0 truncate max-w-[96px] text-[#6b7280]">
                  {shift.assignedDSP}
                </span>
              )}
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${statusBadge(shift.status)}`}
              >
                {shift.status || "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
