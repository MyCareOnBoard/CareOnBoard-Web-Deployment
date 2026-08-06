import { useMemo, useState } from "react";
import { CalendarDays, List } from "lucide-react";
import { format, subDays } from "date-fns";
import { useLocation, useNavigate } from "react-router";
import ShiftsListPage from "@/pages/agency/scheduling/shifts";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import SuperAdminShiftsCalendar from "@/pages/super-admin/shift-management/SuperAdminShiftsCalendar";
import { SuperAdminShiftScope } from "@/pages/super-admin/shift-management/SuperAdminShiftList";
import type { NormalizedCalendarShift } from "@/pages/super-admin/shift-management/calendarModel";

interface SuperAdminClientActivityShiftsProps {
  clientId: string;
  agencyId: string;
}

function ScopedClientShiftViews({ clientId }: { clientId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { agency, agencyId, mode, routes } = useOperationalAgency();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const initialDateRange = useMemo(() => {
    const end = new Date();
    return {
      startDate: format(subDays(end, 30), "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  }, []);
  const [dateRange, setDateRange] = useState(initialDateRange);
  const selectedMode = mode ?? agency.supportedClientTypes[0] ?? "ddd";

  const openShiftDetails = (shift: NormalizedCalendarShift) => {
    const params = new URLSearchParams({
      agencyId: shift.agencyId || agencyId,
      returnTo: `${location.pathname}${location.search}`,
    });
    navigate(routes.details(shift.id, params.toString()));
  };

  return (
    <section className="mt-4 space-y-4" aria-label="Client shifts">

      <div className="flex justify-between flex-wrap items-end gap-3 rounded-xl border border-[#dce4e4] bg-white px-4 py-3">
        <div role="group" aria-label="Client shift view" className="flex w-fit rounded-lg bg-[#e9eeee] p-1">
          <button
            type="button"
            aria-label="Calendar view"
            aria-pressed={view === "calendar"}
            onClick={() => setView("calendar")}
            className={`flex min-h-11 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors ${view === "calendar" ? "bg-white text-[#075b5d] shadow-[0_1px_2px_rgba(26,54,55,0.12)]" : "text-[#5e696b] hover:bg-white/60"}`}
          >
            <CalendarDays aria-hidden="true" className="h-4 w-4" />Calendar
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            className={`flex min-h-11 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors ${view === "list" ? "bg-white text-[#075b5d] shadow-[0_1px_2px_rgba(26,54,55,0.12)]" : "text-[#5e696b] hover:bg-white/60"}`}
          >
            <List aria-hidden="true" className="h-4 w-4" />List
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#687173]">
          From
          <input
            type="date"
            value={dateRange.startDate}
            max={dateRange.endDate}
            onChange={(event) => {
              if (event.target.value) setDateRange((current) => ({ ...current, startDate: event.target.value }));
            }}
            className="min-h-10 rounded-lg border border-[#cfd7d7] bg-[#fbfcfc] px-3 text-sm font-medium text-[#273033]"
          />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#687173]">
          To
          <input
            type="date"
            value={dateRange.endDate}
            min={dateRange.startDate}
            onChange={(event) => {
              if (event.target.value) setDateRange((current) => ({ ...current, endDate: event.target.value }));
            }}
            className="min-h-10 rounded-lg border border-[#cfd7d7] bg-[#fbfcfc] px-3 text-sm font-medium text-[#273033]"
          />
        </label>
        </div>
      </div>

      {view === "calendar" ? <SuperAdminShiftsCalendar
        agencies={[agency]}
        clientId={clientId}
        lockAgency
        dateRange={dateRange}
        mode={selectedMode}
        onSelectionChange={() => undefined}
        onOpenShift={openShiftDetails}
      /> : <ShiftsListPage clientId={clientId} dateRange={dateRange} readOnly={true} embedded />}
    </section>
  );
}

export default function SuperAdminClientActivityShifts({ clientId, agencyId }: SuperAdminClientActivityShiftsProps) {
  if (!clientId || !agencyId) {
    return <p role="status" className="mt-4 rounded-xl border border-[#dce4e4] bg-white px-4 py-6 text-sm text-[#5e6d6e]">Shift activity is unavailable until this client is assigned to an agency.</p>;
  }

  return (
    <SuperAdminShiftScope agencyId={agencyId}>
      <ScopedClientShiftViews clientId={clientId} />
    </SuperAdminShiftScope>
  );
}
