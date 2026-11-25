import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import TimePicker from "@/components/TimePicker";

interface WeekData {
  [day: string]: {
    date: string;
    checkIn: string;
    checkOut: string;
  };
}

interface TimesheetWeekProps {
  weekData: WeekData;
  onWeekDataChange: (data: WeekData) => void;
  totalHours: number;
}

export default function TimesheetWeek({
  weekData,
  onWeekDataChange,
  totalHours,
}: TimesheetWeekProps) {
  const [datePickerState, setDatePickerState] = useState<{ day: string | null; open: boolean }>({
    day: null,
    open: false,
  });

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Convert 12-hour format with AM/PM to 24-hour format
  const convertTo24Hour = (time12h: string): string => {
    if (!time12h) return "";
    const [time, period] = time12h.split(" ");
    if (!time || !period) return "";
    
    const [hour, minute] = time.split(":");
    let hour24 = parseInt(hour);
    
    if (period === "AM") {
      hour24 = hour24 === 12 ? 0 : hour24;
    } else {
      hour24 = hour24 === 12 ? 12 : hour24 + 12;
    }
    
    return `${hour24.toString().padStart(2, "0")}:${minute}`;
  };

  // Convert 24-hour format to 12-hour format with AM/PM
  const convertTo12Hour = (time24h: string): string => {
    if (!time24h) return "";
    const [hour, minute] = time24h.split(":");
    const hour24 = parseInt(hour);
    
    const displayHour = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? "PM" : "AM";
    
    return `${displayHour.toString().padStart(2, "0")}:${minute} ${period}`;
  };

  const handleDateSelect = (date: Date | undefined, day: string) => {
    if (date) {
      const formattedDate = format(date, "dd MMMM");
      onWeekDataChange({
        ...weekData,
        [day]: { ...weekData[day], date: formattedDate },
      });
    }
    setDatePickerState({ day: null, open: false });
  };

  const handleTimeChange = (day: string, field: "checkIn" | "checkOut", time24h: string) => {
    const time12h = convertTo12Hour(time24h);
    onWeekDataChange({
      ...weekData,
      [day]: { 
        ...weekData[day], 
        [field]: time12h 
      },
    });
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
      {/* Table Header */}
      <div className="grid grid-cols-4 gap-4 border-y border-[#eceef0] bg-[#f8f9fa] px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
        <div className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Day</div>
        <div className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Date</div>
        <div className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Check in</div>
        <div className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Check out</div>
      </div>

      {/* Table Rows */}
      <div className="">
        {days.map((day, index) => (
          <div
            key={day}
            className={`grid grid-cols-4 gap-4 px-4 py-2.5 ${
              index !== days.length - 1 ? "border-b border-[#eceef0] dark:border-white/10" : ""
            } hover:bg-[#f8f9fa] transition-colors dark:hover:bg-white/5`}
          >
            <div className="flex items-center text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{day}</div>
            
            {/* Date Picker */}
            <div className="flex items-center">
              <Popover 
                open={datePickerState.open && datePickerState.day === day} 
                onOpenChange={(open) => {
                  setDatePickerState({ day: open ? day : null, open });
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => setDatePickerState({ day, open: true })}
                    className={`w-full h-9 justify-start rounded-[8px] border-[#dcdfe2] bg-white px-3 text-left text-[13px] font-normal text-[#10141a] tabular-nums shadow-none hover:bg-[#f4f6f7] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5 ${
                      !weekData[day].date && "text-[#9aa1a7]"
                    }`}
                  >
                    <CalendarIcon aria-hidden="true" className="w-4 h-4 mr-1 text-[#6b737a]" />
                    {weekData[day].date || "---"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    className="bg-white"
                    captionLayout="dropdown"
                    startMonth={new Date(1924, 0)}
                    endMonth={new Date()}
                    onSelect={(date) => handleDateSelect(date, day)}
                    formatters={{
                      formatMonthDropdown: (date) =>
                        date.toLocaleString("default", { month: "long" }),
                    }}
                    classNames={{
                      dropdown_root: "relative border-none shadow-none has-focus:ring-0",
                      caption_label: "rounded-md pl-2 pr-2 flex items-center gap-1 text-sm h-8 [&>svg]:hidden",
                    }}
                    autoFocus={true}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Check In Time Picker */}
            <div className="flex items-center">
              <TimePicker
                value={convertTo24Hour(weekData[day].checkIn)}
                onChange={(time24h) => handleTimeChange(day, "checkIn", time24h)}
              >
                <Button
                  variant="outline"
                  className={`w-full h-9 justify-start rounded-[8px] border-[#dcdfe2] bg-white px-3 text-left text-[13px] font-normal text-[#10141a] tabular-nums shadow-none hover:bg-[#f4f6f7] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5 ${
                    !weekData[day].checkIn && "text-[#9aa1a7]"
                  }`}
                >
                  <Clock aria-hidden="true" className="w-4 h-4 mr-1 text-[#6b737a]" />
                  {weekData[day].checkIn || "---"}
                </Button>
              </TimePicker>
            </div>
            
            {/* Check Out Time Picker */}
            <div className="flex items-center">
              <TimePicker
                value={convertTo24Hour(weekData[day].checkOut)}
                onChange={(time24h) => handleTimeChange(day, "checkOut", time24h)}
              >
                <Button
                  variant="outline"
                  className={`w-full h-9 justify-start rounded-[8px] border-[#dcdfe2] bg-white px-3 text-left text-[13px] font-normal text-[#10141a] tabular-nums shadow-none hover:bg-[#f4f6f7] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5 ${
                    !weekData[day].checkOut && "text-[#9aa1a7]"
                  }`}
                >
                  <Clock aria-hidden="true" className="w-4 h-4 mr-1 text-[#6b737a]" />
                  {weekData[day].checkOut || "---"}
                </Button>
              </TimePicker>
            </div>
          </div>
        ))}
      </div>

      {/* Total Hours */}
      <div className="border-t border-[#eceef0] px-4 py-3 text-right dark:border-white/10">
        <span className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">
          Total Hours : <span className="font-medium text-[#10141a] dark:text-[#f4f6f7]">{totalHours} hours</span>
        </span>
      </div>
      </div>
    </div>
  );
}