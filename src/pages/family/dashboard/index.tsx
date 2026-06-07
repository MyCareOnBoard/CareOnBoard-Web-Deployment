import { useEffect, useState } from "react"
import {
  Loader2,
  CalendarDays,
  Clock,
  Wallet,
  Bell,
  CheckCircle2,
  Users,
  ChevronRight,
} from "lucide-react"
import axiosClient from "@/lib/axios"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShiftItem {
  id: string
  date: string
  startTime?: string | null
  endTime?: string | null
  status: string
  dspName?: string | null
  dspAvatar?: string | null
}

interface ActivityItem {
  time: string
  type: string
  title: string
  description?: string
  status: string
}

interface TeamMember {
  id: string
  fullName: string
  role?: string
  avatar?: string | null
  isPrimary: boolean
}

interface DashboardData {
  client: { id: string; firstName?: string; lastName?: string; profileImage?: string }
  todayShift: ShiftItem | null
  weeklyHours: { total: number; approved: number; onTrack: boolean }
  remainingBalance: { hours: number; period: string } | null
  alerts: { count: number; items: Array<{ type: string; message: string }> }
  serviceHours: {
    name: string
    code?: string
    startDate?: string
    endDate?: string
    usedHours: number
    totalHours: number
  } | null
  upcomingSchedule: ShiftItem[]
  recentActivities: ActivityItem[]
  careTeam: TeamMember[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")
}

function fmtScheduleDate(dateStr: string) {
  if (!dateStr) return "—"
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  if (date.getTime() === todayMidnight.getTime()) {
    return `Today, ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
  }
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

function fmtMonthRange(start?: string, end?: string) {
  if (!start && !end) return null
  const fmt = (s: string) => {
    const [y, m, d] = s.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  return start ? `From ${fmt(start)}` : ""
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ongoing: "bg-[#00B4B8] text-white",
    available: "bg-blue-100 text-blue-700",
    pending: "bg-slate-100 text-slate-600",
    completed: "bg-green-100 text-green-700",
    expired: "bg-red-100 text-red-500",
  }
  const labels: Record<string, string> = {
    ongoing: "In Progress",
    available: "Scheduled",
    pending: "Scheduled",
    completed: "Completed",
    expired: "Expired",
  }
  return (
    <span
      className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[status] ?? "bg-slate-100 text-slate-500"}`}
    >
      {labels[status] ?? status}
    </span>
  )
}

function AvatarBadge({ name, src }: { name?: string | null; src?: string | null }) {
  if (src) {
    return <img src={src} alt={name ?? ""} className="h-7 w-7 rounded-full object-cover" />
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00B4B8]/15 text-[11px] font-semibold text-[#00B4B8]">
      {name ? initials(name) : "?"}
    </div>
  )
}

// ─── Overview Cards ───────────────────────────────────────────────────────────

function OverviewCards({ data }: { data: DashboardData }) {
  const { todayShift, weeklyHours, remainingBalance, alerts } = data
  const weeklyPct =
    weeklyHours.total > 0
      ? Math.min(100, (weeklyHours.approved / weeklyHours.total) * 100)
      : 0

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {/* Today's Schedule */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#00B4B8]/10">
          <CalendarDays className="h-5 w-5 text-[#00B4B8]" />
        </div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Today's schedule
        </p>
        <p className="text-[17px] font-bold text-slate-900">
          {todayShift ? "1 on schedule" : "No visits today"}
        </p>
        {todayShift && (
          <>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {todayShift.startTime ?? "—"} to {todayShift.endTime ?? "—"}
            </p>
            {todayShift.dspName && (
              <p className="text-[11px] text-slate-400">By {todayShift.dspName}</p>
            )}
          </>
        )}
      </div>

      {/* This Week's Hours */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <Clock className="h-5 w-5 text-violet-600" />
        </div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          This Week's Hours
        </p>
        <p className="text-[17px] font-bold text-slate-900">{weeklyHours.total} hrs</p>
        <p className="mt-0.5 text-[12px] text-slate-500">
          {weeklyHours.approved} approved hours used
        </p>
        <div className="mt-2 space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${weeklyPct}%` }}
            />
          </div>
          <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
            {weeklyHours.onTrack ? "On Track" : "Review Needed"}
          </span>
        </div>
      </div>

      {/* Remaining Balance */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <Wallet className="h-5 w-5 text-amber-600" />
        </div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Remaining Balance
        </p>
        <p className="text-[17px] font-bold text-slate-900">
          {remainingBalance ? `${remainingBalance.hours} hrs` : "—"}
        </p>
        <p className="mt-0.5 text-[12px] text-slate-500">
          {remainingBalance?.period ?? "This month"}
        </p>
      </div>

      {/* Alerts */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
          <Bell className="h-5 w-5 text-orange-500" />
        </div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Alerts
        </p>
        <p className="text-[17px] font-bold text-slate-900">
          {alerts.count > 0
            ? `${alerts.count} Active alert${alerts.count > 1 ? "s" : ""}`
            : "No active alerts"}
        </p>
        <p className="mt-0.5 text-[12px] text-slate-500">
          {alerts.count > 0 && alerts.items[0]
            ? alerts.items[0].message
            : "Everything looks good"}
        </p>
      </div>
    </div>
  )
}

// ─── Service & Hours Card ─────────────────────────────────────────────────────

function ServiceHoursCard({ service }: { service: DashboardData["serviceHours"] }) {
  if (!service) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-[15px] font-semibold text-slate-800">Service &amp; Hours</h2>
        <p className="text-[13px] text-slate-400">No service authorization data available.</p>
      </div>
    )
  }

  const pct =
    service.totalHours > 0
      ? Math.min(100, (service.usedHours / service.totalHours) * 100)
      : 0
  const remaining = Math.max(0, service.totalHours - service.usedHours)
  const dateRange = fmtMonthRange(service.startDate, service.endDate)

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-[15px] font-semibold text-slate-800">Service &amp; Hours</h2>

      <p className="mb-1 text-[12px] text-slate-500">
        <span className="font-medium text-slate-700">Approved service:</span>{" "}
        {service.name}
        {service.code && <span className="ml-1 text-slate-400">({service.code})</span>}
      </p>

      {dateRange && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            This month
          </span>
          <span className="text-[12px] text-slate-500">{dateRange}</span>
        </div>
      )}

      <div className="mb-1 flex items-center justify-between text-[12px] text-slate-500">
        <span>{service.usedHours} hrs used</span>
        <span>{service.totalHours} hrs total</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: "#00B4B8" }}
        />
      </div>
      <p className="mt-2 text-[13px] font-semibold text-slate-700">
        {remaining} hrs remaining hours
      </p>
      <p className="mt-3 text-[11px] text-slate-400">
        Plans refresh on the 1st of each month
      </p>
    </div>
  )
}

