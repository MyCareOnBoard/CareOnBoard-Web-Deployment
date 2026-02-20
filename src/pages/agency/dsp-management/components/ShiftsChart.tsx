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
import { type Shift, ShiftStatus } from "@/lib/api/shifts";

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
  Scheduled: "#1A4D8F",
  "Visit Completed": "#2B82FF",
  Incomplete: "#B0BEC5",
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
    <div className="bg-[#edf1f2] p-6 rounded-lg flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">SHIFTS</h3>
          {!isLoading && (
            <p className="text-sm text-gray-500 mt-0.5">
              Total:{" "}
              <span className="font-semibold text-gray-900">{total}</span>
            </p>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filter === opt.key
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        {Object.entries(BAR_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="min-h-48">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00B4B8]" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data}
              margin={{ top: 8, right: 0, left: -20, bottom: 0 }}
              barCategoryGap="30%"
              barGap={2}
            >
              <CartesianGrid vertical={false} stroke="#D1D5DB" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
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
  );
}
