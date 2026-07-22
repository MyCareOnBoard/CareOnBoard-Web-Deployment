import { useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  ClipboardCheck,
  FileText,
  UserRound,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetAttendanceReportQuery,
  useGetShiftStatsQuery,
  useGetSuperAdminStatsQuery,
} from "./api";
import NetworkComplianceSection from "./components/NetworkComplianceSection";

const EMPTY_STATS = {
  totalAgencies: 0,
  totalStaff: 0,
  totalClients: 0,
  ongoingIncidents: 0,
  scheduledIncidents: 0,
  pendingNotes: 0,
  pendingTimesheets: 0,
};

function DashboardPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-2xl border border-[#E6EAEC] bg-white/80 shadow-sm " +
        className
      }
    >
      {children}
    </div>
  );
}

function SectionHeader({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 id={id} className="text-[22px] font-bold text-[#10141a]">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-[#6b7280]">{description}</p>
    </div>
  );
}

function OverviewMetric({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: number;
  helper: string;
  icon: ReactNode;
}) {
  return (
    <DashboardPanel className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-[#6b7280]">{label}</p>
          <p className="mt-2 text-[28px] font-bold leading-none text-[#10141a]">
            {value.toLocaleString("en-US")}
          </p>
          <p className="mt-3 text-xs leading-5 text-[#808081]">{helper}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#edfafa] text-[#00a3a7]">
          {icon}
        </span>
      </div>
    </DashboardPanel>
  );
}

function OverviewSkeleton() {
  return (
    <div
      data-testid="dashboard-overview-skeleton"
      className="rounded-2xl border border-[#E6EAEC] bg-white/80 px-5 py-4 shadow-sm"
    >
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-8 w-20" />
      <Skeleton className="mt-3 h-3 w-4/5" />
    </div>
  );
}

function WorkloadSkeleton() {
  return (
    <DashboardPanel className="p-5" >
      <div data-testid="workload-skeleton">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-5 h-10 w-full rounded-xl" />
        <Skeleton className="mt-3 h-10 w-full rounded-xl" />
      </div>
    </DashboardPanel>
  );
}

function ShiftSkeleton() {
  return (
    <div data-testid="shift-skeleton">
      <Skeleton className="h-5 w-44" />
      <Skeleton className="mt-3 h-4 w-64 max-w-full" />
      <div className="mt-7 flex h-[180px] items-end gap-3">
        {[42, 68, 53, 84, 61, 76].map((height, index) => (
          <Skeleton
            key={index}
            className="flex-1 rounded-lg"
            style={{ height: height + "%" }}
          />
        ))}
      </div>
    </div>
  );
}

function AttendanceSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          data-testid="attendance-skeleton-row"
          className="flex items-center gap-3"
        >
          <Skeleton className="h-4 w-20" />
          <div className="grid flex-1 grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-9 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkloadRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#edf0f1] py-3 last:border-b-0">
      <span className="flex items-center gap-2 text-sm text-[#6b7280]">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className="text-2xl font-bold text-[#10141a]">
        {value.toLocaleString("en-US")}
      </span>
    </div>
  );
}

