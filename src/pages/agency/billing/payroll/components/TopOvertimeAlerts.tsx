import { memo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { OvertimeAlert } from "../data/mockPayrollDashboardData";
import { TOP_OVERTIME_ALERTS } from "../data/mockPayrollDashboardData";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const OvertimeAlertItem = memo(function OvertimeAlertItem({ alert }: { alert: OvertimeAlert }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0 rounded-full">
          <AvatarFallback className="rounded-full bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-xs font-medium text-white">
            {getInitials(alert.staffName)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-[14px] font-medium text-[#10141a]">{alert.staffName}</span>
      </div>
      <span className="shrink-0 text-[14px] font-semibold tabular-nums text-[#ef4444]">
        {alert.overtimeHours}
      </span>
    </div>
  );
});

export default function TopOvertimeAlerts() {
  return (
    <div className="rounded-[8px] border border-[#e5e5e6] bg-white p-6 shadow-sm">
      <h3 className="mb-2 text-[18px] font-semibold text-[#10141a]">Top overtime alerts</h3>
      <div className="divide-y divide-[#e5e5e6]">
        {TOP_OVERTIME_ALERTS.map((alert) => (
          <OvertimeAlertItem key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}
