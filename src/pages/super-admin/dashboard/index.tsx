import React, {useState} from "react";
import {ArrowUpRight} from "lucide-react";
import {
  useGetSuperAdminStatsQuery,
  useGetShiftStatsQuery,
  useGetAttendanceReportQuery,
} from "./api";

export default function SuperAdminDashboard() {
  const [hoveredShift, setHoveredShift] = useState<number | null>(null);

  const {data: statsData, isLoading: isLoadingStats} = useGetSuperAdminStatsQuery();
  const {data: shiftsResponse} = useGetShiftStatsQuery();
  const {data: attendanceResponse} = useGetAttendanceReportQuery();

  const stats = statsData?.stats || {
    totalAgencies: 0,
    totalStaff: 0,
    totalClients: 0,
    ongoingIncidents: 0,
    scheduledIncidents: 0,
    pendingNotes: 0,
    pendingTimesheets: 0,
  };

  const shiftsData = shiftsResponse?.buckets || [
    {time: "12:00am", scheduled: 22, completed: 15},
    {time: "1:00am", scheduled: 18, completed: 12},
    {time: "2:00am", scheduled: 25, completed: 20},
    {time: "3:00am", scheduled: 20, completed: 18},
    {time: "4:00am", scheduled: 15, completed: 10},
    {time: "5:00am", scheduled: 28, completed: 22},
    {time: "6:00am", scheduled: 30, completed: 25},
  ];

  const maxShiftValue = Math.max(...shiftsData.map((d) => Math.max(d.scheduled, d.completed)));

  const attendanceData = attendanceResponse?.data || [
    {time: "09:00 AM", days: [3, 2, 1, 2, 0, 1, 2]},
    {time: "10:00 AM", days: [3, 3, 2, 3, 0, 2, 1]},
    {time: "11:00 PM", days: [2, 3, 2, 0, 0, 1, 2]},
    {time: "12:00 PM", days: [3, 3, 0, 3, 0, 1, 2]},
    {time: "01:00 PM", days: [3, 0, 2, 3, 0, 1, 0]},
    {time: "02:00 PM", days: [0, 0, 2, 0, 0, 2, 2]},
  ];

  const getAttendanceColor = (value: number) => {
    if (value === 0) return "bg-[#E5E5E6]";
    if (value === 1) return "bg-[#AACDFF]";
    if (value === 2) return "bg-[#2B82FF]";
    return "bg-[#2775E5]";
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Dashboard
        </h1>
      </div>

      {/* Stats Card */}
      <div className="mb-6">
        <div className="backdrop-blur-[50px] bg-white/40 border border-white/30 rounded-[30px] p-5 overflow-hidden relative">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                Users
              </p>
              <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                Clients overview who are registered via agency panel
              </p>
            </div>
            <div className="flex gap-12 px-6">
              <div className="flex flex-col gap-1.5">
                <p className="text-[40px] font-semibold text-[#10141a]">
                  {isLoadingStats ? "..." : stats.totalAgencies}
                </p>
                <p className="text-[14px] font-medium text-[#808081]">Total Agencies</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[40px] font-semibold text-[#10141a]">
                  {isLoadingStats ? "..." : stats.totalStaff}
                </p>
                <p className="text-[14px] font-medium text-[#808081]">Total Staff</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[40px] font-semibold text-[#10141a]">
                  {isLoadingStats ? "..." : stats.totalClients}
                </p>
                <p className="text-[14px] font-medium text-[#808081]">Total Clients</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* System-wide Incidents */}
          <div className="flex w-full items-center justify-between backdrop-blur bg-white/30 border border-white/30 rounded-[30px] p-5">
            <div className="mb-4">
              <p className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                System-wide incidents
              </p>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center">
                <p className="text-[40px] font-semibold text-[#10141a]">
                  {isLoadingStats ? "..." : stats.ongoingIncidents}
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#0EAF52]"></div>
                  <p className="text-[14px] font-medium text-[#808081]">Ongoing</p>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[40px] font-semibold text-[#10141a]">
                  {isLoadingStats ? "..." : stats.scheduledIncidents}
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#2B82FF]"></div>
                  <p className="text-[14px] font-medium text-[#808081]">Scheduled</p>
                </div>
              </div>
            </div>
          </div>

          {/* Total Pending Notes */}
          <div className="backdrop-blur bg-white/30 border border-white/30 rounded-[30px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                  Total Pending Notes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[40px] font-semibold text-[#10141a]">
                  {isLoadingStats ? "..." : stats.pendingNotes}
                </p>
                <ArrowUpRight className="w-5 h-5 text-[#808081]" />
              </div>
            </div>
          </div>

          {/* Total Pending Timesheets */}
          <div className="backdrop-blur bg-white/30 border border-white/30 rounded-[30px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                  Total Pending Timesheets
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[40px] font-semibold text-[#10141a]">
                  {isLoadingStats ? "..." : stats.pendingTimesheets}
                </p>
                <ArrowUpRight className="w-5 h-5 text-[#808081]" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Ongoing SHIFTS */}
        <div className="backdrop-blur bg-white/30 border border-white/30 rounded-[30px] p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                Ongoing SHIFTS
              </p>
              <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                Total number of shifts happening last 24 hours
              </p>
            </div>
            <div className="text-right">
              <p className="text-[14px] font-medium text-[#808081]">Scheduled</p>
              <p className="text-[14px] font-medium text-[#808081]">Visit Completed</p>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="flex items-end justify-between gap-3 h-[197px] mt-8 relative">
            {shiftsData.map((shift, index) => (
              <div
                key={index}
                className="flex flex-col items-center flex-1 h-full justify-end relative"
                onMouseEnter={() => setHoveredShift(index)}
                onMouseLeave={() => setHoveredShift(null)}
              >
                {/* Tooltip */}
                {hoveredShift === index && (
                  <div className="rounded absolute bottom-full mb-2 bg-white text-black px-4 py-3 whitespace-nowrap z-10 shadow-lg">
                    <div className="mb-1 text-sm font-semibold">Report for {shift.time}</div>
                    <div className="flex justify-between items-center gap-4">
                      <div className="text-[#808081] text-xs">Scheduled</div>
                      <div className="text-black text-xs">{shift.scheduled}</div>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <div className="text-[#808081] text-xs">Visit Completed</div>
                      <div className="text-black text-xs">{shift.completed}</div>
                    </div>
                  </div>
                )}

                <div className="relative w-full flex gap-1 items-end justify-center h-full">
                  {/* Scheduled Bar */}
                  {shift.scheduled > 0 && (
                    <div
                      className="flex-1 text-center text-white text-sm rounded-t-[9px] rounded-b-[9px] bg-[#2B82FF] transition-all duration-300"
                      style={{
                        height: `${(shift.scheduled / maxShiftValue) * 100}%`,
                        minHeight: shift.scheduled ? "30px" : "0px",
                      }}
                    >
                      {shift.scheduled}
                    </div>
                  )}
                  {/* Completed Bar */}
                  {shift.completed > 0 && (
                    <div
                      className="flex-1 text-center text-white text-sm rounded-t-[9px] rounded-b-[9px] bg-[#2B82FF]/40 transition-all duration-300"
                      style={{
                        height: `${(shift.completed / maxShiftValue) * 100}%`,
                        minHeight: shift.completed ? "30px" : "0px",
                      }}
                    >
                      {shift.completed}
                    </div>
                  )}
                </div>
                <p className="text-[12px] font-medium text-[#808081] mt-2">
                  {shift.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance Report */}
      <div className="mt-6 backdrop-blur bg-white/30 border border-white/30 rounded-[30px] p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
              Attendance report
            </p>
            <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
              Tracks attendance and punctuality efficiently.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[#808081]">Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded bg-[#E5E5E6]"></div>
              <div className="w-4 h-4 rounded bg-[#AACDFF]"></div>
              <div className="w-4 h-4 rounded bg-[#2B82FF]"></div>
              <div className="w-4 h-4 rounded bg-[#2775E5]"></div>
            </div>
            <span className="text-[12px] font-medium text-[#808081]">Full</span>
          </div>
        </div>

        {/* Heatmap */}
        <div className="space-y-2">
          {attendanceData.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-[#808081] w-20">
                {row.time}
              </span>
              <div className="flex gap-2 flex-1">
                {row.days.map((value, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`h-12 flex-1 rounded ${getAttendanceColor(value)}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
