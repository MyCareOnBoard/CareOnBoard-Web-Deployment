import React, { useState } from "react";
import { Check, CalendarDays, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

/**
 * Touch-friendly form primitives shared by the on-site intake forms (Plan of
 * Care, and later Clinical Assessment). Colors are explicit hex so the DOM-to-PDF
 * snapshot (html2canvas) renders reliably. Tap targets are >= 44px.
 */

export function CheckTile({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border px-3 py-2 text-left text-[13px] font-medium leading-[1.25] transition-colors",
        checked
          ? "border-[#00b4b8] bg-[#e6fafa] text-[#0c5d5f]"
          : "border-[#cccccd] bg-white text-[#10141a] hover:border-[#00b4b8]/60 active:bg-[#f1f5f5]",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border",
          checked ? "border-[#00b4b8] bg-[#00b4b8] text-white" : "border-[#9aa0a6] bg-white",
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
      </span>
      <span>{label}</span>
    </button>
  );
}

/** Two-option mutually-exclusive segmented control (e.g. No / Yes). */
export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T | "";
  options: Array<{ value: T; label: string }>;
  onChange: (next: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="inline-flex rounded-[10px] border border-[#cccccd] p-0.5" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-[40px] min-w-[64px] rounded-[8px] px-4 text-[13px] font-semibold transition-colors",
              active ? "bg-[#00b4b8] text-white" : "bg-transparent text-[#10141a] active:bg-[#f1f5f5]",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="text-[12px] font-medium text-[#5c6368]">
      {children}
    </label>
  );
}

export function LineInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        "h-11 w-full rounded-[10px] border border-[#cccccd] bg-white px-3 text-[14px] text-[#10141a] placeholder:text-[#b2b2b3] outline-none focus:border-[#00b4b8] focus:ring-2 focus:ring-[#00b4b8]/20",
        className,
      )}
    />
  );
}

export function LineTextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={cn(
        "min-h-[44px] w-full rounded-[10px] border border-[#cccccd] bg-white px-3 py-2 text-[14px] text-[#10141a] placeholder:text-[#b2b2b3] outline-none focus:border-[#00b4b8] focus:ring-2 focus:ring-[#00b4b8]/20",
        className,
      )}
    />
  );
}

/** Touch-friendly date picker using the shared Calendar popover (stores a Date). */
export function DatePickerField({
  id,
  label,
  value,
  onChange,
  placeholder = "Select date",
}: {
  id?: string;
  label?: string;
  value?: Date;
  onChange: (next: Date | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      {label ? <FieldLabel htmlFor={id}>{label}</FieldLabel> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" id={id} className="w-full focus:outline-none">
            <InputGroup className="h-11 rounded-[10px] border border-[#cccccd] bg-white px-3">
              <InputGroupInput
                value={value ? format(value, "MMM d, yyyy") : ""}
                placeholder={placeholder}
                readOnly
                className="text-[14px] text-[#10141a]"
              />
              <InputGroupAddon align="inline-end">
                <CalendarDays className="h-5 w-5 text-[#5c6368]" aria-hidden />
              </InputGroupAddon>
            </InputGroup>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="mt-2 w-auto border-none bg-white p-0 shadow-lg">
          <Calendar
            mode="single"
            selected={value}
            defaultMonth={value ?? new Date()}
            captionLayout="dropdown"
            fromYear={2000}
            toYear={new Date().getFullYear() + 10}
            formatters={{
              formatMonthDropdown: (date) =>
                date.toLocaleString("default", { month: "long" }),
            }}
            classNames={{
              dropdown_root:
                "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
            }}
            onSelect={(d) => {
              onChange(d);
              if (d) setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Clickable signature field — shows the captured signature (image) or a prompt,
 * and opens the shared DigitalSignature capture modal via onOpen.
 */
export function SignatureField({
  value,
  onOpen,
  onClear,
  ariaLabel,
}: {
  value?: string;
  onOpen: () => void;
  onClear?: () => void;
  ariaLabel?: string;
}) {
  const hasValue = Boolean(value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label={ariaLabel ?? (hasValue ? "Edit signature" : "Add signature")}
        className="flex h-16 w-full items-center justify-center rounded-[10px] border border-[#cccccd] bg-white px-3 transition-colors hover:border-[#00b4b8]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]/30"
      >
        {hasValue ? (
          <img src={value} alt="Signature" className="max-h-12 object-contain" />
        ) : (
          <span className="text-[13px] text-[#b2b2b3]">Click to sign</span>
        )}
      </button>
      {hasValue && onClear ? (
        <button
          type="button"
          aria-label="Clear signature"
          onClick={onClear}
          className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-[#5c6368] transition-colors hover:bg-[#e6e7e8]"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/** Section wrapper with a numbered/labelled heading. */
export function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[12px] border border-[#e2e4e6] bg-white p-4", className)}>
      <h3 className="mb-3 text-[15px] font-semibold text-[#10141a]">{title}</h3>
      {children}
    </section>
  );
}
