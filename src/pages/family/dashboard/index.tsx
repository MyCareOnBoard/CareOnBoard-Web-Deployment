import {useEffect, useState} from "react"
import {useNavigate} from "react-router"
import {
    Loader2,
    CalendarDays,
    Clock,
    Wallet,
    AlertTriangle,
    CheckCircle2,
    Users,
    ChevronRight,
    Phone,
    MessageCircle,
    Megaphone,
    Info,
    Siren,
    X,
    ArrowRight,
} from "lucide-react"
import axiosClient from "@/lib/axios"
import {Routes} from "@/routes/constants"

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
    todayShifts?: ShiftItem[]
    todayShift?: ShiftItem | null
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
        hoursPerWeek?: number
    } | null
    upcomingSchedule: ShiftItem[]
    recentActivities: ActivityItem[]
    careTeam: TeamMember[]
}

interface Announcement {
    id: string
    title: string
    body: string
    type: "info" | "warning" | "urgent"
    createdByName?: string
    createdAt: { seconds: number } | string | null
}

// ─── Announcements Banner ─────────────────────────────────────────────────────

const BANNER_META = {
    info:    { bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-800",  icon: Info,          label: "Info" },
    warning: { bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-800", icon: AlertTriangle, label: "Warning" },
    urgent:  { bg: "bg-red-50",    border: "border-red-200",   text: "text-red-800",   icon: Siren,         label: "Urgent" },
} as const

const DISMISSED_KEY = "family_dismissed_announcements"

function getDismissed(): Set<string> {
    try { return new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]")) }
    catch { return new Set() }
}

function dismiss(id: string) {
    const s = getDismissed()
    s.add(id)
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...s]))
}

function AnnouncementsBanner({
    announcements,
    onViewAll,
}: {
    announcements: Announcement[]
    onViewAll: () => void
}) {
    const [dismissed, setDismissed] = useState<Set<string>>(getDismissed)
    const visible = announcements.filter((a) => !dismissed.has(a.id))

    if (visible.length === 0) return null

    const top = visible[0]
    const meta = BANNER_META[top.type] ?? BANNER_META.info
    const TypeIcon = meta.icon
    const extras = visible.length - 1

    const handleDismiss = (id: string) => {
        dismiss(id)
        setDismissed(getDismissed())
    }

    return (
        <div className={`rounded-2xl border p-4 ${meta.bg} ${meta.border}`}>
            <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/60`}>
                    <TypeIcon className={`h-3.5 w-3.5 ${meta.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-bold uppercase tracking-wide ${meta.text} opacity-70`}>
                            {meta.label}
                        </span>
                        <Megaphone className={`h-3 w-3 ${meta.text} opacity-50`} />
                    </div>
                    <p className={`mt-0.5 text-[14px] font-semibold ${meta.text}`}>{top.title}</p>
                    <p className={`mt-0.5 text-[13px] ${meta.text} opacity-80 line-clamp-2`}>{top.body}</p>
                    <div className="mt-2 flex items-center gap-3">
                        {extras > 0 && (
                            <button
                                type="button"
                                onClick={onViewAll}
                                className={`flex items-center gap-1 text-[12px] font-semibold ${meta.text} underline-offset-2 hover:underline`}
                            >
                                +{extras} more announcement{extras > 1 ? "s" : ""}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onViewAll}
                            className={`flex items-center gap-1 text-[12px] font-semibold ${meta.text} hover:underline underline-offset-2`}
                        >
                            View all <ArrowRight className="h-3 w-3" />
                        </button>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => handleDismiss(top.id)}
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full hover:bg-black/10 ${meta.text} opacity-60`}
                    aria-label="Dismiss"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    )
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
        return `Today, ${date.toLocaleDateString("en-US", {month: "short", day: "numeric"})}`
    }
    return date.toLocaleDateString("en-US", {weekday: "long", month: "short", day: "numeric"})
}

function fmtMonthRange(start?: string, end?: string) {
    if (!start && !end) return null
    const fmt = (s: string) => {
        const datePart = s.split("T")[0]
        const [y, m, d] = datePart.split("-").map(Number)
        if (!y || !m || !d) return "—"
        return new Date(y, m - 1, d).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
    }
    if (start && end) return `${fmt(start)} – ${fmt(end)}`
    return start ? `From ${fmt(start)}` : ""
}

