import * as React from 'react'

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-[44px] w-full min-w-0 rounded-[12px] border border-[#cccccd] bg-white px-4 py-0 text-sm font-normal leading-[1.4] text-[#10141a] placeholder:text-[#b2b2b3] shadow-none transition-colors duration-200 outline-none",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-0",
        "aria-invalid:border-[#d53411] aria-invalid:text-[#d53411] aria-invalid:placeholder:text-[#d53411] aria-invalid:focus-visible:ring-[#d53411]/25",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
}

export { Input }
