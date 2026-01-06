import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {ReactNode, ReactPortal} from "react";

interface MultiSelectProps {
    value?: string[]
    onValueChange?: (value: string[]) => void
    placeholder?: string
    className?: string
    buttonClassName?: string
    size?: "sm" | "default"
    disabled?: boolean
    children: React.ReactNode
}

function MultiSelect({
                         value = [],
                         onValueChange,
                         placeholder = "Select options...",
                         className,
                         buttonClassName,
                         size = "default",
                         disabled = false,
                         children,
                     }: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [selectedValues, setSelectedValues] = React.useState<string[]>(value)

    React.useEffect(() => {
        setSelectedValues(value)
    }, [value])

    const handleSelect = (itemValue: string) => {
        const newValues = selectedValues.includes(itemValue)
            ? selectedValues.filter((v) => v !== itemValue)
            : [...selectedValues, itemValue]

        setSelectedValues(newValues)
        onValueChange?.(newValues)
    }

    const handleRemove = (itemValue: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const newValues = selectedValues.filter((v) => v !== itemValue)
        setSelectedValues(newValues)
        onValueChange?.(newValues)
    }

    // Extract items from children to get labels
    const getItemLabel = (itemValue: string): string => {
        let label = itemValue
        React.Children.forEach(children, (child: any) => {
            if (React.isValidElement(child) && child.type === MultiSelectItem) {
                if ((child.props as {value: string}).value === itemValue) {
                    label = ((child.props as {children: ReactNode}).children as string) || itemValue
                }
            } else if (React.isValidElement(child) && child.type === MultiSelectGroup) {
                React.Children.forEach((child.props as {children: ReactNode}).children, (groupChild) => {
                    if (React.isValidElement(groupChild) && groupChild.type === MultiSelectItem) {
                        if ((groupChild.props as {value: string}).value === itemValue) {
                            label = ((groupChild.props as {children: ReactNode}).children as string) || itemValue
                        }
                    }
                })
            }
        })
        return label
    }

    return (
        <div className={cn("relative", className)}>
            <button
                type="button"
                data-slot="multi-select-trigger"
                data-size={size}
                onClick={() => !disabled && setOpen(!open)}
                disabled={disabled}
                className={cn(
                    "flex w-full min-w-[254px] items-center justify-between gap-2 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-0 text-sm font-normal leading-[1.4] text-[var(--input-text)] outline-none transition-colors duration-200",
                    "h-11 data-[size=sm]:h-9",
                    "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    open && "border-primary ring-2 ring-ring/20",
                    buttonClassName
                )}
            >
                <div className="flex flex-1 flex-wrap items-center gap-1.5 overflow-hidden">
                    {selectedValues.length === 0 ? (
                        <span className="text-[var(--input-placeholder)]">{placeholder}</span>
                    ) : (
                        selectedValues.map((val) => (
                            <span
                                key={val}
                                className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_oklab,var(--main-color)_12%,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--input-text)]"
                            >
                {getItemLabel(val)}
                                <button
                                    type="button"
                                    onClick={(e) => handleRemove(val, e)}
                                    className="rounded-sm hover:bg-[color-mix(in_oklab,var(--main-color)_20%,transparent)] focus:outline-none focus:ring-1 focus:ring-[var(--main-color)]"
                                >
                  <XIcon className="size-3" />
                </button>
              </span>
                        ))
                    )}
                </div>
                <ChevronDownIcon
                    className={cn(
                        "size-5 shrink-0 text-[var(--input-text)] transition-transform duration-200",
                        open && "rotate-180"
                    )}
                />
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setOpen(false)}
                />
            )}

            {open && (
                <div
                    data-slot="multi-select-content"
                    className={cn(
                        "absolute z-50 mt-1 max-h-[300px] w-full min-w-[8rem] origin-top animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 overflow-y-auto rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-1 text-[var(--input-text)] shadow-lg"
                    )}
                >
                    {React.Children.map(children, (child: ReactNode) => {
                        if (React.isValidElement(child)) {
                            if (child.type === MultiSelectItem) {
                                return React.cloneElement(child as React.ReactElement<any>, {
                                    selected: selectedValues.includes((child.props as {value: string}).value),
                                    onSelect: handleSelect,
                                })
                            } else if (child.type === MultiSelectGroup) {
                                return React.cloneElement(child as React.ReactElement<any>, {
                                    children: React.Children.map((child.props as {children: ReactNode}).children, (groupChild) => {
                                        if (React.isValidElement(groupChild) && groupChild.type === MultiSelectItem) {
                                            return React.cloneElement(groupChild as React.ReactElement<any>, {
                                                selected: selectedValues.includes((groupChild.props as {value: string}).value),
                                                onSelect: handleSelect,
                                            })
                                        }
                                        return groupChild
                                    }),
                                })
                            }
                        }
                        return child
                    })}
                </div>
            )}
        </div>
    )
}

interface MultiSelectItemProps {
    value: string
    children: React.ReactNode
    className?: string
    disabled?: boolean
    selected?: boolean
    onSelect?: (value: string) => void
}

function MultiSelectItem({
                             value,
                             children,
                             className,
                             disabled = false,
                             selected = false,
                             onSelect,
                         }: MultiSelectItemProps) {
    return (
        <div
            data-slot="multi-select-item"
            onClick={() => !disabled && onSelect?.(value)}
            className={cn(
                "relative flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-normal text-[var(--input-text)] outline-none transition-colors duration-150",
                "hover:bg-[color-mix(in_oklab,var(--main-color)_12%,transparent)] hover:text-[var(--input-text)]",
                selected && "bg-[color-mix(in_oklab,var(--main-color)_8%,transparent)]",
                "focus:bg-[color-mix(in_oklab,var(--main-color)_12%,transparent)] focus:text-[var(--input-text)]",
                disabled && "pointer-events-none opacity-50",
                className
            )}
        >
      <span className="absolute right-3 flex size-4 items-center justify-center text-[var(--main-color)]">
        {selected && <CheckIcon className="size-4" />}
      </span>
            <span className="flex-1 pr-6">{children}</span>
        </div>
    )
}

function MultiSelectGroup({
                              children,
                              className,
                          }: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div data-slot="multi-select-group" className={className}>
            {children}
        </div>
    )
}

function MultiSelectLabel({
                              children,
                              className,
                          }: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div
            data-slot="multi-select-label"
            className={cn("text-muted-foreground px-2 py-1.5 text-xs font-medium", className)}
        >
            {children}
        </div>
    )
}

function MultiSelectSeparator({ className }: { className?: string }) {
    return (
        <div
            data-slot="multi-select-separator"
            className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
        />
    )
}

export {
    MultiSelect,
    MultiSelectItem,
    MultiSelectGroup,
    MultiSelectLabel,
    MultiSelectSeparator,
}