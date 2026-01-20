import * as React from "react"

import { cn } from "@/lib/utils"

const FileUpload = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & {
    label?: string
    icon?: React.ReactNode
    onFilesSelected?: (files: FileList | null) => void
  }
>(({ className, label = "Upload your resume", icon, onFilesSelected, ...props }, ref) => {
  const [isDragActive, setIsDragActive] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Merge refs
  React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Only set to false if we're leaving the label element entirely
    const relatedTarget = e.relatedTarget as Node
    if (!e.currentTarget.contains(relatedTarget)) {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      // Set files to the input element
      if (inputRef.current) {
        inputRef.current.files = files

        // Trigger change event
        const event = new Event('change', { bubbles: true })
        inputRef.current.dispatchEvent(event)
      }

      // Call the callback if provided
      onFilesSelected?.(files)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilesSelected?.(e.target.files)
    props.onChange?.(e)
  }

  return (
    <label
      className={cn(
        "group relative flex w-full max-w-[496px] cursor-pointer items-center justify-center rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-6 py-8 transition-all duration-200",
        "hover:border-primary/70 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20",
        isDragActive && "border-primary bg-primary/5 ring-2 ring-primary/20",
        className
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span className="pointer-events-none flex items-center gap-3 text-sm font-normal leading-[1.4] text-[var(--input-placeholder)]">
        {icon ?? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={cn(
              "size-5 text-[var(--input-placeholder)] transition-transform duration-200",
              isDragActive && "scale-110 text-primary"
            )}
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
        <span className={cn(isDragActive && "text-primary font-medium")}>
          {isDragActive ? "Drop files here" : label}
        </span>
      </span>
      <input
        ref={inputRef}
        type="file"
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        onChange={handleInputChange}
        {...props}
      />
    </label>
  )
})

FileUpload.displayName = "FileUpload"

export { FileUpload }
