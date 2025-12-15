// Chart data based on filter
const getChartData = (filter: "year" | "month" | "week" | "lifetime") => {
  switch (filter) {
    case "week":
      return {
        labels: ['SUN', 'MON', 'TUES', 'WED', 'THURS', 'FRI', 'SAT'],
        scheduled: [27, 25, 30, 28, 32, 28, 35],
        completed: [20, 18, 22, 25, 24, 20, 30],
      };
    case "month":
      return {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        scheduled: [95, 110, 98, 102],
        completed: [82, 95, 88, 91],
      };
    case "year":
      return {
        labels: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
        scheduled: [280, 290, 310, 295, 305, 298, 315, 320, 310, 305, 300, 295],
        completed: [245, 260, 275, 265, 270, 268, 285, 290, 280, 275, 270, 265],
      };
    case "lifetime":
      return {
        labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
        scheduled: [1200, 1450, 1680, 1820, 1950, 2100],
        completed: [980, 1220, 1480, 1620, 1750, 1890],
      };
    default:
      return {
        labels: ['SUN', 'MON', 'TUES', 'WED', 'THURS', 'FRI', 'SAT'],
        scheduled: [27, 25, 30, 28, 32, 28, 35],
        completed: [20, 18, 22, 25, 24, 20, 30],
      };
  }
};

interface ShiftsChartProps {
  filter: "year" | "month" | "week" | "lifetime";
  onFilterChange: (filter: "year" | "month" | "week" | "lifetime") => void;
  isLoading: boolean;
}

export function ShiftsChart({ filter, onFilterChange, isLoading }: ShiftsChartProps) {
  const chartData = getChartData(filter);
  const maxValue = Math.max(...chartData.scheduled, ...chartData.completed);

  return (
    <div className="bg-[#edf1f2] p-6 rounded-lg h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">SHIFTS</h3>
        <div className="flex items-center justify-between">
          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFilterChange("year")}
              className={`px-4 py-1.5 cursor-pointer rounded-full border text-xs font-medium transition-colors ${
                filter === "year"
                  ? "bg-gray-900 text-white"
                  : " text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              This Year
            </button>
            <button
              onClick={() => onFilterChange("month")}
              className={`px-4 py-1.5 cursor-pointer rounded-full border text-xs font-medium transition-colors ${
                filter === "month"
                  ? "bg-gray-900 text-white"
                  : " text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              This month
            </button>
            <button
              onClick={() => onFilterChange("week")}
              className={`px-4 py-1.5 cursor-pointer rounded-full border text-xs font-medium transition-colors ${
                filter === "week"
                  ? "bg-gray-900 text-white"
                  : " text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              This week
            </button>
            <button
              onClick={() => onFilterChange("lifetime")}
              className={`px-4 py-1.5 cursor-pointer rounded-full text-xs font-medium transition-colors ${
                filter === "lifetime"
                  ? "bg-gray-900 text-white"
                  : " text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              Lifetime
            </button>
          </div>
          
          {/* Legend */}
          <div className="flex flex-col items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-300"></div>
              <span>Visit Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end justify-between gap-3 h-64">
        {isLoading ? (
          <div className="flex items-center justify-center w-full py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00B4B8]"></div>
          </div>
        ) : (
          chartData.labels.map((label, index) => {
            const scheduled = chartData.scheduled[index];
            const completed = chartData.completed[index];
            
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center gap-1 h-52">
                  {/* Scheduled bar */}
                  {scheduled > 0 && (
                    <div className="relative flex-1 max-w-[24px]">
                      <div
                        className="bg-[#2B82FF] rounded-t-lg w-full relative transition-all duration-300"
                        style={{ height: `${(scheduled / maxValue) * 100}%`, minHeight: "30px" }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-900">
                          {scheduled}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Completed bar */}
                  {completed > 0 && (
                    <div className="relative flex-1 max-w-[24px]">
                      <div
                        className="bg-[#2B82FF]/40 rounded-t-lg w-full relative transition-all duration-300"
                        style={{ height: `${(completed / maxValue) * 100}%`, minHeight: "30px" }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-900">
                          {completed}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-600">{label}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
