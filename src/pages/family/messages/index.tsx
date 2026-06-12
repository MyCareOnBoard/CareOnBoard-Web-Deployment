import { useEffect, useRef, useState } from "react"
import { Search, MoreHorizontal, Send, HelpCircle, Loader2, Pencil, ArrowLeft, Phone, Trash2 } from "lucide-react"
import { useSearchParams } from "react-router"
import axiosClient from "@/lib/axios"
import { useSelector } from "react-redux"
import { selectUser } from "@/utils/auth/store/authSelectors"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
  uid: string
  fullName: string
  role: string
  imageUrl: string | null
}

interface Contact {
  uid: string
  fullName: string
  role: string
  imageUrl: string | null
}

interface Conversation {
  id: string
  other: Participant | null
  participants: Participant[]
  lastMessage: string | null
  lastMessageAt: { _seconds: number } | string | null
  unreadCount: number
}

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  senderAvatar: string | null
  isOwnMessage: boolean
  createdAt: { _seconds: number } | string | null
  sender: Participant
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nameInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  )
}

function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string
  src?: string | null
  size?: "sm" | "md" | "lg"
}) {
  const sz =
    size === "sm"
      ? "h-8 w-8 text-xs"
      : size === "lg"
        ? "h-11 w-11 text-base"
        : "h-10 w-10 text-sm"
  if (src) return <img src={src} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  return (
    <div
      className={`${sz} flex flex-shrink-0 items-center justify-center rounded-full bg-[#00B4B8] font-semibold text-white`}
    >
      {nameInitials(name)}
    </div>
  )
}

function tsToDate(ts: { _seconds: number } | string | null): Date | null {
  if (!ts) return null
  if (typeof ts === "string") return new Date(ts)
  if ("_seconds" in ts) return new Date(ts._seconds * 1000)
  return null
}

