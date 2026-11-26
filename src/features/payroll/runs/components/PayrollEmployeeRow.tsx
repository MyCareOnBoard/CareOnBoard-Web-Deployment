import { memo, useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { initialsOf } from "@/components/agency/AgencyListKit";
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

export type PayrollEmployeeRowProps = {
  scope: AgencyPayrollRunScope;
  identity: Extract<PayrollRunIdentity, { kind: "run" }>;
  employee: PayrollEmployeeSummary;
};

export function payrollEmployeeRowPropsEqual(
  previous: PayrollEmployeeRowProps,
  next: PayrollEmployeeRowProps,
): boolean {
  return previous.employee.employeeId === next.employee.employeeId
    && previous.employee.displayName === next.employee.displayName
    && previous.employee.employmentType === next.employee.employmentType
    && previous.employee.disposition === next.employee.disposition
    && previous.employee.regularHours === next.employee.regularHours
    && previous.employee.overtimeHours === next.employee.overtimeHours
    && previous.employee.totalDueCents === next.employee.totalDueCents
    && previous.employee.hasBlockers === next.employee.hasBlockers
    && previous.scope.audience === next.scope.audience
    && previous.scope.actorUid === next.scope.actorUid
    && previous.scope.agencyId === next.scope.agencyId
    && previous.scope.mode === next.scope.mode
    && previous.identity.runId === next.identity.runId
    && previous.identity.activeRevisionId === next.identity.activeRevisionId
    && previous.identity.revisionNumber === next.identity.revisionNumber;
}

function PayrollEmployeeRowComponent({
  scope,
  identity,
  employee,
}: PayrollEmployeeRowProps) {
  const expansionKey = JSON.stringify([scope.actorUid, scope.agencyId, scope.mode]);
  const [expansion, setExpansion] = useState({ key: expansionKey, expanded: false });
  const expanded = expansion.key === expansionKey && expansion.expanded;
  const detailId = useId();

  return (
    <li
      data-testid="payroll-employee-row"
      className="border-t border-[#eceef0] [content-visibility:auto] [contain-intrinsic-size:auto_92px] dark:border-white/10"
    >
      <div className="grid gap-x-4 gap-y-3 px-4 py-4 md:grid-cols-[minmax(12rem,1.4fr)_0.7fr_0.7fr_0.8fr_auto] md:items-center md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e0f3f3] text-[13px] font-medium text-[#005c5e] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]">
            {initialsOf(employee.displayName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">{employee.displayName}</p>
            <p className="mt-0.5 text-xs capitalize text-[#6b737a] dark:text-[#9aa4a8]">{employee.employmentType}</p>
          </div>
        </div>
        <p className="text-sm capitalize text-[#40464d]">
          <span className="mr-2 text-xs text-[#747a81] md:hidden">Status</span>
          <span className={cn(
            "inline-flex h-6 items-center rounded-[6px] px-2 text-[12px] font-medium",
            employee.hasBlockers
              ? "bg-[#fde8e6] text-[#b42318] dark:bg-[#ef4444]/15 dark:text-[#f8a1a1]"
              : employee.disposition === "included"
                ? "bg-[#e0f3f3] text-[#005c5e] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]"
                : "bg-[#eef0f2] text-[#2a3138] dark:bg-white/10 dark:text-[#c9d1d4]",
          )}>
            {dispositionLabel(employee.disposition)}
          </span>
        </p>
        <p className="text-sm tabular-nums text-[#2a3138] dark:text-[#c9d1d4]">
          <span className="mr-2 text-xs text-[#747a81] md:hidden">Hours</span>
          {employee.regularHours + employee.overtimeHours}
        </p>
        <p className="text-sm font-semibold tabular-nums text-[#10141a] dark:text-[#f4f6f7]">
          <span className="mr-2 text-xs font-normal text-[#747a81] md:hidden">Total due</span>
          {cents(employee.totalDueCents)}
        </p>
        <button
          type="button"
          onClick={() => setExpansion({ key: expansionKey, expanded: !expanded })}
          aria-expanded={expanded}
          aria-controls={detailId}
          aria-label={`${expanded ? "Hide" : "View"} payroll details for ${employee.displayName}`}
          className="grid h-8 w-8 cursor-pointer place-items-center justify-self-start rounded-full border border-[#e4e7ea] text-[#4b535b] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] md:justify-self-end dark:border-white/15 dark:text-[#c9d1d4] dark:hover:bg-white/5"
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

export const PayrollEmployeeRow = memo(PayrollEmployeeRowComponent, payrollEmployeeRowPropsEqual);
PayrollEmployeeRow.displayName = "PayrollEmployeeRow";
