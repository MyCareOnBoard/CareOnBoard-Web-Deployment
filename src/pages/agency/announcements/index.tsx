import { useCallback, useEffect, useState, type FormEvent } from "react"
import { CalendarDays, Ellipsis, Loader2, Megaphone, Pause, Pencil, Play, Plus, Search, Trash2, Users } from "lucide-react"
import { toast } from "sonner"
import axiosClient from "@/lib/axios"
import { cn } from "@/lib/utils"
import { useAuth } from "@/utils/auth"
import { staffLabels } from "@/lib/roleLabel"
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode"
import { AgencyPageHeader } from "@/components/agency/AgencyShell"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toDate, type ApiDate } from "@/pages/userPanel/announcements/announcementList"

type AnnouncementType = "info" | "warning" | "urgent"
type TargetUserType = "employee" | "applicant" | "family_member" | "agency_staff"

interface Announcement {
  id: string
  title: string
  body: string
  type: AnnouncementType
  isActive: boolean
  createdByName: string
  createdAt: ApiDate
  expiresAt: ApiDate
  targetUserTypes?: TargetUserType[]
}

interface FormState {
  title: string
  body: string
  type: AnnouncementType
  expiresAt: string
  targetUserTypes: TargetUserType[]
}

const EMPTY_FORM: FormState = { title: "", body: "", type: "info", expiresAt: "", targetUserTypes: [] }
const ENDPOINT = "/agencyAnnouncements/announcements"

type Status = "active" | "paused" | "expired"
type StatusFilter = Status | "all"
type TypeFilter = "all" | AnnouncementType

const TYPE_META: Record<AnnouncementType, { label: string; pill: string; dot: string }> = {
  info: { label: "Info", pill: "bg-[#eef0f2] text-[#2a3138] dark:bg-white/10 dark:text-[#c9d1d4]", dot: "bg-[#4b535b] dark:bg-[#9aa4a8]" },
  warning: { label: "Warning", pill: "bg-[#fcf5dc] text-[#7a5800] dark:bg-[#e0b400]/15 dark:text-[#f0cf6b]", dot: "bg-[#e0b400]" },
  urgent: { label: "Urgent", pill: "bg-[#fde8e6] text-[#b42318] dark:bg-[#ef4444]/15 dark:text-[#f8a1a1]", dot: "bg-[#e5484d]" },
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  active: "Active", paused: "Paused", expired: "Expired", all: "All",
}

const typeOf = (a: Announcement): AnnouncementType => (a.type === "warning" || a.type === "urgent" ? a.type : "info")

/** Past its end date counts as expired whether or not it was paused. */
function statusOf(a: Announcement, now: number): Status {
  const expires = toDate(a.expiresAt)
  if (expires && expires.getTime() <= now) return "expired"
  return a.isActive ? "active" : "paused"
}

/** "19 Dec", with the year only when it is not this year. */
function shortDate(date: Date) {
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) })
}
/** The local calendar day ("2026-12-19") for a date input. */
const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
/** "Active until 19 Dec" means through the end of that day, in the poster's time zone. */
const endOfDay = (day: string) => new Date(`${day}T23:59:59.999`).toISOString()

const LONG_BODY = 160

const segment = "inline-flex h-9 cursor-pointer items-center gap-2 rounded-[9px] px-3 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679]"
const segmentOn = "bg-white font-medium text-[#10141a] shadow-[0_1px_2px_rgba(16,20,26,0.08)] dark:bg-[#1b232b] dark:text-[#f4f6f7]"
const segmentOff = "text-[#4b535b] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]"
const fieldClass = "w-full rounded-[10px] border border-[#dcdfe2] bg-white px-3.5 text-[14px] text-[#10141a] placeholder:text-[#9aa1a7] outline-none transition-colors focus:border-[#007679] focus:ring-2 focus:ring-[#007679]/15 dark:border-white/15 dark:bg-[#151c22] dark:text-[#f4f6f7]"
const menuItem = "flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[14px] text-[#10141a] dark:text-[#f4f6f7]"
const primaryButton = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#003839] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#0b4c4d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0f7e7d] dark:hover:bg-[#13908f]"
const outlineButton = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#dcdfe2] bg-white px-4 text-[14px] font-semibold text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:opacity-60 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5"

