import React, { useCallback, useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  children?: React.ReactNode;
}

const SWIPE_THRESHOLD_PX = 20;

function useVerticalSwipe(onSwipeUp: () => void, onSwipeDown: () => void) {
  const startYRef = useRef<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (Math.abs(dy) > 8) {
        e.preventDefault();
      }
    };

    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", handleTouchMove);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (startYRef.current === null) return;
      const dy = e.changedTouches[0].clientY - startYRef.current;
      if (dy < -SWIPE_THRESHOLD_PX) {
        onSwipeUp();
      } else if (dy > SWIPE_THRESHOLD_PX) {
        onSwipeDown();
      }
      startYRef.current = null;
    },
    [onSwipeDown, onSwipeUp],
  );

  const onTouchCancel = useCallback(() => {
    startYRef.current = null;
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        onSwipeUp();
      } else {
        onSwipeDown();
      }
    },
    [onSwipeDown, onSwipeUp],
  );

  return { ref, onTouchStart, onTouchEnd, onTouchCancel, onWheel };
}

type SwipeColumnProps = {
  topLabel: string;
  centerLabel: string;
  bottomLabel: string;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onTapTop: () => void;
  onTapCenter: () => void;
  onTapBottom: () => void;
  className?: string;
};

function SwipeColumn({
  topLabel,
  centerLabel,
  bottomLabel,
  onSwipeUp,
  onSwipeDown,
  onTapTop,
  onTapCenter,
  onTapBottom,
  className,
}: SwipeColumnProps) {
  const swipe = useVerticalSwipe(onSwipeUp, onSwipeDown);

  return (
    <div
      ref={swipe.ref}
      className={cn(
        "flex min-h-[140px] min-w-[3rem] flex-col items-center gap-4 py-1 select-none touch-none",
        className,
      )}
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
      onTouchCancel={swipe.onTouchCancel}
      onWheel={swipe.onWheel}
    >
      <button
        type="button"
        onClick={onTapTop}
        className="w-full py-1.5 text-center text-[16px] font-semibold text-[#b2b2b3] font-['Urbanist',sans-serif] hover:opacity-80 active:opacity-70"
      >
        {topLabel}
      </button>
      <button
        type="button"
        onClick={onTapCenter}
        className="w-full py-1.5 text-center text-[16px] font-semibold text-black font-['Urbanist',sans-serif] hover:opacity-80 active:opacity-70"
      >
        {centerLabel}
      </button>
      <button
        type="button"
        onClick={onTapBottom}
        className="w-full py-1.5 text-center text-[16px] font-semibold text-[#b2b2b3] font-['Urbanist',sans-serif] hover:opacity-80 active:opacity-70"
      >
        {bottomLabel}
      </button>
    </div>
  );
}

