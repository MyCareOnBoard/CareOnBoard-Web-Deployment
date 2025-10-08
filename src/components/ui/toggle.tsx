"use client"

import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-start rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50 data-[state=off]:bg-[rgba(0,0,0,0.08)] data-[state=on]:bg-[rgba(0,180,184,0.22)] after:content-[''] after:absolute after:left-1 after:top-1 after:size-6 after:rounded-full after:bg-[var(--color-grey-200)] after:shadow-[0px_3px_4px_rgba(0,0,0,0.08)] after:transition-all after:duration-200 data-[state=on]:after:translate-x-6 data-[state=on]:after:bg-[var(--color-main)] data-[state=on]:after:shadow-[0px_3px_8px_rgba(0,0,0,0.15),0px_3px_1px_rgba(0,0,0,0.06)]",
  {
    variants: {
      variant: {
        default: "",
      },
      size: {
        default: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
