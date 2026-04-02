import React, { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  children?: React.ReactNode;
}

export default function TimePicker({ value, onChange, children }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState("12");
  const [minutes, setMinutes] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  // Parse the initial value when component mounts or value changes
  useEffect(() => {
    if (value) {
      const match = value.match(/^(\d{2}):(\d{2})$/);
      if (match) {
        const [_, h, m] = match;
        const hour24 = parseInt(h);
        
        if (hour24 === 0) {
          setHours("12");
          setPeriod("AM");
        } else if (hour24 < 12) {
          setHours(hour24.toString().padStart(2, "0"));
          setPeriod("AM");
        } else if (hour24 === 12) {
          setHours("12");
          setPeriod("PM");
        } else {
          setHours((hour24 - 12).toString().padStart(2, "0"));
          setPeriod("PM");
        }
        
        setMinutes(m);
      }
    }
  }, [value]);

  // Lock body scroll when popover is open
  useEffect(() => {
    if (isOpen) {
      // Store the original overflow value
      const originalOverflow = document.body.style.overflow;
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      
      // Restore original overflow when popover closes or component unmounts
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const incrementHours = () => {
    const h = parseInt(hours || "12");
    const newHour = h === 12 ? 1 : h + 1;
    setHours(newHour.toString().padStart(2, "0"));
  };

  const decrementHours = () => {
    const h = parseInt(hours || "12");
    const newHour = h === 1 ? 12 : h - 1;
    setHours(newHour.toString().padStart(2, "0"));
  };

  const incrementMinutes = () => {
    const m = parseInt(minutes || "0");
    const newMinute = (m + 1) % 60;
    setMinutes(newMinute.toString().padStart(2, "0"));
  };

  const decrementMinutes = () => {
    const m = parseInt(minutes || "0");
    const newMinute = m === 0 ? 59 : m - 1;
    setMinutes(newMinute.toString().padStart(2, "0"));
  };

  const getPrevHour = () => {
    const h = parseInt(hours || "12");
    return h === 1 ? 12 : h - 1;
  };

  const getNextHour = () => {
    const h = parseInt(hours || "12");
    return h === 12 ? 1 : h + 1;
  };

  const getPrevMinute = () => {
    const m = parseInt(minutes || "0");
    return m === 0 ? 59 : m - 1;
  };

  const getNextMinute = () => {
    const m = parseInt(minutes || "0");
    return (parseInt(minutes || "0") + 1) % 60;
  };

  const getNextPeriod = () => {
    return period === "AM" ? "PM" : "AM";
  };

  const getPrevPeriod = () => {
    return period === "AM" ? "PM" : "AM";
  };

  const handleSave = () => {
    const h = parseInt(hours || "12");
    let hour24;
    
    if (period === "AM") {
      hour24 = h === 12 ? 0 : h;
    } else {
      hour24 = h === 12 ? 12 : h + 12;
    }
    
    const timeString = `${hour24.toString().padStart(2, "0")}:${(minutes || "00").padStart(2, "0")}`;
    onChange(timeString);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleHoursWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      decrementHours();
    } else {
      incrementHours();
    }
  };

  const handleMinutesWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      decrementMinutes();
    } else {
      incrementMinutes();
    }
  };

  const displayTime = () => {
    if (!value) return "";
    const match = value.match(/^(\d{2}):(\d{2})$/);
    if (match) {
      const [_, h, m] = match;
      const hour24 = parseInt(h);
      const displayHour = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const displayPeriod = hour24 >= 12 ? "PM" : "AM";
      return `${displayHour.toString().padStart(2, "0")}:${m} ${displayPeriod}`;
    }
    return "";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children || (
          <button 
            type="button" 
            className="w-full h-full flex items-center justify-center focus:outline-none cursor-pointer"
          >
            <span className="text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
              {displayTime()}
            </span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        align="center" 
        side="top"
        className="bg-white rounded-[24px] p-6 shadow-lg border-none w-[320px]"
        sideOffset={5}
      >
        <div className="flex flex-col gap-4">
          {/* Header */}
          <h3 className="text-[16px] font-semibold leading-[1.6] text-[#10141a] text-center font-['Urbanist',sans-serif]">
            Set Time
          </h3>

          {/* Time Wheel - Previous Time */}
          <div className="flex items-center justify-center gap-4 py-2">
            <button
              type="button"
              onClick={decrementHours}
              className="w-16 text-center text-[16px] font-semibold text-[#b2b2b3] font-['Urbanist',sans-serif] hover:opacity-80 transition-opacity"
            >
              {getPrevHour().toString().padStart(2, "0")}
            </button>
            <span className="text-[16px] font-semibold text-[#b2b2b3] font-['Urbanist',sans-serif]">:</span>
            <button
              type="button"
              onClick={decrementMinutes}
              className="w-16 text-center text-[16px] font-semibold text-[#b2b2b3] font-['Urbanist',sans-serif] hover:opacity-80 transition-opacity"
            >
              {getPrevMinute().toString().padStart(2, "0")}
            </button>
            <span className="w-12"></span>
          </div>

          {/* Divider Above Current */}
          <div className="w-full h-[1px] bg-[#e0e0e0]" />

          {/* Time Wheel - Current Time (Active) */}
          <div className="flex items-center justify-center gap-4 py-2">
            <button
              type="button"
              onClick={incrementHours}
              onWheel={handleHoursWheel}
              className="w-16 text-center text-[16px] font-semibold text-black font-['Urbanist',sans-serif] hover:opacity-80 transition-opacity cursor-pointer"
            >
              {hours.padStart(2, "0")}
            </button>
            <span className="text-[16px] font-semibold text-black font-['Urbanist',sans-serif]">:</span>
            <button
              type="button"
              onClick={incrementMinutes}
              onWheel={handleMinutesWheel}
              className="w-16 text-center text-[16px] font-semibold text-black font-['Urbanist',sans-serif] hover:opacity-80 transition-opacity cursor-pointer"
            >
              {minutes.padStart(2, "0")}
            </button>
            <button
              type="button"
              onClick={() => setPeriod(period === "AM" ? "PM" : "AM")}
              className="w-12 text-center text-[16px] font-semibold text-black font-['Urbanist',sans-serif] hover:opacity-70 transition-opacity"
            >
              {period}
            </button>
          </div>

          {/* Divider Below Current */}
          <div className="w-full h-[1px] bg-[#e0e0e0]" />

          {/* Time Wheel - Next Time */}
          <div className="flex items-center justify-center gap-4 py-2">
            <button
              type="button"
              onClick={incrementHours}
              className="w-16 text-center text-[16px] font-semibold text-[#b2b2b3] font-['Urbanist',sans-serif] hover:opacity-80 transition-opacity"
            >
              {getNextHour().toString().padStart(2, "0")}
            </button>
            <span className="text-[16px] font-semibold text-[#b2b2b3] font-['Urbanist',sans-serif]">:</span>
            <button
              type="button"
              onClick={incrementMinutes}
              className="w-16 text-center text-[16px] font-semibold text-[#b2b2b3] font-['Urbanist',sans-serif] hover:opacity-80 transition-opacity"
            >
              {getNextMinute().toString().padStart(2, "0")}
            </button>
            <button
              type="button"
              onClick={() => setPeriod(period === "AM" ? "PM" : "AM")}
              className="w-12 text-center text-[16px] font-semibold text-[#b2b2b3] font-['Urbanist',sans-serif] hover:opacity-80 transition-opacity"
            >
              {getNextPeriod()}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 rounded-[60px] border-[#e0e0e0] px-4 py-4 text-[14px] font-semibold leading-[1.4] text-[#808081] hover:bg-[#f5f5f5] h-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-[60px] bg-[#00b4b8] px-4 py-4 text-[14px] font-semibold leading-[1.4] text-white hover:bg-[#00a3a7] h-auto"
            >
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