function PanelError({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex min-h-32 flex-col items-start justify-between gap-4 rounded-2xl border border-[#fecaca] bg-[#fff7f5] p-5 sm:flex-row sm:items-center"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#d53411]" />
        <p className="text-sm font-medium text-[#7f1d1d]">{message}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        aria-label={retryLabel}
        onClick={onRetry}
        className="border-[#fecaca] bg-white text-[#7f1d1d] hover:bg-[#fef2f2]"
      >
        Try again
      </Button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-2xl bg-[#f7f9f9] px-5 text-center">
      <p className="text-sm font-medium text-[#6b7280]">{message}</p>
    </div>
  );
}

function attendanceColor(value: number) {
  if (value <= 0) return "bg-[#e5e5e6]";
  if (value === 1) return "bg-[#bce9e9]";
  if (value === 2) return "bg-[#63ced0]";
  return "bg-[#00a9ad]";
}

export default function SuperAdminDashboard() {
  const [hoveredShift, setHoveredShift] = useState<number | null>(null);
  const statsQuery = useGetSuperAdminStatsQuery();
  const shiftQuery = useGetShiftStatsQuery();
  const attendanceQuery = useGetAttendanceReportQuery();

  const stats = statsQuery.data?.stats ?? EMPTY_STATS;
  const shiftsData = shiftQuery.data?.buckets ?? [];
  const attendanceData = attendanceQuery.data?.data ?? [];
  const openWorkload =
    stats.ongoingIncidents +
    stats.pendingNotes +
    stats.pendingTimesheets;
  const maximumShiftValue = Math.max(
    1,
    ...shiftsData.map((shift) =>
      Math.max(shift.scheduled, shift.completed),
    ),
  );
  const statsLoading =
    statsQuery.isLoading || (statsQuery.isFetching && !statsQuery.data);
  const shiftsLoading =
    shiftQuery.isLoading || (shiftQuery.isFetching && !shiftQuery.data);
  const attendanceLoading =
    attendanceQuery.isLoading ||
    (attendanceQuery.isFetching && !attendanceQuery.data);

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-8 font-['Urbanist']">
      <header>
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#00b4b8]">
          Super admin
        </p>
        <h1 className="mt-1 text-[40px] font-bold leading-tight text-[#10141a]">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Live operational health across the CareOnboard network.
        </p>
      </header>

      <section aria-labelledby="network-overview-title" className="space-y-4">
        <SectionHeader
          id="network-overview-title"
          title="Network overview"
          description="The people and workload currently active across the network."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statsQuery.isError ? (
            <div className="sm:col-span-2 xl:col-span-4">
              <PanelError
                message="We couldn't load the network overview."
                retryLabel="Retry network overview"
                onRetry={() => void statsQuery.refetch()}
              />
            </div>
          ) : statsLoading ? (
            [1, 2, 3, 4].map((item) => <OverviewSkeleton key={item} />)
          ) : (
            <>
              <OverviewMetric
                label="Total agencies"
                value={stats.totalAgencies}
                helper="Active across the network"
                icon={<Building2 className="h-5 w-5" />}
              />
              <OverviewMetric
                label="Total staff"
                value={stats.totalStaff}
                helper="Registered care professionals"
                icon={<Users className="h-5 w-5" />}
              />
              <OverviewMetric
                label="Total clients"
                value={stats.totalClients}
                helper="People receiving care"
                icon={<UserRound className="h-5 w-5" />}
              />
              <OverviewMetric
                label="Open workload"
                value={openWorkload}
                helper="Incidents, notes, and timesheets"
                icon={<ClipboardCheck className="h-5 w-5" />}
              />
            </>
          )}
        </div>
      </section>

      <NetworkComplianceSection />

      <section aria-labelledby="operational-workload-title" className="space-y-4">
        <SectionHeader
          id="operational-workload-title"
          title="Operational workload"
          description="Network-wide incidents and administrative work requiring attention."
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {statsQuery.isError ? (
            <div className="lg:col-span-2">
              <PanelError
                message="We couldn't load the operational workload."
                retryLabel="Retry operational workload"
                onRetry={() => void statsQuery.refetch()}
              />
            </div>
          ) : statsLoading ? (
            <>
              <WorkloadSkeleton />
              <WorkloadSkeleton />
            </>
          ) : (
            <>
              <DashboardPanel className="p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edfafa] text-[#00a3a7]">
                    <Activity className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-base font-bold text-[#10141a]">
                      System-wide incidents
                    </p>
                    <p className="text-xs text-[#808081]">
                      Current and scheduled incident load
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <WorkloadRow
                    label="Ongoing"
                    value={stats.ongoingIncidents}
                    color="#00b4b8"
                  />
                  <WorkloadRow
                    label="Scheduled"
                    value={stats.scheduledIncidents}
                    color="#8bdadd"
                  />
                </div>
              </DashboardPanel>

              <DashboardPanel className="p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff5ed] text-[#d76820]">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-base font-bold text-[#10141a]">
                      Pending work
                    </p>
                    <p className="text-xs text-[#808081]">
                      Documentation awaiting review
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <WorkloadRow
                    label="Pending notes"
                    value={stats.pendingNotes}
                    color="#ff9f5a"
                  />
                  <WorkloadRow
                    label="Pending timesheets"
                    value={stats.pendingTimesheets}
                    color="#ffc894"
                  />
                </div>
              </DashboardPanel>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="shift-activity-title" className="space-y-4">
        <SectionHeader
          id="shift-activity-title"
          title="Shift activity"
          description="Scheduled and completed visits during the last 24 hours."
        />

        <DashboardPanel className="p-5 sm:p-6">
          {shiftQuery.isError ? (
            <PanelError
              message="We couldn't load shift activity."
              retryLabel="Retry shift activity"
              onRetry={() => void shiftQuery.refetch()}
            />
          ) : shiftsLoading ? (
            <ShiftSkeleton />
          ) : shiftsData.length === 0 ? (
            <EmptyState message="No shift activity in the last 24 hours." />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-end gap-4 text-xs font-semibold text-[#6b7280]">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#00b4b8]" />
                  Scheduled
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#a7e1e2]" />
                  Visit completed
                </span>
              </div>
              <div className="mt-6 flex h-[210px] items-end justify-between gap-3">
                {shiftsData.map((shift, index) => (
                  <div
                    key={shift.time + index}
                    role="img"
                    tabIndex={0}
                    aria-label={
                      shift.time +
                      ": " +
                      shift.scheduled +
                      " scheduled, " +
                      shift.completed +
                      " completed"
                    }
                    className="relative flex h-full flex-1 flex-col items-center justify-end rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]"
                    onMouseEnter={() => setHoveredShift(index)}
                    onMouseLeave={() => setHoveredShift(null)}
                    onFocus={() => setHoveredShift(index)}
                    onBlur={() => setHoveredShift(null)}
                  >
                    {hoveredShift === index && (
                      <div className="absolute bottom-full z-10 mb-2 min-w-[170px] rounded-xl border border-[#E6EAEC] bg-white p-3 text-xs shadow-lg">
                        <p className="font-bold text-[#10141a]">
                          Report for {shift.time}
                        </p>
                        <p className="mt-2 flex justify-between gap-4 text-[#6b7280]">
                          <span>Scheduled</span>
                          <strong className="text-[#10141a]">
                            {shift.scheduled}
                          </strong>
                        </p>
                        <p className="mt-1 flex justify-between gap-4 text-[#6b7280]">
                          <span>Completed</span>
                          <strong className="text-[#10141a]">
                            {shift.completed}
                          </strong>
                        </p>
                      </div>
                    )}
                    <div className="flex h-full w-full items-end justify-center gap-1.5">
                      <div
                        className="min-h-2 flex-1 rounded-lg bg-[#00b4b8]"
                        style={{
                          height:
                            (shift.scheduled / maximumShiftValue) * 100 + "%",
                        }}
                      />
                      <div
                        className="min-h-2 flex-1 rounded-lg bg-[#a7e1e2]"
                        style={{
                          height:
                            (shift.completed / maximumShiftValue) * 100 + "%",
                        }}
                      />
                    </div>
                    <p className="mt-2 whitespace-nowrap text-[11px] font-semibold text-[#808081]">
                      {shift.time}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </DashboardPanel>
      </section>

      <section aria-labelledby="attendance-report-title" className="space-y-4">
        <SectionHeader
          id="attendance-report-title"
          title="Attendance report"
          description="Attendance density and punctuality across the reporting day."
        />

        <DashboardPanel className="overflow-hidden p-5 sm:p-6">
          {attendanceQuery.isError ? (
            <PanelError
              message="We couldn't load the attendance report."
              retryLabel="Retry attendance report"
              onRetry={() => void attendanceQuery.refetch()}
            />
          ) : attendanceLoading ? (
            <AttendanceSkeleton />
          ) : attendanceData.length === 0 ? (
            <EmptyState message="No attendance activity is available." />
          ) : (
            <>
              <div className="mb-5 flex items-center justify-end gap-2">
                <span className="text-xs font-medium text-[#808081]">Less</span>
                {["#e5e5e6", "#bce9e9", "#63ced0", "#00a9ad"].map(
                  (color) => (
                    <span
                      key={color}
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ),
                )}
                <span className="text-xs font-medium text-[#808081]">Full</span>
              </div>
              <div className="min-w-[620px] space-y-2 overflow-x-auto">
                {attendanceData.map((row) => (
                  <div key={row.time} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs font-semibold text-[#6b7280]">
                      {row.time}
                    </span>
                    <div className="grid flex-1 grid-cols-7 gap-2">
                      {row.days.map((value, dayIndex) => (
                        <div
                          key={dayIndex}
                          role="img"
                          aria-label={
                            row.time +
                            ", day " +
                            (dayIndex + 1) +
                            ": attendance level " +
                            value
                          }
                          className={
                            "h-10 rounded-lg " + attendanceColor(value)
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DashboardPanel>
      </section>
    </div>
  );
}
