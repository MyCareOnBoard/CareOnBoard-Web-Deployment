import { Outlet, NavLink, useNavigate } from "react-router"
import { useSelector } from "react-redux"
import { useEffect, useState } from "react"
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Megaphone,
  LogOut,
  Bell,
  HelpCircle,
  ChevronDown,
  Mic,
} from "lucide-react"
import { Routes } from "@/routes/constants"
import { UserType } from "@/utils/auth/types/user.types"
import { selectUser, selectIsAuthenticated } from "@/utils/auth/store/authSelectors"
import { useAuth } from "@/utils/auth"
import axiosClient from "@/lib/axios"

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours()
  if (h < 12) return { text: "Good morning", emoji: "🌅" }
  if (h < 17) return { text: "Good afternoon", emoji: "☀️" }
  return { text: "Good evening", emoji: "🌙" }
}

function nameInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")
}

function Avatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm"
  if (src) return <img src={src} alt={name} className={`${sz} rounded-full object-cover`} />
  return (
    <div className={`${sz} flex items-center justify-center rounded-full bg-[#00B4B8] font-semibold text-white`}>
      {nameInitials(name) || "U"}
    </div>
  )
}

interface ClientInfo {
  firstName: string
  lastName: string
  middleName?: string
  profileImage?: string
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",      to: Routes.family.dashboard      as string | null },
  { icon: CalendarDays,   label: "Schedule",        to: Routes.family.schedule       as string | null },
  { icon: MessageSquare,  label: "Messages",        to: Routes.family.messages       as string | null },
  { icon: Megaphone,      label: "Announcements",   to: Routes.family.announcements  as string | null },
] satisfies { icon: React.ComponentType<{ className?: string }>; label: string; to: string | null }[]

const BADGE_EVENT = "family_ann_badge_change"

export default function FamilyLayout() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const user = useSelector(selectUser)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [hasNewAnn, setHasNewAnn] = useState<boolean>(
    () => localStorage.getItem("family_ann_has_new") === "1"
  )

  useEffect(() => {
    const handler = (e: Event) => setHasNewAnn((e as CustomEvent<boolean>).detail)
    window.addEventListener(BADGE_EVENT, handler)
    return () => window.removeEventListener(BADGE_EVENT, handler)
  }, [])

  useEffect(() => {
    if (!isAuthenticated || user?.userType !== UserType.FAMILY_MEMBER) {
      navigate(Routes.auth.familyLogin, { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  useEffect(() => {
    if (isAuthenticated && user?.userType === UserType.FAMILY_MEMBER) {
      axiosClient
        .get<{ success: boolean; data: ClientInfo }>("/familyPortal/client")
        .then((res) => setClient(res.data.data))
        .catch(() => {})
    }
  }, [isAuthenticated, user])

  const handleLogout = async () => {
    await logout()
    navigate(Routes.auth.familyLogin, { replace: true })
  }

  if (!isAuthenticated || user?.userType !== UserType.FAMILY_MEMBER) return null

  const { text: greeting, emoji } = getGreeting()
  const firstName = user.fullName?.split(" ")[0] || "there"
  const clientFullName = client
    ? [client.firstName, client.middleName, client.lastName].filter(Boolean).join(" ")
    : null

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f4f6]">
      {/* ── Sidebar ── */}
      <aside className="flex w-64 flex-shrink-0 flex-col" style={{ backgroundColor: "#063E3F" }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 pb-3 pt-5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: "#00B4B8" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21C12 21 3 15 3 9C3 6.23858 5.23858 4 8 4C9.65685 4 11.1696 4.7835 12 6C12.8304 4.7835 14.3431 4 16 4C18.7614 4 21 6.23858 21 9C21 15 12 21 12 21Z"
                fill="white"
              />
            </svg>
          </div>
          <span className="text-[13px] font-semibold text-white">CareOnBoard</span>
        </div>

        {/* Client chip */}
        <div className="mx-4 mb-4 mt-1">
          <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-widest text-white/40">
            Family care for
          </p>
          <div
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
          >
            <Avatar
              name={clientFullName || "Client"}
              src={client?.profileImage}
            />
            <p className="flex-1 truncate text-[13px] font-semibold text-white">
              {clientFullName ?? "Loading…"}
            </p>
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-white/40" />
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ icon: Icon, label, to }) =>
            to ? (
              <NavLink
                key={label}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <div className="relative flex-shrink-0">
                  <Icon className="h-4 w-4" />
                  {label === "Announcements" && hasNewAnn && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-400 ring-1 ring-[#063E3F]" />
                  )}
                </div>
                {label}
              </NavLink>
            ) : (
              <div
                key={label}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/30"
                title="Coming soon"
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
                <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/40">
                  Soon
                </span>
              </div>
            )
          )}
        </nav>

        {/* Bottom */}
        <div className="mt-auto px-4 pb-6 pt-4">
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00B4B8]/20">
                <Mic className="h-3.5 w-3.5 text-[#00B4B8]" />
              </div>
              <p className="text-[12px] font-semibold text-white/80">Need help?</p>
            </div>
            <p className="mb-1 text-[11px] text-white/40">Contact the agency</p>
            <button
              type="button"
              className="mt-2 w-full rounded-lg py-2 text-[12px] font-semibold text-white transition-colors"
              style={{ backgroundColor: "#00B4B8" }}
            >
              Contact us
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-white/60"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div>
            <p className="text-[15px] font-semibold text-slate-900">
              {greeting}, {firstName}. {emoji}
            </p>
            {clientFullName && (
              <p className="text-[12px] text-slate-400">
                Here's what's happening with{" "}
                <span className="font-semibold text-slate-600">{client?.firstName}</span> today.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600"
            >
              <Bell className="h-4 w-4" />
              <span
                className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white"
                style={{ backgroundColor: "#00B4B8" }}
              />
            </button>
            <div className="flex items-center gap-2">
              <Avatar name={user.fullName || "U"} size="sm" />
              <span className="text-[13px] font-medium text-slate-700">{user.fullName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Scrollable page area */}
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
