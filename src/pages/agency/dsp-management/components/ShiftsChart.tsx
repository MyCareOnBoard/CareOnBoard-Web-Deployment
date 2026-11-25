import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  isWithinInterval,
} from "date-fns";
import { CalendarDays } from "lucide-react";
import { type Shift, ShiftStatus } from "@/lib/api/shifts";
import { cn } from "@/lib/utils";

type FilterType = "week" | "month" | "year" | "lifetime";

interface ChartDataPoint {
  label: string;
  Scheduled: number;
  "Visit Completed": number;
  Incomplete: number;
}

function buildChartData(shifts: Shift[], filter: FilterType): ChartDataPoint[] {
  const now = new Date();

  if (filter === "week") {
    const days = eachDayOfInterval({
      start: startOfWeek(now, { weekStartsOn: 0 }),
      end: endOfWeek(now, { weekStartsOn: 0 }),
    });
    return days.map((day) => {
      const dayLabel = format(day, "EEE").toUpperCase();
      const dayShifts = shifts.filter((s) => {
        const d = new Date(s.date);
        return (
          d.getFullYear() === day.getFullYear() &&
          d.getMonth() === day.getMonth() &&
          d.getDate() === day.getDate()
        );
      });
      return {
        label: dayLabel,
        Scheduled: dayShifts.filter(
          (s) => s.status === ShiftStatus.PENDING || s.status === ShiftStatus.AVAILABLE
        ).length,
        "Visit Completed": dayShifts.filter((s) => s.status === ShiftStatus.COMPLETED).length,
        Incomplete: dayShifts.filter((s) => s.status === ShiftStatus.EXPIRED).length,
      };
    });
  }

  if (filter === "month") {
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weekStarts = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 0 }
    );
    return weekStarts.map((weekStart, idx) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      const weekShifts = shifts.filter((s) => {
        const d = new Date(s.date);
        return isWithinInterval(d, {
          start: weekStart > monthStart ? weekStart : monthStart,
          end: weekEnd < monthEnd ? weekEnd : monthEnd,
        });
      });
      return {
        label: `Wk ${idx + 1}`,
        Scheduled: weekShifts.filter(
          (s) => s.status === ShiftStatus.PENDING || s.status === ShiftStatus.AVAILABLE
        ).length,
        "Visit Completed": weekShifts.filter((s) => s.status === ShiftStatus.COMPLETED).length,
        Incomplete: weekShifts.filter((s) => s.status === ShiftStatus.EXPIRED).length,
      };
    });
  }

  if (filter === "year") {
    const months = eachMonthOfInterval({
      start: startOfYear(now),
      end: endOfYear(now),
    });
    return months.map((month) => {
      const monthEnd = endOfMonth(month);
      const monthShifts = shifts.filter((s) => {
        const d = new Date(s.date);
        return isWithinInterval(d, { start: month, end: monthEnd });
      });
      return {
        label: format(month, "MMM"),
        Scheduled: monthShifts.filter(
          (s) => s.status === ShiftStatus.PENDING || s.status === ShiftStatus.AVAILABLE
        ).length,
        "Visit Completed": monthShifts.filter((s) => s.status === ShiftStatus.COMPLETED).length,
        Incomplete: monthShifts.filter((s) => s.status === ShiftStatus.EXPIRED).length,
      };
    });
  }

  // lifetime
  if (shifts.length === 0) {
    const months = eachMonthOfInterval({
      start: new Date(now.getFullYear(), now.getMonth() - 5, 1),
      end: now,
    });
    return months.map((month) => ({
      label: format(month, "MMM yy"),
      Scheduled: 0,
      "Visit Completed": 0,
      Incomplete: 0,
    }));
  }

  const dates = shifts.map((s) => new Date(s.date));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const months = eachMonthOfInterval({
    start: startOfMonth(minDate),
    end: endOfMonth(maxDate),
  });
  return months.map((month) => {
    const monthEnd = endOfMonth(month);
    const monthShifts = shifts.filter((s) => {
      const d = new Date(s.date);
      return isWithinInterval(d, { start: month, end: monthEnd });
    });
    return {
      label: format(month, "MMM yy"),
      Scheduled: monthShifts.filter(
        (s) => s.status === ShiftStatus.PENDING || s.status === ShiftStatus.AVAILABLE
      ).length,
      "Visit Completed": monthShifts.filter((s) => s.status === ShiftStatus.COMPLETED).length,
      Incomplete: monthShifts.filter((s) => s.status === ShiftStatus.EXPIRED).length,
    };
  });
}

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "lifetime", label: "Lifetime" },
];

const BAR_COLORS = {
  Scheduled: "#0f7e7d",
  "Visit Completed": "#12b5b0",
  Incomplete: "#c9d1d4",
};

interface ShiftsChartProps {
  shifts: Shift[];
  isLoading?: boolean;
}

export function ShiftsChart({ shifts, isLoading }: ShiftsChartProps) {
  const [filter, setFilter] = useState<FilterType>("week");

  const data = useMemo(() => buildChartData(shifts, filter), [shifts, filter]);

  const total = shifts.length;

  return (
    <section aria-label="Shifts" aria-busy={isLoading || undefined} className="flex min-w-0 flex-col rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceef0] px-5 py-3 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <CalendarDays aria-hidden="true" className="h-5 w-5 text-[#007679] dark:text-[#7fd3d3]" />
          <h3 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">Shifts</h3>
          {!isLoading && (
            <span className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">
              Total:{" "}
              <span className="font-semibold text-[#10141a] dark:text-[#f4f6f7]">{total}</span>
            </span>
          )}
        </div>

        {/* Filter Buttons */}
        <div role="group" aria-label="Shift period" className="flex items-center gap-0.5 rounded-[10px] bg-[#f4f5f6] p-1 dark:bg-white/5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              aria-pressed={filter === opt.key}
              onClick={() => setFilter(opt.key)}
              className={cn(
                "h-7 cursor-pointer rounded-[7px] px-2.5 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679]",
                filter === opt.key
                  ? "bg-[#003839] font-medium text-white shadow-[0_1px_2px_rgba(16,20,26,0.12)] dark:bg-[#0f7e7d] dark:text-white"
                  : "text-[#4b535b] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4">
        {Object.entries(BAR_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[12px] text-[#4b535b] dark:text-[#9aa4a8]">{label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="min-h-48">
        {isLoading ? (
          <div aria-hidden="true" className="h-[220px] animate-pulse rounded-[12px] bg-[#f4f5f6] dark:bg-white/5" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data}
              margin={{ top: 8, right: 0, left: -20, bottom: 0 }}
              barCategoryGap="30%"
              barGap={2}
            >
              <CartesianGrid vertical={false} stroke="#eceef0" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6b737a" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#6b737a" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(15,126,125,0.06)" }}
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid #e4e7ea",
                  boxShadow: "0 8px 24px rgba(16,20,26,0.08)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="Scheduled" fill={BAR_COLORS.Scheduled} radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="Visit Completed" fill={BAR_COLORS["Visit Completed"]} radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="Incomplete" fill={BAR_COLORS.Incomplete} radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      </div>
    </section>
  );
}
