import { Children, type ReactNode } from "react";
import { Check, CircleAlert, CircleX } from "lucide-react";

export type PayrollJourneyState =
  | "complete"
  | "current"
  | "waiting"
  | "attention"
  | "blocked"
  | "upcoming";

const journeyTone = {
  complete: { marker: "bg-[#e8fafa] text-[#006f73] ring-[#cceff0]", status: "bg-[#e8fafa] text-[#006f73]" },
  current: { marker: "bg-[#e8fafa] text-[#006f73] ring-[#cceff0]", status: "bg-[#e8fafa] text-[#006f73]" },
  waiting: { marker: "bg-amber-50 text-amber-700 ring-amber-100", status: "bg-amber-50 text-amber-800" },
  attention: { marker: "bg-amber-50 text-amber-700 ring-amber-100", status: "bg-amber-50 text-amber-800" },
  blocked: { marker: "bg-red-50 text-red-700 ring-red-100", status: "bg-red-50 text-red-700" },
  upcoming: { marker: "bg-[#f4f5f6] text-[#92979f] ring-[#e8eaed]", status: "bg-[#f4f5f6] text-[#6f747c]" },
} satisfies Record<PayrollJourneyState, { marker: string; status: string }>;

export function PayrollJourneyStep({ title, status, state, icon, last = false, description, children }: {
  title: string;
  status: string;
  state: PayrollJourneyState;
  icon: ReactNode;
  last?: boolean;
  description?: string;
  children?: ReactNode;
}) {
  const tone = journeyTone[state];
  const active = state === "current" || state === "waiting" || state === "attention" || state === "blocked";
  const expanded = state !== "complete" && state !== "upcoming";
  const details = Children.toArray(children);
  const role = state === "attention" || state === "blocked" ? "alert" : undefined;

  return (
    <li role={role} aria-current={active ? "step" : undefined} className="flex gap-3 py-4 first:pt-0 last:pb-0 sm:gap-4">
      <div aria-hidden="true" className="flex w-9 shrink-0 flex-col items-center self-stretch">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 ${tone.marker}`}>
          {state === "complete" ? <Check className="h-4 w-4" strokeWidth={2.5} /> : state === "attention" ? <CircleAlert className="h-4 w-4" /> : state === "blocked" ? <CircleX className="h-4 w-4" /> : icon}
        </span>
        {!last ? <span className="mt-1 min-h-6 w-px flex-1 bg-[#e3e7e9]" /> : null}
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-[#10141a] sm:text-[15px]">{title}</h3>
          <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.status}`}>{status}</span>
        </div>
        {expanded && description ? <p className="mt-2 text-sm leading-6 text-[#5d626b]">{description}</p> : null}
        {expanded && details.length ? <div className="mt-3 min-w-0 text-sm leading-6 text-[#5d626b]">{details}</div> : null}
      </div>
    </li>
  );
}
