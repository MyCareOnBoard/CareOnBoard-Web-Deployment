import { Link } from "react-router";
import { cn } from "@/lib/utils";

/** A segmented switch between views of one page, as links so each view has a URL. */
export function ViewSwitch<T extends string>({ value, options, label, className }: {
  value: T;
  options: { value: T; label: string; to: string; badge?: number }[];
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("inline-flex rounded-full bg-[#eef2f3] p-1 dark:bg-white/10", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Link
            key={option.value}
            to={option.to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679]",
              active ? "bg-white text-[#10141a] shadow-[0_1px_2px_rgba(16,40,44,0.12)] dark:bg-[#2a3138] dark:text-[#f4f6f7]" : "text-[#5d6b73] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]",
            )}
          >
            {option.label}
            {!!option.badge && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#b42318] px-1.5 text-[11px] font-semibold text-white">{option.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
