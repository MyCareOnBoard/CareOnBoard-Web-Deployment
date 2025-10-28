import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  icon?: React.ReactNode;
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  icon,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative h-[8px] w-full overflow-hidden rounded-[200px] bg-[#f3f6f7]"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full rounded-[200px] bg-[#00b4b8]"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="relative z-10 flex size-[32px] shrink-0 items-center justify-center rounded-[200px] border border-[#00b4b8] bg-[rgba(239,242,243,0.3)] backdrop-blur-sm transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]/25 disabled:pointer-events-none disabled:opacity-50"
        >
          {icon && <span className="flex items-center justify-center">{icon}</span>}
        </SliderPrimitive.Thumb>
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
