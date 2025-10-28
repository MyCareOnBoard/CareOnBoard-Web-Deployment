import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[60px] border px-[10px] py-[8px] text-[12px] font-semibold leading-[14px] tracking-tight whitespace-nowrap"
)

const badgeStyles: Record<string, string> = {
  confirmed: "border-[var(--color-green)] bg-[#f0faf4] text-[var(--color-green)]",
  rejected: "border-[#ff4545] bg-[#f0faf4] text-[#ff4545]",
  pending: "border-[var(--color-grey-200)] bg-[#f0faf4] text-[var(--color-grey-200)]",
}

type BadgeProps = React.ComponentProps<"span"> & {
  variant?: keyof typeof badgeStyles
  asChild?: boolean
}

function Badge({ className, variant = "pending", asChild, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants(), badgeStyles[variant], className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
