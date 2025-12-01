import React, {useState, useMemo, useRef} from "react";
import {ArrowLeft, ChevronLeft, ChevronRight} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Routes} from "@/routes/constants";
import {useNavigate} from "react-router";
import {useGetShiftStatsQuery} from "@/pages/agency/dashboard/api";
import {useAuth} from "@/utils/auth";

type TimeFilter = "lastWeek" | "thisMonth" | "thisYear";

export default function ShiftsPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("lastWeek");
  const [hoveredShift, setHoveredShift] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const {profile} = useAuth();

  // Fetch shift stats with current filter
  const {data: shiftStatsData, isLoading} = useGetShiftStatsQuery(
    {agencyId: profile?.data?.id || '', range: timeFilter},
    {skip: !profile?.data?.id}
  );
  const shifts = shiftStatsData?.buckets || [];

  // Transform API data based on filter
  const shiftsData = useMemo(() => {
    if (shifts.length === 0) return [];

    return shifts.map(bucket => {
      const date = new Date(bucket.date);
      const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
      
      let dayLabel = '';
      let dateLabel = '';

      switch (timeFilter) {
        case 'lastWeek':
          dayLabel = dayNames[date.getDay()];
          dateLabel = `${date.getDate()} ${monthNames[date.getMonth()]}`;
          break;
        case 'thisMonth':
          dayLabel = `${monthNames[date.getMonth()].toUpperCase()} ${date.getDate()}`;
          dateLabel = `${date.getDate()} ${monthNames[date.getMonth()]}`;
          break;
        case 'thisYear':
          dayLabel = monthNames[date.getMonth()].toUpperCase();
          dateLabel = monthNames[date.getMonth()];
          break;
      }

      return {
        day: dayLabel,
        scheduled: bucket.scheduled,
        completed: bucket.completed,
        date: dateLabel
      };
    });
  }, [shifts, timeFilter]);

  const maxShiftValue = shiftsData.length > 0 
    ? Math.max(...shiftsData.map((d) => Math.max(d.scheduled, d.completed)), 1)
    : 1;

  const totalScheduled = shiftsData.reduce((sum, shift) => sum + shift.scheduled, 0);
  const totalCompleted = shiftsData.reduce((sum, shift) => sum + shift.completed, 0);

  const getFilterLabel = () => {
    switch (timeFilter) {
      case "lastWeek":
        return "last 7 days";
      case "thisMonth":
        return "this month";
      case "thisYear":
        return "this year";
      default:
        return "";
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      const newScrollPosition =
        direction === "left"
          ? scrollContainerRef.current.scrollLeft - scrollAmount
          : scrollContainerRef.current.scrollLeft + scrollAmount;

      scrollContainerRef.current.scrollTo({
        left: newScrollPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Dashboard
        </h1>
        <Button
          onClick={() => navigate(Routes.agency.dashboard)}
          className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm"
        >
          <ArrowLeft className="w-5 h-5"/>
          Back to Dashboard
        </Button>
      </div>

      {/* Main Content */}
      <div className="rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
        {/* Header with Filters */}
        <div className="flex items-center justify-between mb-6">
          {/* Filter Buttons */}
          <div className="mb-8">
            <h1 className="text-xl font-bold leading-[1.4] text-[#10141a]">
              SHIFTS
            </h1>
            <p className="text-[14px] font-medium text-[#808081] mt-2">
              Total number of shifts happening {getFilterLabel()}
            </p>
          </div>
          <div className={"flex items-center gap-3"}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTimeFilter("lastWeek")}
                className={`px-6 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                  timeFilter === "lastWeek"
                    ? "bg-[#00b4b8] text-white"
                    : "bg-white text-[#10141a] border border-[#e5e5e6] hover:border-[#00b4b8]"
                }`}
              >
                Last Week
              </button>
              <button
                onClick={() => setTimeFilter("thisMonth")}
                className={`px-6 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                  timeFilter === "thisMonth"
                    ? "bg-[#00b4b8] text-white"
                    : "bg-white text-[#10141a] border border-[#e5e5e6] hover:border-[#00b4b8]"
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setTimeFilter("thisYear")}
                className={`px-6 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                  timeFilter === "thisYear"
                    ? "bg-[#00b4b8] text-white"
                    : "bg-white text-[#10141a] border border-[#e5e5e6] hover:border-[#00b4b8]"
                }`}
              >
                This year
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex flex-col items-center">
                <div className="flex justify-end items-center w-full">
                  <span className="text-[11px] font-medium text-[#808081] text-right">Scheduled</span>
                  <div className="w-3 h-3 rounded-sm bg-[#2B82FF] ml-2"></div>
                </div>
                <div className="flex justify-end items-center w-full">
                  <span className="text-[11px] font-medium text-[#808081]">Visit Completed</span>
                  <div className="w-3 h-3 rounded-sm bg-[#2B82FF]/40 ml-2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative mt-20">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-[280px]">
              <p className="text-[14px] text-[#808081]">Loading shift data...</p>
            </div>
          )}
          
          {/* No Data State */}
          {!isLoading && shiftsData.length === 0 && (
            <div className="flex items-center justify-center h-[280px]">
              <p className="text-[14px] text-[#808081]">No shift data available for this period.</p>
            </div>
          )}

          {/* Tooltips Container (positioned outside scroll) */}
          {!isLoading && shiftsData.length > 0 && (
          <>
            <div className="absolute inset-0 pointer-events-none z-50 overflow-visible">
              {hoveredShift !== null && shiftsData[hoveredShift]?.scheduled > 0 ? (
                <div
                  key={`tooltip-${shiftsData[hoveredShift].day}`}
                  className="absolute bottom-full mb-2"
                  style={{
                    left: `${tooltipPosition - (scrollContainerRef.current?.scrollLeft || 0)}px`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="rounded bg-white text-black px-4 py-3 whitespace-nowrap shadow-lg">
                    <div className="mb-1 text-sm font-semibold">
                      Report for {shiftsData[hoveredShift].date}
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <div className="text-[#808081] text-xs">Scheduled</div>
                      <div className="text-black text-xs font-semibold">
                        {shiftsData[hoveredShift].scheduled}
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <div className="text-[#808081] text-xs">Visit Completed</div>
                      <div className="text-black text-xs font-semibold">
                        {shiftsData[hoveredShift].completed}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div
            ref={scrollContainerRef}
            className={`flex items-end gap-3 h-[280px] relative pb-4 ${
              timeFilter === "thisMonth" ? "overflow-x-auto scrollbar-hide" : "justify-between overflow-visible"
            }`}
            style={{overflowY: 'visible'}}
          >
            {shiftsData.map((shift, index) => (
              <div
                key={shift.day}
                className={`flex flex-col items-center h-full justify-end relative ${
                  timeFilter === "thisMonth" ? "min-w-[80px] flex-shrink-0" : "flex-1 min-w-[60px]"
                }`}
                onMouseEnter={(e) => {
                  setHoveredShift(index);
                  if (scrollContainerRef.current) {
                    const containerRect = scrollContainerRef.current.getBoundingClientRect();
                    const elementRect = e.currentTarget.getBoundingClientRect();
                    const relativeLeft = elementRect.left - containerRect.left + scrollContainerRef.current.scrollLeft;
                    setTooltipPosition(relativeLeft + (timeFilter === "thisMonth" ? 40 : elementRect.width / 2));
                  }
                }}
                onMouseLeave={() => setHoveredShift(null)}
              >
                <div className="relative w-full flex gap-1 items-end justify-center h-full">
                  {shift.scheduled > 0 ? (
                    <>
                      {/* Scheduled Bar */}
                      <div
                        className="flex-1 text-center text-white text-sm rounded-t-[6px] rounded-b-[6px] bg-[#2B82FF] transition-all duration-300"
                        style={{
                          height: `${(shift.scheduled / maxShiftValue) * 100}%`,
                          minHeight: "30px",
                        }}
                      >{shift.scheduled}
                      </div>
                      {/* Completed Bar */}
                      <div
                        className="flex-1 text-center text-white text-sm rounded-t-[6px] rounded-b-[6px] bg-[#2B82FF]/40 transition-all duration-300"
                        style={{
                          height: `${(shift.completed / maxShiftValue) * 100}%`,
                          minHeight: "30px",
                        }}
                      >{shift.completed}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 h-[30px] rounded-t-[6px] bg-[#e5e5e6]/30"></div>
                  )}
                </div>
                {/* Day Label */}
                <div className="text-[11px] font-medium text-[#808081] mt-2">
                  {shift.day}
                </div>
                {timeFilter === "lastWeek" && (
                  <div className="text-[10px] font-medium text-[#b2b2b3]">
                    {shift.date}
                  </div>
                )}
              </div>
            ))}
          </div>

            {/* Scroll Arrows for This Month */}
            {timeFilter === "thisMonth" && (
              <>
                <button
                  onClick={() => handleScroll("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10 cursor-pointer">
                  <ChevronLeft size={20} className="text-[#10141a]"/>
                </button>
                <button
                  onClick={() => handleScroll("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10 cursor-pointer">
                  <ChevronRight size={20} className="text-[#10141a]"/>
                </button>
              </>
            )}
          </>
          )}
        </div>
      </div>
      {/* Total Shift Stats */}
      <div
        className="mt-8 pt-6 bg-[#FFFFFF4D] p-6 shadow-sm border border-white flex w-full justify-between items-center">
        <div className={"flex flex-col"}>
          <h3 className="text-[16px] font-semibold text-[#10141a] mb-4">
            Total Shift
          </h3>
          <p className="text-[12px] font-medium text-[#808081] mb-4">
            Total shifts done by DSPs
          </p>

        </div>
        <div className={"flex items-center justify-between gap-4"}>
          <div className="flex-1 min-w-[200px]">
            <div className="h-8 bg-[#2B82FF] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#84B7FF] rounded-full transition-all duration-500"
                style={{
                  width: `${totalScheduled > 0 ? (totalCompleted / totalScheduled) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8">
            <div>
              <div className="text-[32px] font-bold text-[#10141a]">
                {totalScheduled}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-[#2B82FF]"></div>
                <span className="text-[12px] font-medium text-[#808081]">
                    Scheduled
                  </span>
              </div>
            </div>

            <div>
              <div className="text-[32px] font-bold text-[#10141a]">
                {totalCompleted}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-[#2B82FF]/40"></div>
                <span className="text-[12px] font-medium text-[#808081]">
                    Visit Completed
                  </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-8">
          {/* Progress Bar */}

          {/* Filter Buttons (Right Side) */}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setTimeFilter("lastWeek")}
              className={`cursor-pointer px-3 py-2 rounded-full text-xs font-semibold transition-colors ${
                timeFilter === "lastWeek"
                  ? "bg-[#00b4b8] text-white"
                  : "bg-[#FFFFFF4D] text-[#10141a] border border-[#B2B2B3] hover:border-[#00b4b8]"
              }`}
            >
              Last Week
            </button>
            <button
              onClick={() => setTimeFilter("thisMonth")}
              className={`cursor-pointer px-3 py-2 rounded-full text-xs font-semibold transition-colors ${
                timeFilter === "thisMonth"
                  ? "bg-[#00b4b8] text-white"
                  : "bg-[#FFFFFF4D] text-[#10141a] border border-[#B2B2B3] hover:border-[#00b4b8]"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeFilter("thisYear")}
              className={`cursor-pointer px-3 py-2 rounded-full text-xs font-semibold transition-colors ${
                timeFilter === "thisYear"
                  ? "bg-[#00b4b8] text-white"
                  : "bg-[#FFFFFF4D] text-[#10141a] border border-[#B2B2B3] hover:border-[#00b4b8]"
              }`}
            >
              This year
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
