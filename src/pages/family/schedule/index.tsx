import { useEffect, useMemo, useRef, useState } from "react"
import { Search, ChevronLeft, ChevronRight, HelpCircle, Loader2 } from "lucide-react"
import axiosClient from "@/lib/axios"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduledShift {
  id: string
  date: string      // YYYY-MM-DD
  startTime: string | null
  endTime: string | null
  status: string
  title: string
  serviceCode?: string | null
  dspName?: string | null
  dspAvatar?: string | null
}

interface LayoutShift extends ScheduledShift {
  startMins: number
  endMins: number
  colIndex: number
  totalCols: number
}

type ViewMode = "day" | "week" | "month"

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_START_HOUR = 6
const DAY_END_HOUR = 22
const HOUR_HEIGHT = 72 // px per hour
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT
const TIME_COL_W = 72 // px width of the time labels column
const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => DAY_START_HOUR + i)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(t: string | null | undefined): number {
  if (!t) return 0
  // "HH:MM" 24-hour
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/)
  if (m24) return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10)
  // "H:MM AM/PM"
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (m12) {
    let h = parseInt(m12[1], 10)
    const min = parseInt(m12[2], 10)
    const pm = m12[3].toUpperCase() === "PM"
    if (pm && h !== 12) h += 12
    if (!pm && h === 12) h = 0
    return h * 60 + min
  }
  return 0
}

function fmtHour(h: number) {
  if (h === 0 || h === 24) return "12:00 am"
  if (h === 12) return "12:00 pm"
  return h < 12 ? `${h}:00 am` : `${h - 12}:00 pm`
}