export default function TimePicker({ value, onChange, children }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState("12");
  const [minutes, setMinutes] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    if (value) {
      const match = value.match(/^(\d{2}):(\d{2})$/);
      if (match) {
        const [, h, m] = match;
        const hour24 = parseInt(h, 10);

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

  const incrementHours = useCallback(() => {
    setHours((prev) => {
      const h = parseInt(prev || "12", 10);
      const newHour = h === 12 ? 1 : h + 1;
      return newHour.toString().padStart(2, "0");
    });
  }, []);

  const decrementHours = useCallback(() => {
    setHours((prev) => {
      const h = parseInt(prev || "12", 10);
      const newHour = h === 1 ? 12 : h - 1;
      return newHour.toString().padStart(2, "0");
    });
  }, []);

  const incrementMinutes = useCallback(() => {
    setMinutes((prev) => {
      const m = parseInt(prev || "0", 10);
      return ((m + 1) % 60).toString().padStart(2, "0");
    });
  }, []);

  const decrementMinutes = useCallback(() => {
    setMinutes((prev) => {
      const m = parseInt(prev || "0", 10);
      return (m === 0 ? 59 : m - 1).toString().padStart(2, "0");
    });
  }, []);

  const togglePeriod = useCallback(() => {
    setPeriod((prev) => (prev === "AM" ? "PM" : "AM"));
  }, []);

  const getPrevHour = () => {
    const h = parseInt(hours || "12", 10);
    return (h === 1 ? 12 : h - 1).toString().padStart(2, "0");
  };

  const getNextHour = () => {
    const h = parseInt(hours || "12", 10);
    return (h === 12 ? 1 : h + 1).toString().padStart(2, "0");
  };

  const getPrevMinute = () => {
    const m = parseInt(minutes || "0", 10);
    return (m === 0 ? 59 : m - 1).toString().padStart(2, "0");
  };

  const getNextMinute = () => {
    const m = parseInt(minutes || "0", 10);
    return ((m + 1) % 60).toString().padStart(2, "0");
  };

  const getNextPeriod = () => (period === "AM" ? "PM" : "AM");
  const getPrevPeriod = () => (period === "AM" ? "PM" : "AM");

  const handleSave = () => {
    const h = parseInt(hours || "12", 10);
    let hour24: number;

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

  const displayTime = () => {
    if (!value) return "";
    const match = value.match(/^(\d{2}):(\d{2})$/);
    if (match) {
      const [, h, m] = match;
      const hour24 = parseInt(h, 10);
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
            className="flex h-full w-full cursor-pointer items-center justify-center focus:outline-none"
          >
            <span className="font-['Urbanist',sans-serif] text-[14px] font-normal leading-[1.4] text-[#10141a]">
              {displayTime()}
            </span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="top"
        className="w-[320px] rounded-[24px] border-none bg-white p-6 shadow-lg"
        sideOffset={5}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-4">
          <h3 className="text-center font-['Urbanist',sans-serif] text-[16px] font-semibold leading-[1.6] text-[#10141a]">
            Set Time
          </h3>

          <div className="relative px-1">
            <div className="pointer-events-none absolute inset-x-0 top-[44px] h-px bg-[#e0e0e0]" />
            <div className="pointer-events-none absolute inset-x-0 top-[96px] h-px bg-[#e0e0e0]" />

            <div className="flex items-stretch justify-center gap-3">
              <SwipeColumn
                topLabel={getPrevHour()}
                centerLabel={hours.padStart(2, "0")}
                bottomLabel={getNextHour()}
                onSwipeUp={incrementHours}
                onSwipeDown={decrementHours}
                onTapTop={decrementHours}
                onTapCenter={incrementHours}
                onTapBottom={incrementHours}
              />

              <span className="flex items-center justify-center self-center font-['Urbanist',sans-serif] text-[16px] font-semibold text-black">
                :
              </span>

              <SwipeColumn
                topLabel={getPrevMinute()}
                centerLabel={minutes.padStart(2, "0")}
                bottomLabel={getNextMinute()}
                onSwipeUp={incrementMinutes}
                onSwipeDown={decrementMinutes}
                onTapTop={decrementMinutes}
                onTapCenter={incrementMinutes}
                onTapBottom={incrementMinutes}
              />

              <SwipeColumn
                className="min-w-[2.75rem]"
                topLabel={getPrevPeriod()}
                centerLabel={period}
                bottomLabel={getNextPeriod()}
                onSwipeUp={togglePeriod}
                onSwipeDown={togglePeriod}
                onTapTop={togglePeriod}
                onTapCenter={togglePeriod}
                onTapBottom={togglePeriod}
              />
            </div>
          </div>

          <div className="mt-1 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="h-auto flex-1 rounded-[60px] border-[#e0e0e0] px-4 py-4 text-[14px] font-semibold leading-[1.4] text-[#808081] hover:bg-[#f5f5f5]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="h-auto flex-1 rounded-[60px] bg-[#00b4b8] px-4 py-4 text-[14px] font-semibold leading-[1.4] text-white hover:bg-[#00a3a7]"
            >
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
