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
    <div className="overflow-hidden rounded-xl bg-[#0EAF520D]">
      {/* Table Header */}
      <div className="grid grid-cols-4 gap-4 p-4 pt-4">
        <div className="font-semibold text-sm text-[#10141a]">Day</div>
        <div className="font-semibold text-sm text-[#10141a]">Date</div>
        <div className="font-semibold text-sm text-[#10141a]">Check In</div>
        <div className="font-semibold text-sm text-[#10141a]">Check Out</div>
      </div>

      {/* Table Rows */}
      <div className="">
        {days.map((day, index) => (
          <div
            key={day}
            className={`grid grid-cols-4 gap-4 p-4 ${
              index !== days.length - 1 ? "border-b border-[#e5e5e6]" : ""
            } hover:bg-[#f8f9fa] transition-colors`}
          >
            <div className="flex items-center text-sm font-medium text-[#10141a]">{day}</div>
            
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
                    className={`w-full justify-start text-left font-normal border-[#e5e5e6] rounded-md bg-white hover:bg-[#f8f9fa] ${
                      !weekData[day].date && "text-[#a0a0a1]"
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
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
                  className={`w-full justify-start text-left font-normal border-[#e5e5e6] rounded-md bg-white hover:bg-[#f8f9fa] ${
                    !weekData[day].checkIn && "text-[#a0a0a1]"
                  }`}
                >
                  <Clock className="w-4 h-4 mr-2" />
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
                  className={`w-full justify-start text-left font-normal border-[#e5e5e6] rounded-md bg-white hover:bg-[#f8f9fa] ${
                    !weekData[day].checkOut && "text-[#a0a0a1]"
                  }`}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {weekData[day].checkOut || "---"}
                </Button>
              </TimePicker>
            </div>
          </div>
        ))}
      </div>

      {/* Total Hours */}
      <div className="p-4 bg-[#f8f9fa] text-right">
        <span className="text-sm font-semibold text-[#10141a]">
          Total Hours : {totalHours} hours
        </span>
      </div>
    </div>
  );
}