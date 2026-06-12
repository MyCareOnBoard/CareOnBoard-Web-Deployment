import { useState, useEffect, useCallback } from "react"
import { Megaphone, Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight, X, AlertTriangle, Info, Siren } from "lucide-react"
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
  info: {
    label: "Info",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    border: "border-l-blue-500",
    icon: Info,
  },
  warning: {
    label: "Warning",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    border: "border-l-amber-500",
    icon: AlertTriangle,
  },
  urgent: {
    label: "Urgent",
    badge: "bg-red-50 text-red-700 border border-red-200",
    border: "border-l-red-500",
    icon: Siren,
  },
} as const

function formatDate(val: { seconds: number } | string | null): string {
  if (!val) return "—"
  const ms = typeof val === "string" ? Date.parse(val) : val.seconds * 1000
  if (isNaN(ms)) return "—"
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function AgencyAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (a: Announcement) => {
    setEditingId(a.id)
    setForm({
      title: a.title,
      body: a.body,
      type: a.type,
      expiresAt: a.expiresAt
        ? new Date(typeof a.expiresAt === "string" ? a.expiresAt : a.expiresAt.seconds * 1000)
            .toISOString()
            .slice(0, 10)
        : "",
    })
    setFormError(null)
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) {
      setFormError("Title and body are required.")
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      }
      if (editingId) {
        await axiosClient.put(`/agencyAnnouncements/announcements/${editingId}`, payload)
      } else {
        await axiosClient.post("/agencyAnnouncements/announcements", payload)
      }
      cancelForm()
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg || "Failed to save. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (a: Announcement) => {
    setTogglingId(a.id)
    try {
      await axiosClient.put(`/agencyAnnouncements/announcements/${a.id}`, { isActive: !a.isActive })
      setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, isActive: !a.isActive } : x)))
    } catch {
      // silent
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement? This cannot be undone.")) return
    setDeletingId(id)
    try {
      await axiosClient.delete(`/agencyAnnouncements/announcements/${id}`)
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    } catch {
      // silent
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex h-full gap-6">
      {/* ── Left: list ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#063E3F]/10">
              <Megaphone className="h-4.5 w-4.5 text-[#063E3F]" />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold text-slate-900">Announcements</h1>
              <p className="text-[12px] text-slate-400">Broadcast notices to all family portal users</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl bg-[#063E3F] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#0a5456]"
          >
            <Plus className="h-3.5 w-3.5" />
            New Announcement
          </button>
        </div>

        {/* List content */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-[13px] text-red-600">{error}</div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <Megaphone className="h-10 w-10 text-slate-300" />
            <p className="text-[14px] font-medium text-slate-500">No announcements yet</p>
            <p className="text-[12px] text-slate-400">Create one to notify family portal users</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => {
              const meta = TYPE_META[a.type] ?? TYPE_META.info
              const TypeIcon = meta.icon
              return (
                <div
                  key={a.id}
                  className={`flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm border-l-4 ${meta.border} ${!a.isActive ? "opacity-50" : ""}`}
                >
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                        <TypeIcon className="h-3 w-3" />
                        {meta.label}
                      </span>
                      {!a.isActive && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] font-semibold text-slate-800 truncate">{a.title}</p>
                    <p className="text-[12px] text-slate-500 line-clamp-2">{a.body}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Posted {formatDate(a.createdAt)}
                      {a.expiresAt && ` · Expires ${formatDate(a.expiresAt)}`}
                      {a.createdByName && ` · by ${a.createdByName}`}
                    </p>
                  </div>
                  <div className="flex items-start gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => void handleToggle(a)}
                      disabled={togglingId === a.id}
                      title={a.isActive ? "Deactivate" : "Activate"}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
                    >
                      {togglingId === a.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : a.isActive ? (
                        <ToggleRight className="h-4 w-4 text-[#063E3F]" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(a)}
                      title="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => void handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      title="Delete"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    >
                      {deletingId === a.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Right: form panel ── */}
      {showForm && (
        <div className="w-96 flex-shrink-0">
          <div className="sticky top-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-slate-800">
                {editingId ? "Edit Announcement" : "New Announcement"}
              </h2>
              <button
                onClick={cancelForm}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Holiday Closure"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-[#063E3F] focus:ring-1 focus:ring-[#063E3F]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Body *</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={4}
                  placeholder="Write your announcement here…"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-[#063E3F] focus:ring-1 focus:ring-[#063E3F]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Type</label>
                <div className="flex gap-2">
                  {(["info", "warning", "urgent"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex-1 rounded-xl border py-2 text-[12px] font-semibold capitalize transition-colors ${
                        form.type === t
                          ? TYPE_META[t].badge
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {TYPE_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">
                  Expires on <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#063E3F] focus:ring-1 focus:ring-[#063E3F]/20"
                />
              </div>

              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{formError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#063E3F] py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#0a5456] disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingId ? "Save Changes" : "Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
