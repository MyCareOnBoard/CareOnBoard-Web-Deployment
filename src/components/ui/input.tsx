import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-[12px] border border-[var(--input-border)] bg-[var(--input-bg)] px-4 text-sm font-normal leading-[1.4] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] shadow-none transition-colors duration-200 outline-none",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-0",
        "aria-invalid:border-[var(--input-error-border)] aria-invalid:text-[var(--input-error-text)] aria-invalid:placeholder:text-[var(--input-error-text)] aria-invalid:focus-visible:ring-[color-mix(in_oklab,var(--input-error-border)_45%,transparent)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
}

export { Input }