function fmtMinutes(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const suffix = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`
}

function fmtTimeRange(startTime: string | null, endTime: string | null) {
  if (!startTime) return "—"
  const s = fmtMinutes(timeToMinutes(startTime)).toLowerCase()
  if (!endTime) return s
  const e = fmtMinutes(timeToMinutes(endTime)).toLowerCase()
  return `${s} - ${e}`
}

function toYMD(d: Date) {
  return d.toISOString().split("T")[0]
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function startOfWeek(d: Date) {
  const r = new Date(d)
  const dow = r.getDay()
  const diff = dow === 0 ? 6 : dow - 1 // Monday = 0
  r.setDate(r.getDate() - diff)
  r.setHours(0, 0, 0, 0)
  return r
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function fmtDayHeader(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function fmtMonthYear(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function fmtWeekRange(d: Date) {
  const mon = startOfWeek(d)
  const sun = addDays(mon, 6)
  return `${mon.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sun.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
}

// ─── Layout algorithm for overlapping events ──────────────────────────────────

function layoutDayShifts(shifts: ScheduledShift[]): LayoutShift[] {
  if (!shifts.length) return []

  const items: LayoutShift[] = shifts.map((s) => {
    const startMins = timeToMinutes(s.startTime)
    const rawEnd = timeToMinutes(s.endTime)
    const endMins = rawEnd > startMins ? rawEnd : startMins + 60
    return { ...s, startMins, endMins, colIndex: 0, totalCols: 1 }
  })

  items.sort((a, b) => a.startMins - b.startMins)

  // Greedy column assignment
  const colEnds: number[] = []
  for (const item of items) {
    let placed = false
    for (let i = 0; i < colEnds.length; i++) {
      if (item.startMins >= colEnds[i]) {
        item.colIndex = i
        colEnds[i] = item.endMins
        placed = true
        break
      }
    }
    if (!placed) {
      item.colIndex = colEnds.length
      colEnds.push(item.endMins)
    }
  }

  // Compute totalCols per event (max col index of all overlapping events + 1)
  for (const item of items) {
    let maxCol = item.colIndex
    for (const other of items) {
      if (other === item) continue
      if (other.startMins < item.endMins && other.endMins > item.startMins) {
        maxCol = Math.max(maxCol, other.colIndex)
      }
    }
    item.totalCols = maxCol + 1
  }

  return items
}

function eventTopPx(startMins: number) {
  return Math.max(0, (startMins - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT
}

function eventHeightPx(startMins: number, endMins: number) {
  return Math.max(HOUR_HEIGHT * 0.5, ((endMins - startMins) / 60) * HOUR_HEIGHT)
}

// ─── Shared: avatar initials ──────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")
}

function DspAvatar({ name, src }: { name?: string | null; src?: string | null }) {
  if (src) return <img src={src} alt={name ?? ""} className="h-5 w-5 rounded-full object-cover" />
  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00B4B8]/20 text-[9px] font-bold text-[#00B4B8]">
      {name ? initials(name) : "?"}
    </div>
  )
}

// ─── Status border color ──────────────────────────────────────────────────────

function borderColor(status: string) {
  if (status === "ongoing") return "#00B4B8"
  if (status === "completed") return "#22c55e"
  if (status === "expired") return "#ef4444"
  return "#94a3b8"
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({
  shift,
  compact = false,
}: {
  shift: ScheduledShift
  compact?: boolean
}) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-xl bg-white px-3 py-2 shadow-sm"
      style={{ borderLeft: `3px solid ${borderColor(shift.status)}` }}
    >
      <p className={`font-semibold leading-tight text-slate-800 ${compact ? "text-[11px]" : "text-[13px]"}`}>
        {shift.title}
      </p>
      <p className={`mt-0.5 text-slate-500 ${compact ? "text-[10px]" : "text-[11px]"}`}>
        {fmtTimeRange(shift.startTime, shift.endTime)}
      </p>
      {!compact && shift.dspName && (
        <div className="mt-auto flex items-center gap-1.5 pt-1">
          <DspAvatar name={shift.dspName} src={shift.dspAvatar} />
          <span className="truncate text-[11px] text-slate-600">{shift.dspName}</span>
        </div>
      )}
    </div>
  )
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ shifts, currentDate }: { shifts: ScheduledShift[]; currentDate: Date }) {
  const layouted = useMemo(() => layoutDayShifts(shifts), [shifts])
  const scrollRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const isToday = isSameDay(currentDate, now)
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const nowTop = isToday ? eventTopPx(nowMins) : null
  const nowLabel = isToday ? fmtMinutes(nowMins) : null

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current && nowTop !== null) {
      scrollRef.current.scrollTop = Math.max(0, nowTop - 150)
    }
  }, [nowTop])

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="relative" style={{ height: TOTAL_HEIGHT }}>
        {/* Hour lines + labels */}
        {HOURS.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 flex items-start"
            style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT }}
          >
            <span
              className="flex-shrink-0 pr-3 text-right text-[11px] text-slate-400"
              style={{ width: TIME_COL_W }}
            >
              {h < DAY_END_HOUR ? fmtHour(h) : ""}
            </span>
            <div className="flex-1 border-t border-slate-100" />
          </div>
        ))}

        {/* Current time indicator */}
        {nowTop !== null && nowTop >= 0 && nowTop <= TOTAL_HEIGHT && (
          <div
            className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
            style={{ top: nowTop }}
          >
            <div
              className="flex-shrink-0 pr-2 text-right"
              style={{ width: TIME_COL_W }}
            >
              <span className="rounded-md bg-[#00B4B8] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {nowLabel}
              </span>
            </div>
            <div className="h-0.5 flex-1 bg-[#00B4B8]" />
          </div>
        )}

        {/* Events */}
        <div
          className="absolute inset-0"
          style={{ left: TIME_COL_W, paddingRight: 12 }}
        >
          {layouted.map((item) => {
            const top = eventTopPx(item.startMins)
            const height = eventHeightPx(item.startMins, item.endMins)
            const colW = 100 / item.totalCols
            return (
              <div
                key={item.id}
                className="absolute"
                style={{
                  top,
                  height,
                  left: `${item.colIndex * colW}%`,
                  width: `calc(${colW}% - 8px)`,
                  paddingRight: 4,
                }}
              >
                <EventCard shift={item} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ shifts, currentDate }: { shifts: ScheduledShift[]; currentDate: Date }) {
  const mon = startOfWeek(currentDate)
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i))
  const today = new Date()
  const scrollRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const nowTop = eventTopPx(nowMins)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, nowTop - 150)
    }
  }, [nowTop])

  return (
    <div className="flex flex-col" style={{ minHeight: 0, flex: 1 }}>
      {/* Day header row */}
      <div className="flex border-b border-slate-200 bg-white">
        <div className="flex-shrink-0" style={{ width: TIME_COL_W }} />
        {days.map((d) => {
          const isToday = isSameDay(d, today)
          return (
            <div
              key={d.toISOString()}
              className={`flex-1 py-2 text-center text-[12px] font-medium ${isToday ? "text-[#00B4B8]" : "text-slate-500"}`}
            >
              <span>{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
              <div
                className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-bold ${
                  isToday ? "bg-[#00B4B8] text-white" : "text-slate-700"
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Timeline grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: TOTAL_HEIGHT }}>
          {/* Hour lines */}
          <div className="absolute inset-0 pointer-events-none">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-slate-100"
                style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT }}
              />
            ))}
          </div>

          {/* Current time line across full width */}
          {isSameDay(currentDate, today) || days.some((d) => isSameDay(d, today)) ? (
            <div
              className="pointer-events-none absolute left-0 right-0 z-10 h-0.5 bg-[#00B4B8]"
              style={{ top: nowTop }}
            />
          ) : null}

          {/* Time labels */}
          <div className="relative flex-shrink-0" style={{ width: TIME_COL_W }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-0 pr-2 text-right text-[10px] text-slate-400"
                style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT - 6 }}
              >
                {h < DAY_END_HOUR ? fmtHour(h) : ""}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const ymd = toYMD(d)
            const dayShifts = shifts.filter((s) => s.date === ymd)
            const layouted = layoutDayShifts(dayShifts)
            return (
              <div key={ymd} className="relative flex-1 border-l border-slate-100">
                {layouted.map((item) => {
                  const top = eventTopPx(item.startMins)
                  const height = eventHeightPx(item.startMins, item.endMins)
                  const colW = 100 / item.totalCols
                  return (
                    <div
                      key={item.id}
                      className="absolute px-0.5"
                      style={{
                        top,
                        height,
                        left: `${item.colIndex * colW}%`,
                        width: `${colW}%`,
                      }}
                    >
                      <EventCard shift={item} compact />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  shifts,
  currentDate,
  onDayClick,
}: {
  shifts: ScheduledShift[]
  currentDate: Date
  onDayClick: (d: Date) => void
}) {
  const today = new Date()
  const first = startOfMonth(currentDate)
  const last = endOfMonth(currentDate)

  // Build 6-week grid starting from the Monday on/before first of month
  const gridStart = startOfWeek(first)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  // Group shifts by date
  const shiftsByDate: Record<string, ScheduledShift[]> = {}
  for (const s of shifts) {
    if (!shiftsByDate[s.date]) shiftsByDate[s.date] = []
    shiftsByDate[s.date].push(s)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Day name header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-white">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-[12px] font-semibold text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-hidden">
        {cells.map((d) => {
          const ymd = toYMD(d)
          const isThisMonth = d.getMonth() === currentDate.getMonth()
          const isToday = isSameDay(d, today)
          const dayShifts = shiftsByDate[ymd] ?? []
          const visible = dayShifts.slice(0, 3)
          const extra = dayShifts.length - visible.length

          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onDayClick(d)}
              className={`flex flex-col gap-1 border-b border-r border-slate-100 p-2 text-left transition-colors hover:bg-slate-50 ${
                !isThisMonth ? "bg-slate-50/40" : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${
                    isToday
                      ? "bg-[#00B4B8] text-white"
                      : isThisMonth
                      ? "text-slate-700"
                      : "text-slate-300"
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
              {visible.map((s) => (
                <div
                  key={s.id}
                  className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: "#00B4B8" }}
                >
                  {s.title}
                </div>
              ))}
              {extra > 0 && (
                <span className="text-[10px] text-slate-400">+{extra} more</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Schedule Page ───────────────────────────────────────────────────────

export default function FamilySchedulePage() {
  const [view, setView] = useState<ViewMode>("day")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [search, setSearch] = useState("")
  const [shifts, setShifts] = useState<ScheduledShift[]>([])
  const [loading, setLoading] = useState(true)

  // Compute date range for current view
  const { startDate, endDate, label } = useMemo(() => {
    if (view === "day") {
      const ymd = toYMD(currentDate)
      return {
        startDate: ymd,
        endDate: ymd,
        label: currentDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      }
    }
    if (view === "week") {
      const mon = startOfWeek(currentDate)
      const sun = addDays(mon, 6)
      return { startDate: toYMD(mon), endDate: toYMD(sun), label: fmtWeekRange(currentDate) }
    }
    // month
    const first = startOfMonth(currentDate)
    const last = endOfMonth(currentDate)
    return { startDate: toYMD(first), endDate: toYMD(last), label: fmtMonthYear(currentDate) }
  }, [view, currentDate])

  // Fetch when range changes
  useEffect(() => {
    setLoading(true)
    axiosClient
      .get<{ success: boolean; data: ScheduledShift[] }>(
        `/familyPortal/schedule?startDate=${startDate}&endDate=${endDate}`
      )
      .then((res) => setShifts(res.data.data ?? []))
      .catch(() => setShifts([]))
      .finally(() => setLoading(false))
  }, [startDate, endDate])

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return shifts
    const q = search.toLowerCase()
    return shifts.filter(
      (s) =>
        s.dspName?.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.serviceCode?.toLowerCase().includes(q)
    )
  }, [shifts, search])

  const navigate = (delta: number) => {
    setCurrentDate((d) => {
      const next = new Date(d)
      if (view === "day") next.setDate(next.getDate() + delta)
      else if (view === "week") next.setDate(next.getDate() + 7 * delta)
      else next.setMonth(next.getMonth() + delta)
      return next
    })
  }

  const goToday = () => setCurrentDate(new Date())

  const handleDayClick = (d: Date) => {
    setCurrentDate(d)
    setView("day")
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-bold text-slate-900">Schedule</h1>
        <button
          type="button"
          className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700"
        >
          <HelpCircle className="h-4 w-4" />
          Help
        </button>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View switcher */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 text-[13px] font-medium capitalize transition-colors ${
                view === v
                  ? "bg-[#00B4B8] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-100"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Current range label */}
        <span className="text-[13px] font-medium text-slate-600">{label}</span>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search care taker, care name, etc here"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-slate-700 placeholder-slate-400 outline-none focus:border-[#00B4B8] focus:ring-1 focus:ring-[#00B4B8]/20"
          />
        </div>
      </div>

      {/* Calendar area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#00B4B8]" />
          </div>
        ) : view === "day" ? (
          <DayView shifts={filtered} currentDate={currentDate} />
        ) : view === "week" ? (
          <WeekView shifts={filtered} currentDate={currentDate} />
        ) : (
          <MonthView shifts={filtered} currentDate={currentDate} onDayClick={handleDayClick} />
        )}
      </div>
    </div>
  )
}
