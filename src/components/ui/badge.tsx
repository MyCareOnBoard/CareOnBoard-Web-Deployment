import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[60px] border px-[10px] py-[8px] text-[12px] font-semibold leading-[14px] tracking-tight whitespace-nowrap"
)

const badgeStyles: Record<string, string> = {
  confirmed: "bg-[rgba(14,175,82,0.1)] border-[#0eaf52] text-[#0eaf52]",
  success: "bg-[rgba(14,175,82,0.1)] border-[#0eaf52] text-[#0eaf52]",
  completed: "border-[#10141a]/20 bg-white text-[#10141a]",
  incomplete: "border-amber-300 bg-amber-100 text-amber-900",
  warning: "border-[#ff4545] bg-[#f0faf4] text-[#ff4545]",
  pending: "border-[var(--grey-200)] bg-[#f0faf4] text-[var(--grey-200)]",
  expired: "border-[#ff4545] bg-[#fef2f2] text-[#ff4545]",
  error: "border-[#ff4545] bg-[#fef2f2] text-[#ff4545]",
  info: "border-[#00b4b8] bg-[#f0faf4] text-[#00b4b8]",
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
