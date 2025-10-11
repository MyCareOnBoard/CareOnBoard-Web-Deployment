import * as React from "react"

import { cn } from "src/lib/utils"

const FileUpload = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & {
    label?: string
    icon?: React.ReactNode
  }
>(({ className, label = "Upload your resume", icon, ...props }, ref) => {
  return (
    <label
      className={cn(
        "group relative flex w-full max-w-[496px] cursor-pointer items-center justify-center rounded-[12px] border border-[var(--input-border)] bg-[var(--input-bg)] px-6 py-8 transition-colors duration-200",
        "hover:border-primary/70 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20",
        className
      )}
    >
      <span className="pointer-events-none flex items-center gap-3 text-sm font-normal leading-[1.4] text-[var(--input-placeholder)]">
        {icon ?? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="size-5 text-[var(--input-placeholder)]"
          >
            <path
              d="M12 16V4m0 0 3 3m-3-3-3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6 12v5.4A1.6 1.6 0 0 0 7.6 19h8.8a1.6 1.6 0 0 0 1.6-1.6V12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {label}
      </span>
      <input
        ref={ref}
        type="file"
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        {...props}
      />
    </label>
  )
})

FileUpload.displayName = "FileUpload"

export { FileUpload }