function fmtScheduleParts(dateStr: string): { label: string; formatted: string } {
    if (!dateStr) return {label: "", formatted: "—"}
    const [y, m, d] = dateStr.split("-").map(Number)
    const date = new Date(y, m - 1, d)
    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)
    const tomorrowMidnight = new Date(todayMidnight)
    tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1)
    const fmt = date.toLocaleDateString("en-US", {month: "short", day: "numeric"})
    if (date.getTime() === todayMidnight.getTime()) return {label: "Today", formatted: fmt}
    if (date.getTime() === tomorrowMidnight.getTime()) return {label: "Tomorrow", formatted: fmt}
    return {label: date.toLocaleDateString("en-US", {weekday: "long"}), formatted: fmt}
}

function StatusBadge({status}: { status: string }) {
    const styles: Record<string, string> = {
        ongoing: "bg-orange-50 text-orange-500 border border-orange-200",
        available: "bg-slate-100 text-slate-600",
        pending: "bg-slate-100 text-slate-600",
        completed: "bg-green-100 text-green-700",
        expired: "bg-red-100 text-red-500",
    }
    const labels: Record<string, string> = {
        ongoing: "In-progress",
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

function AvatarBadge({name, src}: { name?: string | null; src?: string | null }) {
    if (src) {
        return <img src={src} alt={name ?? ""} className="h-7 w-7 rounded-full object-cover"/>
    }
    return (
        <div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00B4B8]/15 text-[11px] font-semibold text-[#00B4B8]">
            {name ? initials(name) : "?"}
        </div>
    )
}

// ─── Overview Cards ───────────────────────────────────────────────────────────

function OverviewCards({data}: { data: DashboardData }) {
    const todayShifts = data.todayShifts ?? (data.todayShift ? [data.todayShift] : [])
    const {weeklyHours, remainingBalance, alerts} = data
    const weeklyPct =
        weeklyHours.total > 0
            ? Math.min(100, Math.round((weeklyHours.approved / weeklyHours.total) * 100))
            : 0

    return (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {/* Today's Schedule */}
            <div className="rounded-2xl bg-white p-5 border border-[#DBDBDB]">
                <div className="flex items-center gap-2 mb-5">
                    <CalendarDays className="h-5 w-5 text-gray-700"/>
                    <span className="text-[14px] font-semibold">Today's schedule</span>
                </div>
                {todayShifts.length === 0 ? (
                    <p className="text-[17px] text-gray-500">No visits today</p>
                ) : (
                    <>
                        <p className="text-[17px] text-gray-500">
                            <b className="text-black font-semibold">{todayShifts.length}</b>{" "}
                            {todayShifts.length === 1 ? "Visit scheduled" : "Visits scheduled"}
                        </p>
                        <div className="mt-2 space-y-2">
                            {todayShifts.map((shift) => (
                                <div key={shift.id}>
                                    <p className="text-[14px] text-gray-500">
                                        {shift.startTime ?? "—"} to {shift.endTime ?? "—"}
                                    </p>
                                    {shift.dspName && (
                                        <p className="text-[14px] text-gray-500">By {shift.dspName}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* This Week's Hours */}
            <div className="rounded-2xl bg-white p-5 border border-[#DBDBDB]">
                <div className="flex items-center gap-2 mb-5">
                    <Clock className="h-5 w-5 text-gray-700"/>
                    <span className="text-[14px] font-semibold">This Week's hours</span>
                </div>
                <p className="text-[17px] font-semibold text-slate-900">
                    <b className="text-black">{weeklyHours.approved}</b>
                    <span className="font-normal text-gray-500">/{weeklyHours.total} hrs</span>
                </p>
                <p className="mt-1 text-[13px] text-gray-500">
                    {weeklyPct}% of approved hours used
                </p>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-green-100">
                    <div
                        className="h-full rounded-full bg-green-600 transition-all"
                        style={{width: `${weeklyPct}%`}}
                    />
                </div>
            </div>

            {/* Remaining Balance */}
            <div className="rounded-2xl bg-white p-5 border border-[#DBDBDB]">
                <div className="flex items-center gap-2 mb-5">
                    <Wallet className="h-5 w-5 text-gray-700"/>
                    <span className="text-[14px] font-semibold">Remaining balance</span>
                </div>
                <p className="text-[17px] font-semibold text-slate-900">
                    {remainingBalance ? `${remainingBalance.hours} hrs` : "—"}
                </p>
                <p className="mt-1 text-[13px] text-gray-500">
                    {remainingBalance?.period ?? "Remaining this month"}
                </p>
            </div>

            {/* Alerts */}
            <div className="rounded-2xl bg-white p-5 border border-[#DBDBDB]">
                <div className="flex items-center gap-2 mb-5">
                    <AlertTriangle className="h-5 w-5 text-gray-700"/>
                    <span className="text-[14px] font-semibold">Alerts</span>
                </div>
                <p className="text-[17px] text-gray-500">
                    {alerts.count > 0
                        ? <><b className="text-black font-semibold">{alerts.count}</b> Active alert{alerts.count > 1 ? "s" : ""}</>
                        : "No active alerts"
                    }
                </p>
                {alerts.count > 0 && alerts.items.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                        {alerts.items.slice(0, 2).map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-[13px] text-gray-500">
                                <span>{item.message}</span>
                                <ChevronRight className="h-4 w-4 flex-shrink-0"/>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-1 text-[13px] text-gray-500">Everything looks good</p>
                )}
            </div>
        </div>
    )
}

// ─── Service & Hours Card ─────────────────────────────────────────────────────

function ServiceHoursCard({service}: { service: DashboardData["serviceHours"] }) {
    if (!service) {
        return (
            <div className="rounded-2xl bg-white p-6 border border-[#DBDBDB]">
                <h2 className="mb-3 text-[15px] font-semibold text-slate-800">Service &amp; hours</h2>
                <p className="text-[13px] text-slate-400">No service authorization data available.</p>
            </div>
        )
    }

    const pct =
        service.totalHours > 0
            ? Math.min(100, Math.round((service.usedHours / service.totalHours) * 100))
            : 0
    const remaining = Math.max(0, service.totalHours - service.usedHours)
    const dateRange = fmtMonthRange(service.startDate, service.endDate)

    return (
        <div className="rounded-2xl bg-white p-6 border border-[#DBDBDB]">
            <h2 className="mb-4 text-[15px] font-semibold text-slate-800">Service &amp; hours</h2>

            {/* Approved service info box */}
            <div className="mb-5 rounded-xl bg-[#F5F5F5] p-4">
                <p className="mb-2 text-[13px] font-semibold text-slate-800">Approved service</p>
                <div className="flex items-center justify-between">
                    <span className="text-[13px] text-slate-600">
                        {service.name}
                        {service.code && <span className="ml-1">({service.code})</span>}
                    </span>
                    {service.hoursPerWeek && (
                        <span className="text-[13px] font-semibold text-slate-800">
                            {service.hoursPerWeek}hrs / week
                        </span>
                    )}
                </div>
                {dateRange && (
                    <div className="mt-1 flex items-center justify-between">
                        <span className="text-[13px] text-slate-500">This month</span>
                        <span className="text-[13px] font-semibold text-slate-800">{dateRange}</span>
                    </div>
                )}
            </div>

            {/* Hours display */}
            <p className="text-[22px] font-semibold text-slate-900">
                <b className="text-black">{service.usedHours}</b>
                <span className="font-normal text-gray-500"> / {service.totalHours} hrs</span>
            </p>
            <p className="mt-1 text-[13px] text-gray-500">{remaining} hrs remaining hours</p>

            {/* Progress bar */}
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-green-100">
                <div
                    className="h-full rounded-full bg-green-600 transition-all"
                    style={{width: `${pct}%`}}
                />
            </div>

            {/* Refresh notice */}
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#E8F8F7] px-4 py-3">
                <Clock className="h-4 w-4 flex-shrink-0 text-[#00B4B8]"/>
                <span className="text-[13px] text-[#00B4B8]">Hours refresh on the 1st of each month</span>
            </div>
        </div>
    )
}

// ─── Recent Activities Card ───────────────────────────────────────────────────

function RecentActivitiesCard({activities}: { activities: ActivityItem[] }) {
    return (
        <div className="rounded-2xl bg-white p-6 border border-[#DBDBDB]">
            <h2 className="mb-4 text-[15px] font-semibold text-slate-800">Recent activities</h2>

            {activities.length === 0 ? (
                <p className="text-[13px] text-slate-400">No recent activity recorded.</p>
            ) : (
                <div className="flex flex-col gap-4">
                    {activities.map((act, i) => (
                        <div key={i} className="flex items-center gap-4">
                            {/* Time column */}
                            <span className="w-16 flex-shrink-0 text-right text-[12px] text-slate-400">
                                {act.time}
                            </span>
                            {/* Icon */}
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#00B4B8]/10">
                                <CheckCircle2 className="h-4.5 w-4.5 text-[#00B4B8]"/>
                            </div>
                            {/* Content */}
                            <div className="flex flex-1 min-w-0 items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-slate-800">{act.title}</p>
                                    {act.description && (
                                        <p className="truncate text-[12px] text-slate-500">{act.description}</p>
                                    )}
                                </div>
                                <span className="flex-shrink-0 rounded-full bg-green-500 px-3 py-1 text-[12px] font-medium text-white">
                                    Completed
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Upcoming Schedule Card ───────────────────────────────────────────────────

function UpcomingScheduleCard({schedule}: { schedule: ShiftItem[] }) {
    return (
        <div className="rounded-2xl bg-white p-6 border border-[#DBDBDB]">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-800">Upcoming schedule</h2>
                <button
                    type="button"
                    disabled
                    className="cursor-default text-[13px] font-medium text-[#00B4B8] opacity-70"
                >
                    View full schedule
                </button>
            </div>

            {schedule.length === 0 ? (
                <p className="text-[13px] text-slate-400">No upcoming visits scheduled.</p>
            ) : (
                <div className="flex flex-col divide-y divide-slate-100">
                    {schedule.map((s) => {
                        const {label, formatted} = fmtScheduleParts(s.date)
                        return (
                            <div key={s.id} className="flex items-start justify-between gap-3 py-4 first:pt-0">
                                <div className="flex items-start gap-3">
                                    <CalendarDays className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 text-slate-400"/>
                                    <div>
                                        <p className="text-[13px] text-slate-600">
                                            {label}{" "}
                                            <span className="font-semibold text-slate-800">{formatted}</span>
                                        </p>
                                        <p className="mt-0.5 text-[12px] text-slate-500">
                                            {s.startTime ?? "—"} to {s.endTime ?? "—"}
                                        </p>
                                        {s.dspName && (
                                            <p className="text-[12px] text-slate-500">By {s.dspName}</p>
                                        )}
                                    </div>
                                </div>
                                <StatusBadge status={s.status}/>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─── Care Team Card ───────────────────────────────────────────────────────────

function CareTeamCard({team}: { team: TeamMember[] }) {
    const navigate = useNavigate()
    return (
        <div className="rounded-2xl bg-white p-6 border border-[#DBDBDB]">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-800">Care Team</h2>
                <button
                    type="button"
                    disabled
                    className="cursor-default text-[13px] font-medium text-[#00B4B8] opacity-70"
                >
                    View all
                </button>
            </div>

            {team.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <Users className="h-8 w-8 text-slate-300"/>
                    <p className="text-[13px] text-slate-400">No care team assigned yet.</p>
                </div>
            ) : (
                <div className="flex flex-col divide-y divide-slate-100">
                    {team.slice(0, 4).map((member) => (
                        <div key={member.id} className="flex items-center gap-3 py-3 first:pt-0">
                            {member.avatar ? (
                                <img
                                    src={member.avatar}
                                    alt={member.fullName}
                                    className="h-11 w-11 flex-shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#00B4B8]/15 text-[12px] font-semibold text-[#00B4B8]">
                                    {initials(member.fullName)}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold text-slate-800">
                                    {member.fullName}
                                </p>
                                <p className="text-[12px] text-slate-400">
                                    {member.isPrimary ? "Primary caregiver" : (member.role ?? "DSP")}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-colors"
                                >
                                    <Phone className="h-3.5 w-3.5"/>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate(`${Routes.family.messages}?contactId=${member.id}`)}
                                    title={`Message ${member.fullName}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:border-[#00B4B8] hover:text-[#00B4B8] transition-colors"
                                >
                                    <MessageCircle className="h-3.5 w-3.5"/>
                                </button>
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
    const navigate = useNavigate()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [announcements, setAnnouncements] = useState<Announcement[]>([])

    useEffect(() => {
        // Fetch dashboard and announcements in parallel
        Promise.all([
            axiosClient.get<{ success: boolean; data: DashboardData }>("/familyPortal/dashboard"),
            axiosClient.get<{ success: boolean; data: Announcement[] }>("/familyPortal/announcements").catch(() => null),
        ])
            .then(([dashRes, annRes]) => {
                setData(dashRes.data.data)
                if (annRes) setAnnouncements(annRes.data.data || [])
            })
            .catch(() => setError("Failed to load dashboard. Please refresh."))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#00B4B8]"/>
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
            {announcements.length > 0 && (
                <AnnouncementsBanner
                    announcements={announcements}
                    onViewAll={() => navigate(Routes.family.announcements)}
                />
            )}
            <h3 className={"font-bold text-xl"}>Overview</h3>
            <OverviewCards data={data}/>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Left: 2 cols wide */}
                <div className="flex flex-col gap-5 lg:col-span-2">
                    <ServiceHoursCard service={data.serviceHours}/>
                    <RecentActivitiesCard activities={data.recentActivities}/>
                </div>

                {/* Right: 1 col */}
                <div className="flex flex-col gap-5">
                    <UpcomingScheduleCard schedule={data.upcomingSchedule}/>
                    <CareTeamCard team={data.careTeam}/>
                </div>
            </div>
        </div>
    )
}
