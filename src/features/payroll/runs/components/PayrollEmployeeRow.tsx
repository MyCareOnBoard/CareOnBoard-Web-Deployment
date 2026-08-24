import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

import type {
  AgencyPayrollRunScope,
  PayrollEmployeeSummary,
  PayrollRunIdentity,
} from "../model/types";
import { PayrollEmployeeDetail } from "./PayrollEmployeeDetail";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function cents(value: number): string {
  return currency.format(value / 100);
}

function dispositionLabel(value: PayrollEmployeeSummary["disposition"]): string {
  if (value === "zero_due") return "Nothing due";
  return value.replace("_", " ");
}

export function PayrollEmployeeRow({
  scope,
  identity,
  employee,
}: {
  scope: AgencyPayrollRunScope;
  identity: Extract<PayrollRunIdentity, { kind: "run" }>;
  employee: PayrollEmployeeSummary;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();

  return (
    <li
      data-testid="payroll-employee-row"
      className="border-b border-[#e5e5e6] last:border-b-0"
    >
      <div className="grid gap-x-4 gap-y-3 px-4 py-4 md:grid-cols-[minmax(12rem,1.4fr)_0.7fr_0.7fr_0.8fr_auto] md:items-center md:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#10141a]">{employee.displayName}</p>
          <p className="mt-1 text-xs capitalize text-[#62686f]">{employee.employmentType}</p>
        </div>
        <p className="text-sm capitalize text-[#40464d]">
          <span className="mr-2 text-xs text-[#747a81] md:hidden">Status</span>
          <span className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
            employee.hasBlockers
              ? "bg-[#fbeaea] text-[#963535]"
              : employee.disposition === "included"
                ? "bg-[#e9f6f6] text-[#006f73]"
                : "bg-[#f1f3f4] text-[#525960]",
          )}>
            {dispositionLabel(employee.disposition)}
          </span>
        </p>
        <p className="text-sm tabular-nums text-[#40464d]">
          <span className="mr-2 text-xs text-[#747a81] md:hidden">Hours</span>
          {employee.regularHours + employee.overtimeHours}
        </p>
        <p className="text-sm font-semibold tabular-nums text-[#10141a]">
          <span className="mr-2 text-xs font-normal text-[#747a81] md:hidden">Total due</span>
          {cents(employee.totalDueCents)}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={detailId}
          aria-label={`${expanded ? "Hide" : "View"} payroll details for ${employee.displayName}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center justify-self-start rounded-lg text-[#007f83] hover:bg-[#e9f6f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 md:justify-self-end"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
        </button>
      </div>
      {expanded ? (
        <div id={detailId}>
          <PayrollEmployeeDetail scope={scope} identity={identity} employeeId={employee.employeeId} />
        </div>
      ) : null}
    </li>
  );
}
