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
  info:    { label: "Info",    border: "border-[#2b82ff] text-[#2b82ff]",   left: "border-l-[#2b82ff]",   icon: Info },
  warning: { label: "Warning", border: "border-[#FF6C10] text-[#FF6C10]",   left: "border-l-[#FF6C10]",   icon: AlertTriangle },
  urgent:  { label: "Urgent",  border: "border-[#ef4444] text-[#ef4444]",   left: "border-l-[#ef4444]",   icon: Siren },
} as const

function formatDate(val: { seconds: number } | string | null): string {
  if (!val) return ""
  const ms = typeof val === "string" ? Date.parse(val) : val.seconds * 1000
  if (isNaN(ms)) return ""
  return new Date(ms).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

const SEEN_AT_KEY = "family_ann_seen_at"
const BADGE_EVENT = "family_ann_badge_change"

export default function FamilyAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [expandedIds, setExpandedIds]     = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  useEffect(() => {
    axiosClient
      .get<{ success: boolean; data: Announcement[] }>("/familyPortal/announcements")
      .then((res) => {
        setAnnouncements(res.data.data || [])
        localStorage.setItem(SEEN_AT_KEY, Date.now().toString())
        localStorage.removeItem("family_ann_has_new")
        window.dispatchEvent(new CustomEvent(BADGE_EVENT, { detail: false }))
      })
      .catch(() => setError("Failed to load announcements. Please try again."))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Announcements
        </h1>
      </div>

      <div className="overflow-hidden bg-white shadow-sm rounded-xl sm:rounded-2xl">
        {/* Card header */}
        <div className="p-4 sm:p-6 border-b border-[#e5e7eb]">
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#10141a]">Agency Notices</h2>
          <p className="mt-0.5 text-[13px] sm:text-[14px] text-[#6b7280]">
            Important updates from your care agency
          </p>
        </div>

        {loading ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent" />
            <p className="mt-4 text-[14px] text-[#6b7280]">Loading announcements…</p>
          </div>
        ) : error ? (
          <div className="p-6">
            <p className="text-[14px] text-[#ef4444]">{error}</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f4f6]">
              <Megaphone className="h-7 w-7 text-[#b2b2b3]" />
            </div>
            <p className="text-[14px] font-semibold text-[#10141a]">No announcements</p>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              Your care agency hasn't posted any announcements yet
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e5e7eb]">
            {announcements.map((a) => {
              const meta     = TYPE_META[a.type] ?? TYPE_META.info
              const TypeIcon = meta.icon
              const posted   = formatDate(a.createdAt)
              const expanded = expandedIds.has(a.id)
              const isLong   = a.body.length > 160

              return (
                <div
                  key={a.id}
                  className={`p-4 sm:p-6 border-l-4 ${meta.left}`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-[13px] font-medium border ${meta.border} bg-transparent flex items-center gap-1.5`}>
                      <TypeIcon className="h-3.5 w-3.5" />
                      {meta.label}
                    </span>
                    {posted && (
                      <span className="text-[12px] text-[#b2b2b3]">Posted {posted}</span>
                    )}
                  </div>

                  <p className="text-[15px] font-semibold text-[#10141a]">{a.title}</p>

                  <p className={`mt-1.5 text-[14px] text-[#6b7280] leading-[1.5] ${!expanded && isLong ? "line-clamp-3" : ""}`}>
                    {a.body}
                  </p>

                  {isLong && (
                    <button
                      onClick={() => toggleExpand(a.id)}
                      className="mt-1.5 flex items-center gap-0.5 text-[13px] font-medium text-[#00b4b8] hover:underline"
                    >
                      {expanded
                        ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                        : <><ChevronDown className="h-3.5 w-3.5" /> Read more</>}
                    </button>
                  )}

                  {a.createdByName && (
                    <p className="mt-3 text-[12px] text-[#b2b2b3]">— {a.createdByName}</p>
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
