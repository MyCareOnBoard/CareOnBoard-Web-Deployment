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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { Bell, CheckSquare, ChevronDown, FileBarChart, LayoutDashboard, LogOut, RotateCcw, Settings, Users } from "lucide-react";
import { useAuth } from "@/utils/auth/context/AuthContext";
import {
  agencyCareApi,
  type CareMe,
  type CareOrganization,
} from "@/lib/api/agencyCare";
import { useScopedRequest } from "./hooks";
import { CareButton as Button, CareFailure, CareLoad, careLabel } from "./ui";
import { CareNotificationButton, CareNotificationProvider } from "./CareNotifications";
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
  const navItems: NavItem[] = [
    { label: "Dashboard", path: "/agency-care", icon: LayoutDashboard },
    { label: "Clients", path: "/agency-care/clients", icon: Users },
    { label: "Review queue", path: "/agency-care/review-queue", icon: CheckSquare },
    { label: "Reports", path: "/agency-care/reports", icon: FileBarChart },
    { label: "Notifications", path: "/agency-care/notifications", icon: Bell },
    { label: "Publication recovery", path: "/agency-care/recovery", icon: RotateCcw },
    ...(organization?.kind === "external" ? [{ label: "Settings", path: "/agency-care/settings", icon: Settings }] : []),
  ];
  // Client workspace routes belong to Clients, while the root is the dashboard.
  const activePath = location.pathname.startsWith("/agency-care/networks/") ? "/agency-care/clients" : navItems.slice(1).find((item) =>
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
      {!clientWorkspace && <div className="ac-module-bar">
        <Link className="ac-brand" to="/agency-care">Agency Care</Link>
        {embedded && <div className="ac-organization">{organizationSelect}</div>}
        {embedded && me.data?.restrictedPortal && <Button variant="outline" onClick={() => void logout()}>Sign out</Button>}
      </div>}
      {embedded && (
        <nav className="ac-global-nav" aria-label="Agency Care">
          {navItems.map((item) => <Link key={item.path} className={activePath === item.path ? "active" : undefined} aria-current={activePath === item.path ? "page" : undefined} to={item.path!}>{item.label}</Link>)}
        </nav>
      )}
      <div className="ac-content" key={scope}>{content}</div>
    </div>
  );
  const dashboard = embedded ? careContent : (
    <div className="ac-shell relative min-h-screen overflow-x-hidden">
      <DashboardHeaderFrame>
        <div className="flex items-center gap-[10px]">
          {organization?.kind === "external" && <HeaderActionButton icon={Settings} ariaLabel="Agency settings" onClick={() => navigate("/agency-care/settings")} />}
          <CareNotificationButton />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={`Account menu for ${user?.fullName || "User"}`} className="ac-account-trigger">
                <UserAvatar userName={user?.fullName} userImage={user?.photoURL || user?.profilePicture} />
                <div className="hidden min-w-0 pr-2 xl:block text-left">
                  <p className="max-w-40 truncate text-sm font-medium leading-tight text-[#10141a]">{user?.fullName || "User"}</p>
                  <p className="mt-0.5 max-w-40 truncate text-[11px] font-medium leading-tight text-[#687173]">{userRole}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-[#808081] mr-2" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="ac-account-menu w-[280px] max-w-[calc(100vw-32px)] z-[100] rounded-xl p-0">
              <div className="border-b border-[#dde5e6] px-4 py-3">
                <p className="truncate text-sm font-semibold text-[#10141a]">{user?.fullName || "User"}</p>
                <p className="mt-1 truncate text-xs font-medium text-[#687173]">{userRole}</p>
              </div>
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
              {organization?.kind === "external" && <DropdownMenuItem className="cursor-pointer gap-3 px-4 py-2" onSelect={() => navigate("/agency-care/settings")}><Settings className="h-4 w-4" />Settings</DropdownMenuItem>}
              <DropdownMenuItem onSelect={() => void logout()} className="ac-account-logout cursor-pointer gap-3 px-4 py-2"><LogOut className="h-4 w-4" />Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DashboardHeaderFrame>
      <DashboardSidebar navItems={navItems} activePath={activePath} footer={organization && <div className="ac-sidebar-context"><strong>Agency Care</strong>{organization.name}</div>} />
      <main className={`ml-0 ${collapsed ? "md:ml-[112px]" : "md:ml-[240px]"} pt-[130px] pb-10 transition-[margin] duration-200`}>
        <div className="px-4 md:px-8">{careContent}</div>
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
