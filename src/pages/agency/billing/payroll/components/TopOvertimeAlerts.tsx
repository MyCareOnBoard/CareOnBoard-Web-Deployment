import { memo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { OvertimeAlert } from "../types";

const SKELETON_ITEM_COUNT = 5;

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

function OvertimeAlertSkeletonItem() {
  return (
    <div className="flex animate-pulse items-center justify-between gap-4 py-3" aria-hidden="true">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-[#eef4f5]" />
        <div className="h-4 w-32 rounded bg-[#eef4f5]" />
      </div>
      <div className="h-4 w-10 shrink-0 rounded bg-[#eef4f5]" />
    </div>
  );
}

type TopOvertimeAlertsProps = {
  alerts: OvertimeAlert[];
  loading?: boolean;
};

export default function TopOvertimeAlerts({ alerts, loading = false }: TopOvertimeAlertsProps) {
  return (
    <div className="rounded-[8px] border border-[#e5e5e6] bg-white p-6 shadow-sm">
      <h3 className="mb-2 text-[18px] font-semibold text-[#10141a]">Top overtime alerts</h3>
      {loading ? (
        <div className="divide-y divide-[#e5e5e6]">
          {Array.from({ length: SKELETON_ITEM_COUNT }).map((_, index) => (
            <OvertimeAlertSkeletonItem key={`overtime-skeleton-${index}`} />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#808081]">
          No overtime alerts in this date range.
        </p>
      ) : (
        <div className="divide-y divide-[#e5e5e6]">
          {alerts.map((alert) => (
            <OvertimeAlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