function fmtTime(ts: { _seconds: number } | string | null): string {
  const d = tsToDate(ts)
  if (!d) return ""
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function isToday(d: Date): boolean {
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function groupByDay(messages: Message[]): Array<{ label: string; date: string; items: Message[] }> {
  const groups: { label: string; date: string; items: Message[] }[] = []
  for (const msg of messages) {
    const d = tsToDate(msg.createdAt)
    const label = d
      ? isToday(d)
        ? "Today"
        : d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })
      : "Unknown"
    const dateKey = d ? d.toDateString() : "unknown"
    const last = groups[groups.length - 1]
    if (last && last.date === dateKey) {
      last.items.push(msg)
    } else {
      groups.push({ label, date: dateKey, items: [msg] })
    }
  }
  return groups
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FamilyMessagesPage() {
  const user = useSelector(selectUser)
  const [searchParams] = useSearchParams()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [search, setSearch] = useState("")

  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)

  // Contacts (new conversation) panel
  const [showContacts, setShowContacts] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contactSearch, setContactSearch] = useState("")
  const [starting, setStarting] = useState<string | null>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── Fetch conversations ────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingConvs(true)
    axiosClient
      .get<{ success: boolean; data: Conversation[] }>("/familyPortal/messages")
      .then((res) => setConversations(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingConvs(false))
  }, [])

  // ── Auto-open conversation from ?contactId URL param ──────────────────────
  useEffect(() => {
    const contactId = searchParams.get("contactId")
    if (!contactId) return
    let cancelled = false
    async function openConv() {
      try {
        const res = await axiosClient.post<{ success: boolean; data: Conversation }>(
          "/familyPortal/messages",
          { participantId: contactId }
        )
        if (cancelled) return
        const conv = res.data.data
        setConversations((prev) =>
          prev.find((c) => c.id === conv.id) ? prev : [conv, ...prev]
        )
        setActiveConvId(conv.id)
      } catch {}
    }
    void openConv()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch contacts for new-message panel ──────────────────────────────────
  const openContactsPanel = async () => {
    setShowContacts(true)
    if (contacts.length > 0) return
    setLoadingContacts(true)
    try {
      const res = await axiosClient.get<{ success: boolean; data: Contact[] }>(
        "/familyPortal/messages/contacts"
      )
      setContacts(res.data.data || [])
    } catch {}
    setLoadingContacts(false)
  }

  // ── Start or reuse a conversation with a contact ──────────────────────────
  const startConversation = async (contactId: string) => {
    if (starting) return
    setStarting(contactId)
    try {
      const res = await axiosClient.post<{ success: boolean; data: Conversation }>(
        "/familyPortal/messages",
        { participantId: contactId }
      )
      const conv = res.data.data
      setConversations((prev) =>
        prev.find((c) => c.id === conv.id) ? prev : [conv, ...prev]
      )
      setActiveConvId(conv.id)
      setShowContacts(false)
      setContactSearch("")
    } catch {}
    setStarting(null)
  }

  // ── Fetch messages when active conversation changes ────────────────────────
  useEffect(() => {
    if (!activeConvId) return
    setLoadingMsgs(true)
    axiosClient
      .get<{ success: boolean; data: Message[] }>(`/familyPortal/messages/${activeConvId}`)
      .then((res) => {
        setMessages(res.data.data || [])
        const unread = (res.data.data || [])
          .filter((m) => !m.isOwnMessage)
          .map((m) => m.id)
        if (unread.length > 0) {
          void axiosClient.post(`/familyPortal/messages/${activeConvId}/read`, {
            messageIds: unread,
          })
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConvId ? { ...c, unreadCount: 0 } : c))
          )
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false))
  }, [activeConvId])

  // ── Close menu when clicking outside ─────────────────────────────────────
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [menuOpen])

  // ── Delete conversation ────────────────────────────────────────────────────
  const handleDeleteConversation = async () => {
    if (!activeConvId || deleting) return
    setMenuOpen(false)
    setDeleting(true)
    try {
      await axiosClient.delete(`/familyPortal/messages/${activeConvId}`)
      setConversations((prev) => prev.filter((c) => c.id !== activeConvId))
      setActiveConvId(null)
      setMessages([])
    } catch {
      // conversation removed optimistically even if backend call fails
      setConversations((prev) => prev.filter((c) => c.id !== activeConvId))
      setActiveConvId(null)
      setMessages([])
    } finally {
      setDeleting(false)
    }
  }

  // ── Scroll to bottom when new messages arrive ──────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    const content = draft.trim()
    if (!content || !activeConvId || sending) return
    setSending(true)
    setDraft("")

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      content,
      senderId: user?.uid || "",
      senderName: user?.fullName || "",
      senderAvatar: null,
      isOwnMessage: true,
      createdAt: new Date().toISOString(),
      sender: {
        uid: user?.uid || "",
        fullName: user?.fullName || "",
        role: "family_member",
        imageUrl: null,
      },
    }
    setMessages((prev) => [...prev, optimistic])
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? { ...c, lastMessage: content, lastMessageAt: new Date().toISOString() }
          : c
      )
    )

    try {
      const res = await axiosClient.post<{ success: boolean; data: Message }>(
        `/familyPortal/messages/${activeConvId}`,
        { content }
      )
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...res.data.data, isOwnMessage: true } : m))
      )
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setDraft(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredConvs = conversations.filter((c) => {
    if (!search) return true
    return c.other?.fullName.toLowerCase().includes(search.toLowerCase())
  })

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch) return true
    return c.fullName.toLowerCase().includes(contactSearch.toLowerCase())
  })

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null
  const activeOther = activeConv?.other ?? null
  const messageGroups = groupByDay(messages)

  return (
    <div className="flex h-full overflow-hidden rounded-2xl bg-white shadow-sm" style={{ minHeight: 0 }}>
      {/* ── Left panel: conversation list / contacts ── */}
      <div className="flex w-[340px] flex-shrink-0 flex-col border-r border-slate-100">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          {showContacts ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setShowContacts(false); setContactSearch("") }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-[16px] font-bold text-slate-900">New message</span>
            </div>
          ) : (
            <>
              <h1 className="text-[18px] font-bold text-slate-900">Messages</h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void openContactsPanel()}
                  title="New message"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-slate-600"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  Help
                </button>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <input
              type="text"
              placeholder={showContacts ? "Search care team" : "Search here"}
              value={showContacts ? contactSearch : search}
              onChange={(e) =>
                showContacts ? setContactSearch(e.target.value) : setSearch(e.target.value)
              }
              className="flex-1 bg-transparent text-[13px] text-slate-700 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {showContacts ? (
            /* ── Contacts panel ── */
            loadingContacts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-slate-400">
                {contacts.length === 0 ? "No care team members found" : "No matches"}
              </p>
            ) : (
              filteredContacts.map((contact) => (
                <button
                  key={contact.uid}
                  type="button"
                  onClick={() => void startConversation(contact.uid)}
                  disabled={starting === contact.uid}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  <Avatar name={contact.fullName} src={contact.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-slate-800">{contact.fullName}</p>
                    <p className="text-[12px] capitalize text-slate-400">
                      {contact.role?.replace(/_/g, " ") || "Care team"}
                    </p>
                  </div>
                  {starting === contact.uid && (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-slate-300" />
                  )}
                </button>
              ))
            )
          ) : (
            /* ── Conversations panel ── */
            loadingConvs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-8 text-center">
                <p className="text-[13px] text-slate-400">No conversations yet</p>
                <button
                  type="button"
                  onClick={() => void openContactsPanel()}
                  className="mt-3 text-[13px] font-medium text-[#00B4B8] hover:underline"
                >
                  Start a conversation
                </button>
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const other = conv.other
                const isActive = conv.id === activeConvId
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveConvId(conv.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isActive ? "bg-slate-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <Avatar name={other?.fullName || "?"} src={other?.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[13px] ${
                            conv.unreadCount > 0
                              ? "font-bold text-slate-900"
                              : "font-medium text-slate-700"
                          }`}
                        >
                          {other?.fullName || "Unknown"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {fmtTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p
                          className="truncate text-[12px] text-slate-400"
                          style={{ maxWidth: 160 }}
                        >
                          {conv.lastMessage || "No messages yet"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span
                            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: "#00B4B8" }}
                          >
                            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )
          )}
        </div>
      </div>

      {/* ── Right panel: chat thread ── */}
      {activeConvId && activeOther ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Chat header */}
          <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-3">
            <Avatar name={activeOther.fullName} src={activeOther.imageUrl} size="lg" />
            <div className="flex-1">
              <p className="text-[14px] font-bold text-slate-900">{activeOther.fullName}</p>
              <p className="text-[12px] capitalize text-slate-400">
                {activeOther.role?.replace(/_/g, " ") || "Caregiver"}
              </p>
            </div>
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-10 z-30 min-w-[160px] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Phone className="h-4 w-4 text-slate-400" />
                    Call
                  </button>
                  <div className="mx-4 h-px bg-slate-100" />
                  <button
                    type="button"
                    onClick={() => void handleDeleteConversation()}
                    disabled={deleting}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <p className="text-[13px]">No messages yet. Say hello!</p>
              </div>
            ) : (
              messageGroups.map((group) => (
                <div key={group.date}>
                  <div className="my-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                      {group.label}
                    </span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>

                  {group.items.map((msg) =>
                    msg.isOwnMessage ? (
                      <div key={msg.id} className="mb-4 flex flex-col items-end">
                        <div className="flex items-end gap-2">
                          <div
                            className="max-w-[340px] rounded-2xl rounded-br-sm px-4 py-2.5 text-[13px] font-medium text-white"
                            style={{ backgroundColor: "#00B4B8" }}
                          >
                            {msg.content}
                          </div>
                          <Avatar name={user?.fullName || "Me"} src={null} size="sm" />
                        </div>
                        <p className="mt-1 pr-10 text-[11px] text-slate-400">
                          {msg.id.startsWith("optimistic") ? "Sending…" : `Sent. ${fmtTime(msg.createdAt)}`}
                        </p>
                      </div>
                    ) : (
                      <div key={msg.id} className="mb-4 flex items-end gap-2">
                        <Avatar name={msg.sender.fullName} src={msg.sender.imageUrl} size="sm" />
                        <div>
                          <div className="max-w-[340px] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-[13px] text-slate-800">
                            {msg.content}
                          </div>
                          <p className="mt-1 pl-1 text-[11px] text-slate-400">
                            {fmtTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 border-t border-slate-100 px-4 py-3">
            <div className="flex items-end gap-2 rounded-2xl bg-slate-100 px-4 py-2.5">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message here"
                className="flex-1 resize-none bg-transparent text-[13px] text-slate-700 placeholder-slate-400 outline-none"
                style={{ maxHeight: 120, overflowY: "auto" }}
              />
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 12h2M6 8v8M10 5v14M14 8v8M18 10v4M22 12h-2" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" />
                    <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" strokeWidth="3" />
                    <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" strokeWidth="3" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!draft.trim() || sending}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "#00B4B8" }}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-slate-300">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(0,180,184,0.1)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00B4B8" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-[14px] font-medium text-slate-400">Select a conversation</p>
          <p className="mt-1 text-[12px] text-slate-300">
            {conversations.length === 0 && !loadingConvs
              ? "No conversations yet"
              : "Choose one from the left to start chatting"}
          </p>
          {conversations.length === 0 && !loadingConvs && (
            <button
              type="button"
              onClick={() => void openContactsPanel()}
              className="mt-4 rounded-xl px-5 py-2 text-[13px] font-semibold text-white"
              style={{ backgroundColor: "#00B4B8" }}
            >
              Message a care team member
            </button>
          )}
        </div>
      )}
    </div>
  )
}
