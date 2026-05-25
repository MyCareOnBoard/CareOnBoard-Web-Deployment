import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { format } from "date-fns";
import { CalendarDaysIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import Calendar2Icon from "@/assets/icons/calendar-2.svg?react";
import { cn } from "@/lib/utils";


export default function CustomDatePicker(
    { date, setDate, className, inputClassName, iconClassName, iconVariant = "default", placeholder, startMonth, endMonth, align = "start" }: {
        date: Date | null,
        setDate: (date: Date | null) => void;
        className?: string;
        inputClassName?: string;
        iconClassName?: string;
        iconVariant?: "default" | "calendar-2";
        placeholder?: string;
        startMonth?: Date;
        endMonth?: Date;
        align?: "center" | "start" | "end";
    }
) {
    const [isDateOpen, setIsDateOpen] = useState(false);

    const calendarIcon =
        iconVariant === "calendar-2" ? (
            <Calendar2Icon className="h-5 w-5 shrink-0" aria-hidden />
        ) : (
            <CalendarDaysIcon className={cn("h-5 w-5 text-[#808081]", iconClassName)} />
        );

    return (
        <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
            <PopoverTrigger asChild>
                <button type="button" className="w-full cursor-pointer focus:outline-none">
                    <InputGroup
                        className={cn(
                            "h-[var(--cr-field-height,48px)] min-h-[var(--cr-field-height,48px)] cursor-pointer rounded-xl border border-[#cccccd] bg-white px-4",
                            className
                        )}
                    >
                        <InputGroupInput
                            value={date ? format(date, "MMMM d, yyyy") : ""}
                            placeholder={placeholder}
                            readOnly
                            className={cn(
                                "border-0 bg-transparent cursor-pointer text-[#10141a]",
                                inputClassName
                            )}
                        />
                        <InputGroupAddon align="inline-end">
                            {calendarIcon}
                        </InputGroupAddon>
                    </InputGroup>
                </button>
            </PopoverTrigger>
            <PopoverContent align={align} className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
                <Calendar
                    mode="single"
                    className="bg-white"
                    captionLayout="dropdown"
                    startMonth={startMonth ?? new Date(1924, 0)}
                    endMonth={endMonth ?? new Date()}
                    selected={date ?? undefined}
                    defaultMonth={date ?? new Date()}
                    onSelect={(selectedDate) => {
                        if (selectedDate) {
                            setDate(selectedDate);
                            setIsDateOpen(false);
                        }
                    }}
                    formatters={{
                        formatMonthDropdown: (date) =>
                            date.toLocaleString("default", { month: "long" }),
                    }}
                    classNames={{
                        dropdown_root: "relative border-none shadow-none has-focus:ring-0",
                        caption_label: "rounded-md pl-2 pr-2 flex items-center gap-1 text-sm h-8 [&>svg]:hidden",
                    }}
                    autoFocus={true}
                />
            </PopoverContent>
        </Popover>
    )
}
