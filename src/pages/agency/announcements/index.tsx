import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Megaphone, Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight,
  X, AlertTriangle, Info, Siren, ChevronDown, ChevronUp,
} from "lucide-react"
import axiosClient from "@/lib/axios"

interface Announcement {
  id: string
  title: string
  body: string
  type: "info" | "warning" | "urgent"
  isActive: boolean
  createdByName: string
  createdAt: { seconds: number } | string | null
  expiresAt: { seconds: number } | string | null
}

interface FormState {
  title: string
  body: string
  type: "info" | "warning" | "urgent"
  expiresAt: string
}

const EMPTY_FORM: FormState = { title: "", body: "", type: "info", expiresAt: "" }

const TYPE_META = {
  info:    { label: "Info",    border: "border-[#2b82ff] text-[#2b82ff]",   left: "border-l-[#2b82ff]",   icon: Info },
  warning: { label: "Warning", border: "border-[#FF6C10] text-[#FF6C10]",   left: "border-l-[#FF6C10]",   icon: AlertTriangle },
  urgent:  { label: "Urgent",  border: "border-[#ef4444] text-[#ef4444]",   left: "border-l-[#ef4444]",   icon: Siren },
} as const

function formatDate(val: { seconds: number } | string | null): string {
  if (!val) return "—"
  const ms = typeof val === "string" ? Date.parse(val) : val.seconds * 1000
  if (isNaN(ms)) return "—"
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

type TypeFilter   = "all" | "info" | "warning" | "urgent"
type StatusFilter = "all" | "active" | "inactive"

export default function AgencyAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const [form,       setForm]       = useState<FormState>(EMPTY_FORM)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [showForm,   setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axiosClient.get<{ success: boolean; data: Announcement[] }>("/agencyAnnouncements/announcements")
      setAnnouncements(res.data.data || [])
    } catch {
      setError("Failed to load announcements. Please refresh.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() =>
    announcements
      .filter((a) => typeFilter   === "all" || a.type === typeFilter)
      .filter((a) => statusFilter === "all" || (statusFilter === "active" ? a.isActive : !a.isActive)),
    [announcements, typeFilter, statusFilter]
  )

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setFormError(null); setShowForm(true) }

  const openEdit = (a: Announcement) => {
    setEditingId(a.id)
    setForm({
      title:    a.title,
      body:     a.body,
      type:     a.type,
      expiresAt: a.expiresAt
        ? new Date(typeof a.expiresAt === "string" ? a.expiresAt : a.expiresAt.seconds * 1000)
            .toISOString().slice(0, 10)
        : "",
    })
    setFormError(null)
    setShowForm(true)
  }

  const cancelForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setFormError(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) { setFormError("Title and body are required."); return }
    setSubmitting(true)
    setFormError(null)
    const payload = {
      title:     form.title.trim(),
      body:      form.body.trim(),
      type:      form.type,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    }
    try {
      if (editingId) {
        await axiosClient.put(`/agencyAnnouncements/announcements/${editingId}`, payload)
        setAnnouncements((prev) => prev.map((a) => a.id === editingId ? { ...a, ...payload } : a))
      } else {
        const res = await axiosClient.post<{ success: boolean; data: Announcement }>("/agencyAnnouncements/announcements", payload)
        setAnnouncements((prev) => [res.data.data, ...prev])
      }
      cancelForm()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg || "Failed to save. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (a: Announcement) => {
    setTogglingId(a.id)
    const next = !a.isActive
    setAnnouncements((prev) => prev.map((x) => x.id === a.id ? { ...x, isActive: next } : x))
    try {
      await axiosClient.put(`/agencyAnnouncements/announcements/${a.id}`, { isActive: next })
    } catch {
      setAnnouncements((prev) => prev.map((x) => x.id === a.id ? { ...x, isActive: a.isActive } : x))
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement? This cannot be undone.")) return
    const snapshot = announcements.find((a) => a.id === id)
    setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    setDeletingId(id)
    try {
      await axiosClient.delete(`/agencyAnnouncements/announcements/${id}`)
    } catch {
      if (snapshot) setAnnouncements((prev) => [snapshot, ...prev])
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Announcements
        </h1>
      </div>

      <div className="flex gap-6">
        {/* ── Main card ── */}
        <div className="flex-1 min-w-0 overflow-hidden bg-white shadow-sm rounded-xl sm:rounded-2xl">
          {/* Card header */}
          <div className="p-4 sm:p-6 border-b border-[#e5e7eb]">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-[20px] sm:text-[22px] font-bold text-[#10141a]">All Announcements</h2>
                <p className="mt-0.5 text-[13px] sm:text-[14px] text-[#6b7280]">
                  Broadcast notices to all family portal users
                </p>
              </div>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#00b4b8] text-white text-[14px] font-semibold hover:bg-[#00a0a4] transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Announcement
              </button>
            </div>

            {/* Filter bar */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {/* Type filters */}
              <div className="flex items-center gap-1">
                {(["all", "info", "warning", "urgent"] as const).map((t) => {
                  const active = typeFilter === t
                  const meta   = t !== "all" ? TYPE_META[t] : null
                  return (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`px-3 py-1 rounded-full text-[13px] font-medium border transition-colors ${
                        active
                          ? t === "all"
                            ? "bg-[#10141a] border-[#10141a] text-white"
                            : `${meta!.border} bg-transparent`
                          : "border-[#e5e7eb] text-[#6b7280] hover:border-[#cccccd]"
                      }`}
                    >
                      {t === "all" ? "All types" : TYPE_META[t].label}
                    </button>
                  )
                })}
              </div>

              <div className="h-5 w-px bg-[#e5e7eb]" />

              {/* Status filters */}
              <div className="flex items-center gap-1">
                {(["all", "active", "inactive"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-full text-[13px] font-medium border transition-colors ${
                      statusFilter === s
                        ? s === "active"
                          ? "bg-[#22c55e] border-[#22c55e] text-white"
                          : s === "inactive"
                          ? "bg-[#6b7280] border-[#6b7280] text-white"
                          : "bg-[#10141a] border-[#10141a] text-white"
                        : "border-[#e5e7eb] text-[#6b7280] hover:border-[#cccccd]"
                    }`}
                  >
                    {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              {!loading && (
                <span className="ml-auto text-[13px] text-[#6b7280]">
                  {filtered.length} of {announcements.length}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent" />
              <p className="mt-4 text-[14px] text-[#6b7280]">Loading announcements…</p>
            </div>
          ) : error ? (
            <div className="p-6">
              <p className="text-[14px] text-[#ef4444]">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f4f6]">
                <Megaphone className="h-7 w-7 text-[#b2b2b3]" />
              </div>
              <p className="text-[14px] font-semibold text-[#10141a]">
                {announcements.length === 0 ? "No announcements yet" : "No results for current filters"}
              </p>
              <p className="mt-1 text-[13px] text-[#6b7280]">
                {announcements.length === 0
                  ? "Create one to notify family portal users"
                  : "Try changing the type or status filter"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e5e7eb]">
              {filtered.map((a) => {
                const meta     = TYPE_META[a.type] ?? TYPE_META.info
                const TypeIcon = meta.icon
                const expanded = expandedIds.has(a.id)
                const isLong   = a.body.length > 120

                return (
                  <div
                    key={a.id}
                    className={`p-4 sm:p-6 border-l-4 ${meta.left} ${!a.isActive ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-[13px] font-medium border ${meta.border} bg-transparent flex items-center gap-1.5`}>
                            <TypeIcon className="h-3.5 w-3.5" />
                            {meta.label}
                          </span>
                          {!a.isActive && (
                            <span className="px-3 py-1 rounded-full text-[13px] font-medium border border-[#6b7280] text-[#6b7280] bg-transparent">
                              Inactive
                            </span>
                          )}
                        </div>

                        <p className="text-[15px] font-semibold text-[#10141a] truncate">{a.title}</p>

                        <p className={`mt-1 text-[14px] text-[#6b7280] leading-[1.5] ${!expanded && isLong ? "line-clamp-2" : ""}`}>
                          {a.body}
                        </p>

                        {isLong && (
                          <button
                            onClick={() => toggleExpand(a.id)}
                            className="mt-1 flex items-center gap-0.5 text-[13px] font-medium text-[#00b4b8] hover:underline"
                          >
                            {expanded
                              ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                              : <><ChevronDown className="h-3.5 w-3.5" /> Read more</>}
                          </button>
                        )}

                        <p className="mt-2 text-[12px] text-[#b2b2b3]">
                          Posted {formatDate(a.createdAt)}
                          {a.expiresAt && ` · Expires ${formatDate(a.expiresAt)}`}
                          {a.createdByName && ` · by ${a.createdByName}`}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => void handleToggle(a)}
                          disabled={togglingId === a.id}
                          title={a.isActive ? "Deactivate" : "Activate"}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#10141a] transition-colors disabled:opacity-50"
                        >
                          {togglingId === a.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : a.isActive ? (
                            <ToggleRight className="h-5 w-5 text-[#00b4b8]" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(a)}
                          title="Edit"
                          className="flex h-9 w-9 items-center justify-center rounded-full text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#10141a] transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void handleDelete(a.id)}
                          disabled={deletingId === a.id}
                          title="Delete"
                          className="flex h-9 w-9 items-center justify-center rounded-full text-[#6b7280] hover:bg-[#fff0f0] hover:text-[#ef4444] transition-colors disabled:opacity-50"
                        >
                          {deletingId === a.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Form panel ── */}
        {showForm && (
          <div className="w-[380px] flex-shrink-0">
            <div className="sticky top-0 overflow-hidden bg-white shadow-sm rounded-xl sm:rounded-2xl">
              <div className="p-4 sm:p-6 border-b border-[#e5e7eb] flex items-center justify-between">
                <h2 className="text-[18px] font-bold text-[#10141a]">
                  {editingId ? "Edit Announcement" : "New Announcement"}
                </h2>
                <button
                  onClick={cancelForm}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#10141a] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={(e) => void handleSubmit(e)} className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-[#10141a]">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Holiday Closure"
                    className="w-full h-11 rounded-xl border border-[#cccccd] px-4 text-[14px] text-[#10141a] placeholder-[#b2b2b3] outline-none focus:border-[#00b4b8] focus:ring-2 focus:ring-[#00b4b8]/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-[#10141a]">Body *</label>
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    rows={4}
                    placeholder="Write your announcement here…"
                    className="w-full resize-none rounded-xl border border-[#cccccd] px-4 py-3 text-[14px] text-[#10141a] placeholder-[#b2b2b3] outline-none focus:border-[#00b4b8] focus:ring-2 focus:ring-[#00b4b8]/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-[#10141a]">Type</label>
                  <div className="flex gap-2">
                    {(["info", "warning", "urgent"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, type: t }))}
                        className={`flex-1 rounded-full py-2 text-[13px] font-medium border transition-colors ${
                          form.type === t
                            ? `${TYPE_META[t].border} bg-transparent`
                            : "border-[#e5e7eb] text-[#6b7280] hover:border-[#cccccd]"
                        }`}
                      >
                        {TYPE_META[t].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-[#10141a]">
                    Expires on <span className="font-normal text-[#b2b2b3]">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-[#cccccd] px-4 text-[14px] text-[#10141a] outline-none focus:border-[#00b4b8] focus:ring-2 focus:ring-[#00b4b8]/20 transition-colors"
                  />
                </div>

                {formError && (
                  <p className="rounded-xl bg-[#fff0f0] border border-[#fca5a5] px-4 py-2.5 text-[13px] text-[#ef4444]">
                    {formError}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="flex-1 rounded-full border border-[#cccccd] py-2.5 text-[14px] font-medium text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[#00b4b8] py-2.5 text-[14px] font-semibold text-white hover:bg-[#00a0a4] transition-colors disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingId ? "Save Changes" : "Publish"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