// ─── Recent Activities Card ───────────────────────────────────────────────────

function RecentActivitiesCard({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-[15px] font-semibold text-slate-800">Recent activities</h2>

      {activities.length === 0 ? (
        <p className="text-[13px] text-slate-400">No recent activity recorded.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {activities.map((act, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#00B4B8]/10">
                <CheckCircle2 className="h-4 w-4 text-[#00B4B8]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-slate-400">{act.time}</p>
                    <p className="text-[13px] font-semibold text-slate-800">{act.title}</p>
                    {act.description && (
                      <p className="text-[12px] text-slate-500">{act.description}</p>
                    )}
                  </div>
                  <span className="mt-0.5 flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                    Completed
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Upcoming Schedule Card ───────────────────────────────────────────────────

function UpcomingScheduleCard({ schedule }: { schedule: ShiftItem[] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-slate-800">Upcoming schedule</h2>
        <button
          type="button"
          disabled
          className="flex cursor-default items-center gap-0.5 text-[12px] font-medium text-[#00B4B8] opacity-60"
        >
          View full schedule
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {schedule.length === 0 ? (
        <p className="text-[13px] text-slate-400">No upcoming visits scheduled.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {schedule.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 p-3"
            >
              <div className="flex items-center gap-2.5">
                <AvatarBadge name={s.dspName} src={s.dspAvatar} />
                <div>
                  <p className="text-[12px] font-semibold text-slate-700">
                    {fmtScheduleDate(s.date)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {s.startTime ?? "—"} to {s.endTime ?? "—"}
                    {s.dspName && (
                      <span className="ml-1 text-slate-400">· {s.dspName}</span>
                    )}
                  </p>
                </div>
              </div>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Care Team Card ───────────────────────────────────────────────────────────

function CareTeamCard({ team }: { team: TeamMember[] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-slate-800">Care Team</h2>
        <button
          type="button"
          disabled
          className="flex cursor-default items-center gap-0.5 text-[12px] font-medium text-[#00B4B8] opacity-60"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {team.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <Users className="h-8 w-8 text-slate-300" />
          <p className="text-[13px] text-slate-400">No care team assigned yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {team.slice(0, 4).map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.fullName}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00B4B8]/15 text-[12px] font-semibold text-[#00B4B8]">
                  {initials(member.fullName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-800">
                  {member.fullName}
                </p>
                <p className="text-[11px] text-slate-400">
                  {member.isPrimary ? "Primary Caregiver" : (member.role ?? "DSP")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FamilyDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    axiosClient
      .get<{ success: boolean; data: DashboardData }>("/familyPortal/dashboard")
      .then((res) => setData(res.data.data))
      .catch(() => setError("Failed to load dashboard. Please refresh."))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00B4B8]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-[15px] font-semibold text-slate-700">
          {error ?? "Something went wrong."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg px-4 py-2 text-[13px] font-semibold text-[#00B4B8] hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <OverviewCards data={data} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: 2 cols wide */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <ServiceHoursCard service={data.serviceHours} />
          <RecentActivitiesCard activities={data.recentActivities} />
        </div>

        {/* Right: 1 col */}
        <div className="flex flex-col gap-5">
          <UpcomingScheduleCard schedule={data.upcomingSchedule} />
          <CareTeamCard team={data.careTeam} />
        </div>
      </div>
    </div>
  )
}