export default function AgencyAnnouncementsPage() {
  const { user } = useAuth()
  const mode = useEffectiveAgencyMode()
  const staff = staffLabels(mode ? [mode] : user?.agency?.supportedClientTypes)

  /** Who can see an announcement; lower case so they read naturally when joined. */
  const audienceNames: Record<TargetUserType, string> = {
    employee: staff.nounPlural,
    applicant: "applicants",
    family_member: "families",
    agency_staff: "agency staff",
  }
  const audienceOptions: { value: TargetUserType; label: string }[] = [
    { value: "employee", label: staff.nounPlural },
    { value: "agency_staff", label: "Agency staff" },
    { value: "applicant", label: "Applicants" },
    { value: "family_member", label: "Families" },
  ]
  const audienceOf = (targets?: TargetUserType[]) => {
    const list = [...new Set(targets ?? [])]
    if (!list.length || list.length === audienceOptions.length) return "Everyone"
    const names = audienceOptions.filter((option) => list.includes(option.value)).map((option) => audienceNames[option.value])
    const text = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0]
    return text.charAt(0).toUpperCase() + text.slice(1)
  }

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [search, setSearch] = useState("")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axiosClient.get<{ success: boolean; data: Announcement[] }>(ENDPOINT)
      setAnnouncements(res.data.data || [])
    } catch {
      setError("Announcements could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Worked out on every render (the list is short), so an announcement moves to Expired once its date passes.
  const now = Date.now()
  const withStatus = announcements.map((a) => ({ a, status: statusOf(a, now) }))
  const counts: Record<StatusFilter, number> = { active: 0, paused: 0, expired: 0, all: withStatus.length }
  for (const { status } of withStatus) counts[status] += 1

  // Paused only shows when something is paused (or it is the tab in use).
  const statusTabs = (["active", "paused", "expired", "all"] as const).filter((status) =>
    status !== "paused" || counts.paused > 0 || statusFilter === "paused")

  const query = search.trim().toLowerCase()
  const visible = withStatus.filter(({ a, status }) =>
    (statusFilter === "all" || status === statusFilter)
    && (typeFilter === "all" || typeOf(a) === typeFilter)
    && (!query || [a.title, a.body, a.createdByName].some((text) => text?.toLowerCase().includes(query))))

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setFormError(null); setShowForm(true) }

  const openEdit = (a: Announcement) => {
    const expires = toDate(a.expiresAt)
    setEditingId(a.id)
    setForm({
      title: a.title,
      body: a.body,
      type: typeOf(a),
      expiresAt: expires ? localDay(expires) : "",
      targetUserTypes: a.targetUserTypes || [],
    })
    setFormError(null)
    setShowForm(true)
  }

  const closeForm = () => { if (!submitting) setShowForm(false) }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) { setFormError("Add a title and a message."); return }
    setSubmitting(true)
    setFormError(null)
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      type: form.type,
      expiresAt: form.expiresAt ? endOfDay(form.expiresAt) : null,
      targetUserTypes: form.targetUserTypes,
    }
    try {
      if (editingId) {
        await axiosClient.put(`${ENDPOINT}/${editingId}`, payload)
        setAnnouncements((prev) => prev.map((a) => (a.id === editingId ? { ...a, ...payload } : a)))
        toast.success("Announcement updated.")
      } else {
        const res = await axiosClient.post<{ success: boolean; data: Announcement }>(ENDPOINT, payload)
        setAnnouncements((prev) => [res.data.data, ...prev])
        toast.success("Announcement published.")
      }
      setShowForm(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg || "The announcement could not be saved. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (a: Announcement) => {
    setTogglingId(a.id)
    const next = !a.isActive
    setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, isActive: next } : x)))
    try {
      await axiosClient.put(`${ENDPOINT}/${a.id}`, { isActive: next })
      toast.success(next ? "Announcement resumed." : "Announcement paused. It no longer shows in the app header.")
    } catch {
      setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, isActive: a.isActive } : x)))
      toast.error(`The announcement could not be ${next ? "resumed" : "paused"}. Try again.`)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleting(true)
    try {
      await axiosClient.delete(`${ENDPOINT}/${target.id}`)
      setAnnouncements((prev) => prev.filter((a) => a.id !== target.id))
      setDeleteTarget(null)
      toast.success("Announcement deleted.")
    } catch {
      toast.error("The announcement could not be deleted. Try again.")
    } finally {
      setDeleting(false)
    }
  }

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })

  const filtersOn = typeFilter !== "all" || !!query
  const clearFilters = () => { setTypeFilter("all"); setSearch("") }

  return (
    <div className="pb-6">
      <AgencyPageHeader
        icon={Megaphone}
        title="Announcements"
        description={`News for ${staff.nounPlural} and staff. Active announcements show in the app header until they expire.`}
        actions={(
          <button type="button" onClick={openCreate} className={primaryButton}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            New announcement
          </button>
        )}
      />

      {/* Status, type and search */}
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Status" className="flex max-w-full overflow-x-auto rounded-[12px] bg-[#f4f5f6] p-1 dark:bg-white/5">
            {statusTabs.map((status) => {
              const on = statusFilter === status
              return (
                <button key={status} type="button" aria-pressed={on} onClick={() => setStatusFilter(status)} className={cn(segment, "shrink-0", on ? segmentOn : segmentOff)}>
                  {STATUS_LABELS[status]}
                  {!loading && (
                    <span className={cn(
                      "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[12px] font-medium tabular-nums",
                      on ? "bg-[#0f7e7d] text-white" : "bg-[#e4e7ea] text-[#4b535b] dark:bg-white/10 dark:text-[#c9d1d4]",
                    )}>
                      {counts[status]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div role="group" aria-label="Type" className="flex max-w-full overflow-x-auto rounded-[12px] bg-[#f4f5f6] p-1 dark:bg-white/5">
            {(["all", "info", "warning", "urgent"] as const).map((type) => {
              const on = typeFilter === type
              return (
                <button key={type} type="button" aria-pressed={on} onClick={() => setTypeFilter(type)} className={cn(segment, "shrink-0", on ? segmentOn : segmentOff)}>
                  {type === "all" ? "All types" : TYPE_META[type].label}
                </button>
              )
            })}
          </div>
        </div>
        <label className="relative lg:ml-auto lg:w-[220px]">
          <span className="sr-only">Search announcements</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b737a]" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className={cn(fieldClass, "h-10 pl-10")} />
        </label>
      </div>

      {/* List */}
      <div className="mt-5" aria-busy={loading}>
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} aria-hidden="true" className="h-[180px] animate-pulse rounded-[14px] border border-[#e4e7ea] bg-[#f8f9fa] dark:border-white/10 dark:bg-white/5" />
            ))}
            <span className="sr-only" role="status">Loading announcements</span>
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#f5c2bd] bg-[#fdf3f2] px-5 py-4 text-[14px] text-[#b42318] dark:border-[#ef4444]/30 dark:bg-[#ef4444]/10 dark:text-[#f8a1a1]">
            {error}
            <button type="button" onClick={() => void load()} className={outlineButton}>Try again</button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center rounded-[14px] border border-dashed border-[#dcdfe2] px-6 py-14 text-center dark:border-white/15">
            <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-[#eef0f2] text-[#4b535b] dark:bg-white/10 dark:text-[#9aa4a8]">
              <Megaphone className="h-6 w-6" />
            </span>
            <p className="mt-4 text-[16px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
              {announcements.length === 0 ? "No announcements yet"
                : filtersOn ? "No announcements match"
                  : statusFilter === "all" ? "No announcements" : `No ${STATUS_LABELS[statusFilter].toLowerCase()} announcements`}
            </p>
            <p className="mt-1 max-w-[360px] text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
              {announcements.length === 0 ? `Post news for ${staff.nounPlural}, staff, applicants or families. Active announcements show in their app header.`
                : filtersOn ? "Try another type or search."
                  : "Announcements with this status will appear here."}
            </p>
            {announcements.length === 0 ? (
              <button type="button" onClick={openCreate} className={cn(primaryButton, "mt-5")}>
                <Plus aria-hidden="true" className="h-4 w-4" />New announcement
              </button>
            ) : filtersOn && (
              <button type="button" onClick={clearFilters} className={cn(outlineButton, "mt-5")}>Clear filters</button>
            )}
          </div>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {visible.map(({ a, status }) => {
              const meta = TYPE_META[typeOf(a)]
              const expires = toDate(a.expiresAt)
              const posted = toDate(a.createdAt)
              const isLong = a.body.length > LONG_BODY
              const expanded = expandedIds.has(a.id)
              const when = status === "expired" ? `Expired ${expires ? shortDate(expires) : ""}`
                : status === "paused" ? (expires ? `Paused · would end ${shortDate(expires)}` : "Paused")
                  : expires ? `Active until ${shortDate(expires)}` : "Active, no end date"
              const by = [posted && `Posted ${shortDate(posted)}`, a.createdByName && `by ${a.createdByName}`].filter(Boolean).join(" ")

              return (
                <li key={a.id} className="flex flex-col rounded-[14px] border border-[#e4e7ea] bg-white px-5 pb-4 pt-5 dark:border-white/10 dark:bg-[#1b232b]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-[6px] px-2 text-[12px] font-medium", meta.pill)}>
                        <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />{meta.label}
                      </span>
                      <span className="inline-flex h-6 min-w-0 items-center gap-1.5 rounded-[6px] border border-[#e4e7ea] px-2 text-[12px] text-[#4b535b] dark:border-white/15 dark:text-[#c9d1d4]">
                        <Users aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                        <span className="sr-only">Visible to </span><span className="truncate">{audienceOf(a.targetUserTypes)}</span>
                      </span>
                      {status === "paused" && (
                        <span className="inline-flex h-6 items-center rounded-[6px] bg-[#eef0f2] px-2 text-[12px] font-medium text-[#4b535b] dark:bg-white/10 dark:text-[#c9d1d4]">Paused</span>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" aria-label={`Actions for ${a.title}`} disabled={togglingId === a.id}
                          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-[#e4e7ea] text-[#4b535b] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:opacity-60 dark:border-white/15 dark:text-[#c9d1d4] dark:hover:bg-white/5">
                          {togglingId === a.id ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Ellipsis aria-hidden="true" className="h-4 w-4" />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={6} className="z-[70] w-[200px] rounded-[12px] border-[#e4e7ea] bg-white p-1.5 dark:border-white/10 dark:bg-[#1b232b]">
                        <DropdownMenuItem className={menuItem} onSelect={() => openEdit(a)}>
                          <Pencil aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />
                          {status === "expired" ? "Edit or extend" : "Edit"}
                        </DropdownMenuItem>
                        {status !== "expired" && (
                          <DropdownMenuItem className={menuItem} onSelect={() => void handleToggle(a)}>
                            {a.isActive
                              ? <><Pause aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />Pause</>
                              : <><Play aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />Resume</>}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className={cn(menuItem, "text-[#b42318] dark:text-[#f8a1a1]")} onSelect={() => setDeleteTarget(a)}>
                          <Trash2 aria-hidden="true" className="h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h2 className={cn("mt-4 break-words text-[20px] font-medium leading-snug text-[#10141a] dark:text-[#f4f6f7]", status === "paused" && "text-[#4b535b] dark:text-[#9aa4a8]")}>
                    {a.title}
                  </h2>
                  <p className={cn("mt-2 whitespace-pre-line break-words text-[14px] leading-6 text-[#4b535b] dark:text-[#9aa4a8]", isLong && !expanded && "line-clamp-3")}>
                    {a.body}
                  </p>
                  {isLong && (
                    <button type="button" onClick={() => toggleExpand(a.id)} aria-expanded={expanded}
                      className="mt-1 self-start rounded text-[13px] font-semibold text-[#007679] underline underline-offset-4 hover:text-[#005c5e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:text-[#7fd3d3]">
                      {expanded ? "Show less" : "Read more"}
                    </button>
                  )}

                  <div className="mt-auto pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[#eceef0] pt-3 text-[13px] dark:border-white/10">
                      <span className="inline-flex items-center gap-2 text-[#4b535b] dark:text-[#9aa4a8]">
                        <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />{when}
                      </span>
                      {by && <span className="text-[#6b737a] dark:text-[#9aa4a8]">{by}</span>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* New / edit */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm() }}>
        <DialogContent showCloseButton={false} className="w-[calc(100vw-32px)] max-w-[520px] gap-0 rounded-[16px] p-0">
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="border-b border-[#eceef0] px-6 py-5 dark:border-white/10">
              <DialogTitle className="text-[20px] font-semibold leading-tight">{editingId ? "Edit announcement" : "New announcement"}</DialogTitle>
              <DialogDescription className="mt-1 text-[14px] leading-normal text-[#4b535b]">
                Active announcements show in the app header for the people you choose.
              </DialogDescription>
            </div>
            <div className="max-h-[calc(100vh-240px)] space-y-4 overflow-y-auto px-6 py-5">
              <div>
                <label htmlFor="announcement-title" className="mb-1.5 block text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">Title</label>
                <input id="announcement-title" type="text" required value={form.title} maxLength={120}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="For example: December holiday party" className={cn(fieldClass, "h-11")} />
              </div>
              <div>
                <label htmlFor="announcement-body" className="mb-1.5 block text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">Message</label>
                <textarea id="announcement-body" required rows={4} value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="What should people know?" className={cn(fieldClass, "resize-y py-2.5")} />
              </div>
              <fieldset>
                <legend className="mb-1.5 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">Type</legend>
                <div className="flex rounded-[12px] bg-[#f4f5f6] p-1 dark:bg-white/5">
                  {(["info", "warning", "urgent"] as const).map((type) => {
                    const on = form.type === type
                    return (
                      <button key={type} type="button" aria-pressed={on} onClick={() => setForm((f) => ({ ...f, type }))}
                        className={cn(segment, "flex-1 justify-center", on ? segmentOn : segmentOff)}>
                        <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", TYPE_META[type].dot)} />{TYPE_META[type].label}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1.5 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
                  Visible to <span className="font-normal text-[#6b737a] dark:text-[#9aa4a8]">(leave empty for everyone)</span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {audienceOptions.map(({ value, label }) => {
                    const checked = form.targetUserTypes.includes(value)
                    return (
                      <label key={value} className={cn(
                        "flex cursor-pointer select-none items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-[14px] transition-colors",
                        checked ? "border-[#007679] bg-[#007679]/5 text-[#10141a] dark:text-[#f4f6f7]" : "border-[#dcdfe2] text-[#2a3138] hover:bg-[#f8f9fa] dark:border-white/15 dark:text-[#c9d1d4] dark:hover:bg-white/5",
                      )}>
                        <input type="checkbox" checked={checked} className="h-4 w-4 accent-[#007679]"
                          onChange={() => setForm((f) => ({
                            ...f,
                            targetUserTypes: checked ? f.targetUserTypes.filter((t) => t !== value) : [...f.targetUserTypes, value],
                          }))} />
                        {label}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
              <div>
                <label htmlFor="announcement-expires" className="mb-1.5 block text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
                  Active until <span className="font-normal text-[#6b737a] dark:text-[#9aa4a8]">(optional)</span>
                </label>
                <input id="announcement-expires" type="date" value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className={cn(fieldClass, "h-11")} />
              </div>
              {formError && (
                <p role="alert" className="rounded-[10px] border border-[#f5c2bd] bg-[#fdf3f2] px-3.5 py-2.5 text-[13px] text-[#b42318] dark:border-[#ef4444]/30 dark:bg-[#ef4444]/10 dark:text-[#f8a1a1]">
                  {formError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2.5 border-t border-[#eceef0] px-6 py-4 dark:border-white/10">
              <button type="button" onClick={closeForm} disabled={submitting} className={outlineButton}>Cancel</button>
              <button type="submit" disabled={submitting} className={primaryButton}>
                {submitting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {editingId ? "Save changes" : "Publish"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null) }}>
        <ConfirmDialogContent
          title="Delete announcement?"
          description={deleteTarget ? `"${deleteTarget.title}" will be removed for everyone. This cannot be undone.` : undefined}
          confirmText="Delete"
          loadingText="Deleting…"
          isLoading={deleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      </ConfirmDialog>
    </div>
  )
}
