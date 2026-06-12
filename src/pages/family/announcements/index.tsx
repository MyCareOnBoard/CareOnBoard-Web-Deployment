import { useState, useEffect } from "react"
import { Megaphone, Loader2, AlertTriangle, Info, Siren } from "lucide-react"
import axiosClient from "@/lib/axios"

interface Announcement {
  id: string
  title: string
  body: string
  type: "info" | "warning" | "urgent"
  createdByName: string
  createdAt: { seconds: number } | string | null
  expiresAt: { seconds: number } | string | null
}

const TYPE_META = {
  info: {
    label: "Info",
    badge: "bg-blue-50 text-blue-700",
    border: "border-l-blue-500",
    icon: Info,
  },
  warning: {
    label: "Warning",
    badge: "bg-amber-50 text-amber-700",
    border: "border-l-amber-500",
    icon: AlertTriangle,
  },
  urgent: {
    label: "Urgent",
    badge: "bg-red-50 text-red-700",
    border: "border-l-red-500",
    icon: Siren,
  },
} as const

function formatDate(val: { seconds: number } | string | null): string {
  if (!val) return ""
  const ms = typeof val === "string" ? Date.parse(val) : val.seconds * 1000
  if (isNaN(ms)) return ""
  return new Date(ms).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export default function FamilyAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    axiosClient
      .get<{ success: boolean; data: Announcement[] }>("/familyPortal/announcements")
      .then((res) => setAnnouncements(res.data.data || []))
      .catch(() => setError("Failed to load announcements. Please try again."))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#063E3F]/10">
          <Megaphone className="h-5 w-5 text-[#063E3F]" />
        </div>
        <div>
          <h1 className="text-[18px] font-semibold text-slate-900">Announcements</h1>
          <p className="text-[12px] text-slate-400">Notices from your care agency</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-[13px] text-red-600">{error}</div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
          <Megaphone className="h-12 w-12 text-slate-200" />
          <p className="text-[14px] font-medium text-slate-500">No announcements</p>
          <p className="text-[12px] text-slate-400">Your care agency hasn't posted any announcements yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => {
            const meta = TYPE_META[a.type] ?? TYPE_META.info
            const TypeIcon = meta.icon
            const posted = formatDate(a.createdAt)
            return (
              <div
                key={a.id}
                className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm border-l-4 ${meta.border}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                    <TypeIcon className="h-3 w-3" />
                    {meta.label}
                  </span>
                  {posted && (
                    <span className="text-[11px] text-slate-400">Posted {posted}</span>
                  )}
                </div>
                <p className="mb-1.5 text-[15px] font-semibold text-slate-800">{a.title}</p>
                <p className="text-[13px] leading-relaxed text-slate-600">{a.body}</p>
                {a.createdByName && (
                  <p className="mt-3 text-[11px] text-slate-400">— {a.createdByName}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
