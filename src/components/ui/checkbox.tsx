import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    const id = React.useId();
    const inputId = props.id || id;

    return (
      <label htmlFor={inputId} className="inline-flex cursor-pointer items-center gap-1">
        <input
          type="checkbox"
          id={inputId}
          ref={ref}
          className="peer sr-only"
          {...props}
        />
        <span className={cn(
          "relative flex size-[24px] items-center justify-center rounded-none border transition-colors",
          "border-[#cccccd] bg-white",
          "peer-checked:border-[#00b4b8] peer-checked:bg-[#00b4b8]",
          "peer-checked:[&>svg]:opacity-100",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-[#00b4b8]/25",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          className
        )}>
          <Check className="h-3.5 w-3.5 text-white opacity-0 transition-opacity" />
        </span>
        {label && (
          <span className="text-sm font-medium leading-[1.4] text-[#10141a] peer-disabled:opacity-50">
            {label}
          </span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };

