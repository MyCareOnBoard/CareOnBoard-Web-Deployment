import { useState, useRef, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";

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
  const [timePickerState, setTimePickerState] = useState<{ 
    day: string | null; 
    field: "checkIn" | "checkOut" | null;
    open: boolean;
  }>({
    day: null,
    field: null,
    open: false,
  });
  const [tempTime, setTempTime] = useState({ hour: "10", minute: "00", period: "AM" });

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

  const handleTimeClick = (day: string, field: "checkIn" | "checkOut") => {
    // Parse existing time if available
    const currentTime = weekData[day][field];
    if (currentTime) {
      const [time, period] = currentTime.split(" ");
      if (time && period) {
        const [hour, minute] = time.split(":");
        setTempTime({ hour: hour || "10", minute: minute || "00", period: period || "AM" });
      }
    } else {
      setTempTime({ hour: "10", minute: "00", period: "AM" });
    }
    
    setTimePickerState({ day, field, open: true });
  };

  const handleTimeSave = () => {
    if (timePickerState.day && timePickerState.field) {
      const timeString = `${tempTime.hour.padStart(2, '0')}:${tempTime.minute.padStart(2, '0')} ${tempTime.period}`;
      onWeekDataChange({
        ...weekData,
        [timePickerState.day]: { 
          ...weekData[timePickerState.day], 
          [timePickerState.field]: timeString 
        },
      });
    }
    setTimePickerState({ day: null, field: null, open: false });
  };

  const handleTimeCancel = () => {
    setTimePickerState({ day: null, field: null, open: false });
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
                    onSelect={(date) => handleDateSelect(date, day)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Check In Time Picker */}
            <div className="flex items-center">
              <Popover 
                open={timePickerState.open && timePickerState.day === day && timePickerState.field === "checkIn"} 
                onOpenChange={(open) => {
                  if (!open) {
                    setTimePickerState({ day: null, field: null, open: false });
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => handleTimeClick(day, "checkIn")}
                    className={`w-full justify-start text-left font-normal border-[#e5e5e6] rounded-md bg-white hover:bg-[#f8f9fa] ${
                      !weekData[day].checkIn && "text-[#a0a0a1]"
                    }`}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {weekData[day].checkIn || "---"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="bg-white w-80" align="start">
                  <div className="p-4 space-y-4">
                    <h4 className="font-semibold text-center text-[#10141a]">Set Time</h4>
                    
                    <div className="flex items-center justify-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={tempTime.hour}
                        onChange={(e) => {
                          let value = parseInt(e.target.value) || 1;
                          if (value < 1) value = 1;
                          if (value > 12) value = 12;
                          setTempTime({ ...tempTime, hour: value.toString() });
                        }}
                        className="w-16 text-center border-[#e5e5e6] rounded-md"
                      />
                      <span className="text-lg font-semibold text-[#10141a]">:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={tempTime.minute}
                        onChange={(e) => {
                          let value = parseInt(e.target.value) || 0;
                          if (value < 0) value = 0;
                          if (value > 59) value = 59;
                          setTempTime({ ...tempTime, minute: value.toString().padStart(2, "0") });
                        }}
                        className="w-16 text-center border-[#e5e5e6] rounded-md"
                      />
                      <select
                        value={tempTime.period}
                        onChange={(e) => setTempTime({ ...tempTime, period: e.target.value })}
                        className="border border-[#e5e5e6] rounded-md px-3 py-2 bg-white text-[#10141a] focus:outline-none focus:ring-2 focus:ring-[#00b4b8]"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleTimeCancel}
                        className="flex-1 border-[#e5e5e6] rounded-md"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleTimeSave}
                        className="flex-1 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-md"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Check Out Time Picker */}
            <div className="flex items-center">
              <Popover 
                open={timePickerState.open && timePickerState.day === day && timePickerState.field === "checkOut"} 
                onOpenChange={(open) => {
                  if (!open) {
                    setTimePickerState({ day: null, field: null, open: false });
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => handleTimeClick(day, "checkOut")}
                    className={`w-full justify-start text-left font-normal border-[#e5e5e6] rounded-md bg-white hover:bg-[#f8f9fa] ${
                      !weekData[day].checkOut && "text-[#a0a0a1]"
                    }`}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {weekData[day].checkOut || "---"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="bg-white w-80" align="start">
                  <div className="p-4 space-y-4">
                    <h4 className="font-semibold text-center text-[#10141a]">Set Time</h4>
                    
                    <div className="flex items-center justify-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={tempTime.hour}
                        onChange={(e) => {
                          let value = parseInt(e.target.value) || 1;
                          if (value < 1) value = 1;
                          if (value > 12) value = 12;
                          setTempTime({ ...tempTime, hour: value.toString() });
                        }}
                        className="w-16 text-center border-[#e5e5e6] rounded-md"
                      />
                      <span className="text-lg font-semibold text-[#10141a]">:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={tempTime.minute}
                        onChange={(e) => {
                          let value = parseInt(e.target.value) || 0;
                          if (value < 0) value = 0;
                          if (value > 59) value = 59;
                          setTempTime({ ...tempTime, minute: value.toString().padStart(2, "0") });
                        }}
                        className="w-16 text-center border-[#e5e5e6] rounded-md"
                      />
                      <select
                        value={tempTime.period}
                        onChange={(e) => setTempTime({ ...tempTime, period: e.target.value })}
                        className="border border-[#e5e5e6] rounded-md px-3 py-2 bg-white text-[#10141a] focus:outline-none focus:ring-2 focus:ring-[#00b4b8]"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleTimeCancel}
                        className="flex-1 border-[#e5e5e6] rounded-md"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleTimeSave}
                        className="flex-1 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-md"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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