import { useState, useEffect } from "react"
import { X, AlertTriangle, Info, Siren } from "lucide-react"
import { Link, useLocation } from "react-router"
import axiosClient from "@/lib/axios"

interface Announcement {
  id: string
  title: string
  body: string
  type: "info" | "warning" | "urgent"
}

const PRIORITY: Record<string, number> = { urgent: 0, warning: 1, info: 2 }

const TYPE_STYLES = {
  info: {
    bg: "bg-blue-50",
    left: "border-l-[#2b82ff]",
    icon: Info,
    text: "text-[#2b82ff]",
    badge: "border-[#2b82ff] text-[#2b82ff]",
  },
  warning: {
    bg: "bg-orange-50",
    left: "border-l-[#FF6C10]",
    icon: AlertTriangle,
    text: "text-[#FF6C10]",
    badge: "border-[#FF6C10] text-[#FF6C10]",
  },
  urgent: {
    bg: "bg-red-50",
    left: "border-l-[#ef4444]",
    icon: Siren,
    text: "text-[#ef4444]",
    badge: "border-[#ef4444] text-[#ef4444]",
  },
} as const

interface Props {
  endpoint: string
  viewAllPath: string
  /** Tailwind classes for outer positioning — defaults suit the standard px-8 layouts */
  className?: string
}

export default function AnnouncementBanner({
  endpoint,
  viewAllPath,
  className = "mx-8 mb-4",
}: Props) {
  const location = useLocation()
  const storageKey = `dismissed_ann${endpoint.replace(/\//g, "_")}`

  const [top, setTop] = useState<Announcement | null>(null)
  const [extraCount, setExtraCount] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let seen: Set<string>
    try {
      seen = new Set(JSON.parse(sessionStorage.getItem(storageKey) ?? "[]"))
    } catch {
      seen = new Set()
    }

    axiosClient
      .get<{ success: boolean; data: Announcement[] }>(endpoint)
      .then((res) => {
        const sorted = (res.data.data ?? []).sort(
          (a, b) => (PRIORITY[a.type] ?? 2) - (PRIORITY[b.type] ?? 2),
        )
        const undismissed = sorted.filter((a) => !seen.has(a.id))
        if (undismissed.length === 0) return
        setTop(undismissed[0])
        setExtraCount(undismissed.length - 1)
      })
      .catch(() => {})
  }, [endpoint, storageKey])

  const dismiss = () => {
    if (!top) return
    try {
      const existing: string[] = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]")
      sessionStorage.setItem(storageKey, JSON.stringify([...new Set([...existing, top.id])]))
    } catch {}
    setDismissed(true)
  }

  // Don't render on the announcements page itself or when nothing to show
  if (!top || dismissed || location.pathname === viewAllPath) return null

  const s = TYPE_STYLES[top.type] ?? TYPE_STYLES.info
  const Icon = s.icon

  return (
    <div className={`${className} border-l-4 ${s.left} ${s.bg} rounded-r-xl px-4 py-3 shadow-sm`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.text}`} />

        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-semibold ${s.text}`}>{top.title}</p>
          <p className="mt-0.5 line-clamp-1 text-[12px] text-slate-600">{top.body}</p>
          {extraCount > 0 && (
            <Link
              to={viewAllPath}
              className="mt-0.5 inline-block text-[11px] font-medium text-[#00B4B8] hover:underline"
            >
              +{extraCount} more announcement{extraCount > 1 ? "s" : ""} →
            </Link>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            to={viewAllPath}
            className={`whitespace-nowrap text-[11px] font-semibold ${s.text} hover:underline`}
          >
            View all
          </Link>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss announcement"
            className="rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
