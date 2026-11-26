import { createContext, useContext, useState, type ReactNode } from "react";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { DashboardHeaderFrame, HeaderActionButton, UserAvatar } from "@/components/DashboardHeader";
import DashboardSidebar, { type NavItem } from "@/components/DashboardSidebar";
import { AgencyTopBarDate, agencySidebarLogo } from "@/components/agency/AgencyShell";
import { AgencyAnnouncementPill } from "@/components/agency/AgencyTopBarTools";
import { initialsOf } from "@/components/agency/AgencyListKit";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { ArrowLeft, Bell, CheckSquare, ChevronDown, FileBarChart, LayoutDashboard, LogOut, RotateCcw, Settings, Users } from "lucide-react";
import { useAuth } from "@/utils/auth/context/AuthContext";
import { UserType } from "@/utils/auth/types/user.types";
import { Routes } from "@/routes/constants";
import {
  agencyCareApi,
  type CareMe,
  type CareOrganization,
} from "@/lib/api/agencyCare";
import { useScopedRequest } from "./hooks";
import { CareButton as Button, CareFailure, CareLoad, careLabel } from "./ui";
import { CareNotificationButton, CareNotificationProvider, useCareUnreadCount } from "./CareNotifications";
import "./agency-care.css";

type CareContext = {
  uid: string;
  me: CareMe;
  organization: CareOrganization;
  agencyKey: string;
  scope: string;
  refreshContext: () => void;
};
const Context = createContext<CareContext | null>(null);
export function useAgencyCare() {
  const value = useContext(Context);
  if (!value) throw new Error("Agency Care context is required.");
  return value;
}
export function AgencyCareLayout({
  children,
  embedded = false,
}: {
  children?: ReactNode;
  embedded?: boolean;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed] = useSidebarCollapsed();
  const [search] = useSearchParams();
  const uid = user?.uid ?? "";
  const me = useScopedRequest(
    uid,
    (signal) => agencyCareApi.me({ signal }),
    Boolean(uid),
  );
  const [selected, setSelected] = useState(() => search.get("agencyKey") || "");
  const organization =
    me.data?.organizations.find((item) => item.agencyKey === selected) ??
    me.data?.organizations[0];
  const scope = organization ? `${uid}|${organization.agencyKey}|${me.data?.permissionRevision}` : "";
  const userRole = organization ? careLabel(organization.role) : "Agency Care";
  const canReturnToAgency = organization?.kind === "internal" && me.data?.restrictedPortal === false
    && (user?.userType === UserType.AGENCY || user?.userType === UserType.AGENCY_STAFF);
  const navItems: NavItem[] = [
    { section: "Agency care", label: "Dashboard", path: "/agency-care", icon: LayoutDashboard },
    { section: "Agency care", label: "Clients", path: "/agency-care/clients", icon: Users },
    { section: "Agency care", label: "Review queue", path: "/agency-care/review-queue", icon: CheckSquare },
    { section: "Agency care", label: "Reports", path: "/agency-care/reports", icon: FileBarChart },
    { section: "Agency care", label: "Notifications", path: "/agency-care/notifications", icon: Bell },
    { section: "Agency care", label: "Publication recovery", path: "/agency-care/recovery", icon: RotateCcw },
  ];
  // External organizations keep Settings, pinned to the bottom of the sidebar as in the agency panel.
  const bottomNavItems: NavItem[] = organization?.kind === "external" ? [{ label: "Settings", path: "/agency-care/settings", icon: Settings }] : [];
  // Client workspace routes belong to Clients, while the root is the dashboard.
  const activePath = location.pathname.startsWith("/agency-care/networks/") ? "/agency-care/clients" : [...navItems.slice(1), ...bottomNavItems].find((item) =>
    location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
  )?.path ?? "/agency-care";
  const clientWorkspace = location.pathname.startsWith("/agency-care/networks/");
  const changeOrganization = (agencyKey: string) => {
    if (agencyKey === organization?.agencyKey) return;
    setSelected(agencyKey);
    navigate("/agency-care");
  };
  const organizationSelect = embedded && organization && (
    <div className="ac-dashboard-organization">
      {me.data && me.data.organizations.length > 1 ? (
      <label>
      <span className="block text-[11px] font-medium text-[#687173] mb-1">Current organization</span>
      <select
        value={organization.agencyKey}
        onChange={(event) => changeOrganization(event.target.value)}
      >
        {me.data?.organizations.map((item) => (
          <option key={item.agencyKey} value={item.agencyKey}>{item.name}</option>
        ))}
      </select>
      </label>
      ) : (
        <div>
          <span className="block text-[11px] font-medium text-[#687173]">Current organization</span>
          <strong className="block truncate text-sm text-[#10141a]" title={organization.name}>{organization.name}</strong>
        </div>
      )}
    </div>
  );
  const content = !uid ? (
        <CareFailure
          message="Sign in to open Agency Care."
          onRetry={() => window.location.reload()}
        />
  ) : me.loading ? <CareLoad /> : me.error || !me.data ? (
        <CareFailure
          message={me.error || "Agency Care is unavailable."}
          onRetry={me.reload}
        />
  ) : !organization ? (
      <div>
        <h1>Agency Care</h1>
        <p>
          Your account has no active care organization membership. Accept an
          invitation or contact your agency administrator.
        </p>
        <Button variant="outline" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
  ) : children ?? <Outlet />;
  const careContent = (
    <div className={`agency-care${embedded ? " ac-embedded" : " ac-dashboard-content"}`}>
      {embedded && !clientWorkspace && <div className="ac-module-bar">
        <Link className="ac-brand" to="/agency-care">Agency Care</Link>
        <div className="ac-organization">{organizationSelect}</div>
        {me.data?.restrictedPortal && <Button variant="outline" onClick={() => void logout()}>Sign out</Button>}
      </div>}
      {embedded && (
        <nav className="ac-global-nav" aria-label="Agency Care">
          {[...navItems, ...bottomNavItems].map((item) => <Link key={item.path} className={activePath === item.path ? "active" : undefined} aria-current={activePath === item.path ? "page" : undefined} to={item.path!}>{item.label}</Link>)}
        </nav>
      )}
      <div className="ac-content" key={scope}>{content}</div>
    </div>
  );
  const dashboard = embedded ? careContent : (
    <div className="ac-shell relative min-h-screen overflow-x-hidden bg-[#003839] dark:bg-[#002c2d]">
      <DashboardHeaderFrame surface="card" leading={<AgencyTopBarDate />}>
        <div className="ac-header-actions flex min-w-0 items-center gap-[10px]">
          {canReturnToAgency && <AgencyAnnouncementPill endpoint="/agencyAnnouncements/announcements/mine" viewAllPath={Routes.agency.announcements} />}
          {organization?.kind === "external" && <div className="hidden shrink-0 sm:block"><HeaderActionButton icon={Settings} ariaLabel="Agency settings" onClick={() => navigate("/agency-care/settings")} /></div>}
          <CareNotificationButton />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={`Account menu for ${user?.fullName || "User"}`} aria-description={userRole} className="ac-account-trigger">
                <UserAvatar solid userName={user?.fullName} userImage={user?.photoURL || user?.profilePicture} />
                <div className="ac-account-identity min-w-0 pr-2 text-left">
                  <p className="max-w-40 truncate text-sm font-medium leading-tight text-[#10141a]" title={user?.fullName || "User"}>{user?.fullName || "User"}</p>
                  <p className="mt-0.5 max-w-40 truncate text-[11px] font-medium leading-tight text-[#687173]" title={userRole}>{userRole}</p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-[#808081]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="ac-account-menu w-[280px] max-w-[calc(100vw-32px)] z-[100] rounded-xl p-0">
              {organization && (
                <div className="border-b border-[#dde5e6] py-2">
                  <DropdownMenuLabel className="px-4 text-[11px] text-[#687173]">Current organization</DropdownMenuLabel>
                  {me.data && me.data.organizations.length > 1 ? (
                    <DropdownMenuRadioGroup aria-label="Current organization" value={organization.agencyKey} onValueChange={changeOrganization}>
                      {me.data.organizations.map((item) => (
                        <DropdownMenuRadioItem key={item.agencyKey} value={item.agencyKey} className="mx-2 min-h-11 cursor-pointer pr-2 text-[#10141a]">
                          <span className="min-w-0 break-words whitespace-normal">{item.name}</span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  ) : (
                    <p className="px-4 pb-1 break-words text-sm font-medium text-[#10141a]" title={organization.name}>{organization.name}</p>
                  )}
                </div>
              )}
              {canReturnToAgency && <DropdownMenuItem className="cursor-pointer gap-3 px-4 py-2" onSelect={() => navigate(Routes.agency.dashboard)}><ArrowLeft className="h-4 w-4" />Back to agency panel</DropdownMenuItem>}
              {organization?.kind === "external" && <DropdownMenuItem className="cursor-pointer gap-3 px-4 py-2" onSelect={() => navigate("/agency-care/settings")}><Settings className="h-4 w-4" />Settings</DropdownMenuItem>}
              <DropdownMenuItem onSelect={() => void logout()} className="ac-account-logout cursor-pointer gap-3 px-4 py-2"><LogOut className="h-4 w-4" />Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DashboardHeaderFrame>
      <CareSidebar
        navItems={navItems}
        bottomNavItems={bottomNavItems}
        activePath={activePath}
        organization={organization}
        backToAgency={canReturnToAgency}
      />
      {/* The page sits in a white card on the teal background, as in the agency panel; the top bar is fixed over its first 76px. */}
      <main className={cn(
        "relative mx-4 mb-4 mt-4 min-h-[calc(100vh-32px)] rounded-[24px] bg-white pb-10 pt-[76px] transition-[margin] duration-200 dark:bg-[#151c22]",
        collapsed ? "md:ml-[96px]" : "md:ml-[256px]",
      )}>
        <div className="px-4 sm:px-8">{careContent}</div>
      </main>
    </div>
  );
  if (!uid || me.loading || me.error || !me.data || !organization) return dashboard;
  return (
    <Context.Provider
      value={{
        uid,
        me: me.data,
        organization,
        agencyKey: organization.agencyKey,
        scope,
        refreshContext: me.reload,
      }}
    >
      <CareNotificationProvider
        key={scope}
        scope={scope}
        agencyKey={organization.agencyKey}
      >
        {dashboard}
      </CareNotificationProvider>
    </Context.Provider>
  );
}

/**
 * Agency Care sidebar in the agency panel's style: logo, the organization card, a way back to the
 * agency workspace for internal staff, and the Agency care menu with the unread notification count.
 */
function CareSidebar({ navItems, bottomNavItems, activePath, organization, backToAgency }: {
  navItems: NavItem[];
  bottomNavItems: NavItem[];
  activePath: string;
  organization?: CareOrganization;
  backToAgency: boolean;
}) {
  const unread = useCareUnreadCount();
  const items = navItems.map((item) => item.path === "/agency-care/notifications" ? { ...item, badge: unread } : item);
  const header = (collapsed: boolean) => organization && (
    <div className="flex flex-col gap-2">
      <div title={collapsed ? `${organization.name} · ${careLabel(organization.role)}` : undefined}
        className={cn("flex min-w-0 items-center gap-2.5 rounded-[10px] border border-white/10 bg-[#0b4647] p-2", collapsed && "justify-center")}>
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#12b5b0] text-[12px] font-semibold text-[#003839]">{initialsOf(organization.name)}</span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-white">{organization.name}</span>
            <span className="block truncate text-[11px] text-white/60">{careLabel(organization.role)}</span>
          </span>
        )}
      </div>
      {backToAgency && (
        <Link to={Routes.agency.dashboard} aria-label="Back to agency workspace" title={collapsed ? "Back to agency workspace" : undefined}
          className={cn("flex h-8 items-center gap-2 rounded-[8px] px-2 text-[12px] font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white", collapsed && "justify-center")}>
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && "Back to agency workspace"}
        </Link>
      )}
    </div>
  );
  return (
    <DashboardSidebar navItems={items} bottomNavItems={bottomNavItems} activePath={activePath} variant="brand" density="compact" activeStyle="solid"
      collapseAtBottom logo={agencySidebarLogo} header={header} />
  );
}
