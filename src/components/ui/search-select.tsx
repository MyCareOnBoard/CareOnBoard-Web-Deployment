import * as React from "react"
import { Search, Check, X, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Option {
    value: string
    label: string
    description?: string
    icon?: React.ReactNode
}

interface SearchSelectProps {
    options: Option[]
    value?: string
    onChange?: (value: string) => void
    /** Fired when the dropdown search text changes (e.g. to load remote options). Cleared when the menu closes. */
    onSearchChange?: (query: string) => void
    placeholder?: string
    emptyMessage?: string
    className?: string
    disabled?: boolean
    searchPlaceholder?: string
}

export function SearchSelect({
                                 options,
                                 value,
                                 onChange,
                                 onSearchChange,
                                 placeholder = "Select an option...",
                                 emptyMessage = "No results found",
                                 className,
                                 disabled = false,
                                 searchPlaceholder = "Search...",
                             }: SearchSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [highlightedIndex, setHighlightedIndex] = React.useState(0)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const searchInputRef = React.useRef<HTMLInputElement>(null)
    const listRef = React.useRef<HTMLDivElement>(null)

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
        if (!searchQuery) return options

        const query = searchQuery.toLowerCase()
        return options.filter(
            (option) =>
                option.label.toLowerCase().includes(query) ||
                option.description?.toLowerCase().includes(query) ||
                option.value.toLowerCase().includes(query)
        )
    }, [options, searchQuery])

    // Get selected option
    const selectedOption = options.find((opt) => opt.value === value)

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Focus search input when dropdown opens
    React.useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus()
        }
    }, [isOpen])

    // Reset search and highlighted index when dropdown closes
    React.useEffect(() => {
        if (!isOpen) {
            setSearchQuery("")
            setHighlightedIndex(0)
            onSearchChange?.("")
        }
    }, [isOpen, onSearchChange])

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return

        switch (e.key) {
            case "Enter":
                e.preventDefault()
                if (isOpen && filteredOptions[highlightedIndex]) {
                    handleSelect(filteredOptions[highlightedIndex].value)
                } else {
                    setIsOpen(true)
                }
                break
            case "Escape":
                e.preventDefault()
                setIsOpen(false)
                break
            case "ArrowDown":
                e.preventDefault()
                if (!isOpen) {
                    setIsOpen(true)
                } else {
                    setHighlightedIndex((prev) =>
                        prev < filteredOptions.length - 1 ? prev + 1 : prev
                    )
                }
                break
            case "ArrowUp":
                e.preventDefault()
                if (isOpen) {
                    setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
                }
                break
            case "Tab":
                if (isOpen) {
                    e.preventDefault()
                }
                break
        }
    }

    // Scroll highlighted item into view
    React.useEffect(() => {
        if (isOpen && listRef.current) {
            const highlightedElement = listRef.current.children[
                highlightedIndex
                ] as HTMLElement
            if (highlightedElement) {
                highlightedElement.scrollIntoView({
                    block: "nearest",
                    behavior: "smooth",
                })
            }
        }
    }, [highlightedIndex, isOpen])

    const handleSelect = (optionValue: string) => {
        onChange?.(optionValue)
        setIsOpen(false)
        setSearchQuery("")
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange?.("")
        setSearchQuery("")
    }

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className={cn(
                    "group relative flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-left text-sm transition-all duration-200",
                    "hover:border-[var(--main-color)] hover:shadow-sm",
                    "focus-visible:border-[var(--main-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--main-color)]/20",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    isOpen && "border-[var(--main-color)] ring-2 ring-[var(--main-color)]/20",
                    className
                )}
            >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    {selectedOption?.icon && (
                        <span className="shrink-0 text-[var(--main-color)]">
              {selectedOption.icon}
            </span>
                    )}
                    <div className="min-w-0 flex-1">
                        {selectedOption ? (
                            <>
                                <div className="truncate font-medium text-[var(--input-text)]">
                                    {selectedOption.label}
                                </div>
                                {selectedOption.description && (
                                    <div className="truncate text-xs text-[var(--input-placeholder)]">
                                        {selectedOption.description}
                                    </div>
                                )}
                            </>
                        ) : (
                            <span className="text-[var(--input-placeholder)]">
                {placeholder}
              </span>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {selectedOption && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="rounded p-0.5 hover:bg-[var(--input-border)] focus:outline-none"
                        >
                            <X className="h-4 w-4 text-[var(--input-placeholder)]" />
                        </button>
                    )}
                    <ChevronDown
                        className={cn(
                            "h-5 w-5 text-[var(--input-text)] transition-transform duration-200",
                            isOpen && "rotate-180"
                        )}
                    />
                </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className={cn(
                        "absolute z-50 mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] shadow-lg",
                        "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
                    )}
                >
                    {/* Search Input */}
                    <div className="border-b border-[var(--input-border)] p-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--input-placeholder)]" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    const q = e.target.value
                                    setSearchQuery(q)
                                    setHighlightedIndex(0)
                                    onSearchChange?.(q)
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder={searchPlaceholder}
                                className={cn(
                                    "w-full rounded-lg border border-[var(--input-border)] bg-transparent py-2 pl-9 pr-3 text-sm",
                                    "text-[var(--input-text)] placeholder:text-[var(--input-placeholder)]",
                                    "focus:border-[var(--main-color)] focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]/20"
                                )}
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div
                        ref={listRef}
                        className="max-h-[300px] overflow-y-auto overscroll-contain p-1"
                    >
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-8 text-center text-sm text-[var(--input-placeholder)]">
                                {emptyMessage}
                            </div>
                        ) : (
                            filteredOptions.map((option, index) => {
                                const isSelected = option.value === value
                                const isHighlighted = index === highlightedIndex

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleSelect(option.value)}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                        className={cn(
                                            "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
                                            "hover:bg-[color-mix(in_oklab,var(--main-color)_12%,transparent)]",
                                            isHighlighted &&
                                            "bg-[color-mix(in_oklab,var(--main-color)_8%,transparent)]",
                                            isSelected && "bg-[color-mix(in_oklab,var(--main-color)_12%,transparent)]"
                                        )}
                                    >
                                        {option.icon && (
                                            <span
                                                className={cn(
                                                    "shrink-0 transition-colors",
                                                    isSelected
                                                        ? "text-[var(--main-color)]"
                                                        : "text-[var(--input-text)]"
                                                )}
                                            >
                        {option.icon}
                      </span>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium text-[var(--input-text)]">
                                                {option.label}
                                            </div>
                                            {option.description && (
                                                <div className="truncate text-xs text-[var(--input-placeholder)]">
                                                    {option.description}
                                                </div>
                                            )}
                                        </div>

                                        {isSelected && (
                                            <Check className="h-4 w-4 shrink-0 text-[var(--main-color)]" />
                                        )}
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}