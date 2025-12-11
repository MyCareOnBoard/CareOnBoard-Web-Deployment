import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "relative flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--grey-200)] bg-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--main-color)]/25 disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-[var(--main-color)] data-[state=checked]:bg-[var(--main-color)]",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="pointer-events-none flex size-full items-center justify-center"
      >
        <CheckIcon className="size-4 text-white" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
