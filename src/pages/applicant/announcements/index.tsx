import { useState, useEffect } from "react"
import { Megaphone, Loader2, AlertTriangle, Info, Siren, ChevronDown, ChevronUp } from "lucide-react"
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
  info:    { label: "Info",    border: "border-[#2b82ff] text-[#2b82ff]",  left: "border-l-[#2b82ff]",  icon: Info },
  warning: { label: "Warning", border: "border-[#FF6C10] text-[#FF6C10]",  left: "border-l-[#FF6C10]",  icon: AlertTriangle },
  urgent:  { label: "Urgent",  border: "border-[#ef4444] text-[#ef4444]",  left: "border-l-[#ef4444]",  icon: Siren },
} as const

function formatDate(val: { seconds: number } | string | null): string {
  if (!val) return ""
  const ms = typeof val === "string" ? Date.parse(val) : val.seconds * 1000
  if (isNaN(ms)) return ""
  return new Date(ms).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

const SEEN_AT_KEY = "applicant_ann_seen_at"

export default function ApplicantAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [expandedIds, setExpandedIds]     = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  useEffect(() => {
    axiosClient
      .get<{ success: boolean; data: Announcement[] }>("/applicantPortal/announcements")
      .then((res) => {
        setAnnouncements(res.data.data || [])
        localStorage.setItem(SEEN_AT_KEY, Date.now().toString())
      })
      .catch(() => setError("Failed to load announcements. Please try again."))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Announcements
        </h1>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[15px] font-semibold text-slate-800">Agency Notices</p>
          <p className="mt-0.5 text-[13px] text-slate-400">Important updates from your agency</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#00B4B8]" />
          </div>
        ) : error ? (
          <div className="px-5 py-6">
            <p className="text-[13px] text-red-500">{error}</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(0,180,184,0.1)]">
              <Megaphone className="h-6 w-6 text-[#00B4B8]" />
            </div>
            <p className="text-[14px] font-medium text-slate-500">No announcements yet</p>
            <p className="text-[12px] text-slate-400">Your agency hasn't posted any announcements for you</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {announcements.map((a) => {
              const meta     = TYPE_META[a.type] ?? TYPE_META.info
              const TypeIcon = meta.icon
              const posted   = formatDate(a.createdAt)
              const expanded = expandedIds.has(a.id)
              const isLong   = a.body.length > 160

              return (
                <div key={a.id} className={`border-l-4 ${meta.left} px-5 py-4`}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${meta.border} bg-transparent`}>
                      <TypeIcon className="h-3 w-3" />
                      {meta.label}
                    </span>
                    {posted && <span className="text-[12px] text-slate-400">{posted}</span>}
                  </div>

                  <p className="text-[14px] font-semibold text-slate-800">{a.title}</p>

                  <p className={`mt-1 text-[13px] leading-relaxed text-slate-500 ${!expanded && isLong ? "line-clamp-3" : ""}`}>
                    {a.body}
                  </p>

                  {isLong && (
                    <button
                      onClick={() => toggleExpand(a.id)}
                      className="mt-1 flex items-center gap-0.5 text-[12px] font-medium text-[#00B4B8] hover:underline underline-offset-2"
                    >
                      {expanded
                        ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                        : <><ChevronDown className="h-3.5 w-3.5" /> Read more</>}
                    </button>
                  )}

                  {a.createdByName && (
                    <p className="mt-2.5 text-[11px] text-slate-400">— {a.createdByName}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
