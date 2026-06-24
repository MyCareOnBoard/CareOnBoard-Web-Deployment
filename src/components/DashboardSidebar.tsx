import { type ComponentType, ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavGroupActive, resolveActiveNavPath } from "@/lib/nav-utils";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { closeDrawer, useSidebarDrawer } from "@/hooks/useSidebarDrawer";
import { useIsMobile } from "@/hooks/use-mobile";

export type NavSubItem = {
  label: string;
  path: string;
};

export type NavItem = {
  label: string;
  path?: string;
  icon: ComponentType<{ className?: string }>;
  accessKey?: string;
  children?: NavSubItem[];
};

const iconClassName = (isActive: boolean) =>
  cn(
    "h-5 w-5 shrink-0",
    isActive
      ? "[&_*]:stroke-white [&_*]:fill-transparent [&_path]:stroke-white [&_path]:fill-transparent [&_circle]:stroke-white [&_circle]:fill-transparent [&_rect]:stroke-white [&_rect]:fill-transparent"
      : "[&_*]:stroke-[#808081] [&_*]:fill-transparent [&_path]:stroke-[#808081] [&_path]:fill-transparent [&_circle]:stroke-[#808081] [&_circle]:fill-transparent [&_rect]:stroke-[#808081] [&_rect]:fill-transparent"
  );

function NavGroup({
  item,
  activePath,
  isExpanded,
  isGroupActive,
  collapsed,
  onToggle,
}: {
  item: NavItem;
  activePath: string;
  isExpanded: boolean;
  isGroupActive: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const { icon: Icon, label, path, children = [] } = item;

  // Collapsed: no room for the submenu — the icon just jumps to the group's landing route.
  if (collapsed) {
    return (
      <button
        type="button"
        title={label}
        onClick={() => path && navigate(path)}
        className={cn(
          "flex h-[52px] w-full items-center justify-center rounded-[60px] transition cursor-pointer",
          isGroupActive ? "bg-[#00b4b8]" : "text-[#808081] hover:bg-white/40"
        )}
      >
        <Icon className={iconClassName(isGroupActive)} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] transition-colors",
        isGroupActive && "bg-[#00b4b8]"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex h-[52px] w-full items-center gap-3 rounded-[60px] px-4 text-sm font-semibold backdrop-blur-[22px] transition cursor-pointer",
          isGroupActive ? "font-medium text-white" : "font-medium text-[#808081] hover:bg-white/40"
        )}
      >
        <Icon className={iconClassName(isGroupActive)} />
        <span className="flex-1 whitespace-nowrap text-left">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isGroupActive ? "text-white" : "text-[#808081]",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {isExpanded && (
        <div className="space-y-1 px-2 pb-2">
          {children.map((child) => {
            const isChildActive = activePath === child.path;

            return (
              <button
                key={child.path}
                type="button"
                onClick={() => navigate(child.path)}
                className={cn(
                  "flex h-[40px] w-full items-center gap-2 rounded-[12px] px-3 text-left text-[13px] font-medium transition cursor-pointer",
                  isChildActive
                    ? "bg-[#009a9e] text-white"
                    : isGroupActive
                      ? "text-white/90 hover:bg-white/15"
                      : "text-[#808081] hover:bg-white/40"
                )}
              >
                <span className="flex-1">{child.label}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavLinkButton({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const navigate = useNavigate();
  const { icon: Icon, label, path } = item;

  if (!path) {
    return null;
  }

  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      onClick={() => navigate(path)}
      className={cn(
        "flex h-[52px] w-full items-center rounded-[60px] text-sm font-semibold backdrop-blur-[22px] transition cursor-pointer",
        collapsed ? "justify-center" : "gap-3 px-4",
        isActive ? "bg-[#00b4b8] font-medium text-white" : "font-medium text-[#808081] hover:bg-white/40"
      )}
    >
      <Icon className={iconClassName(isActive)} />
      {!collapsed && <span className="flex-1 whitespace-nowrap text-left">{label}</span>}
    </button>
  );
}

export default function DashboardSidebar({
  navItems,
  footer,
}: {
  footer?: ReactNode;
  navItems: NavItem[];
}) {
  const location = useLocation();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const isMobile = useIsMobile();
  const drawerOpen = useSidebarDrawer();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Icons-only collapse is a desktop affordance; the mobile drawer always shows full labels.
  const effectiveCollapsed = collapsed && !isMobile;

  // Dismiss the drawer after navigating and whenever we leave the mobile breakpoint.
  useEffect(() => {
    closeDrawer();
  }, [location.pathname, isMobile]);

  const activePath = useMemo(
    () => resolveActiveNavPath(location.pathname, navItems),
    [location.pathname, navItems]
  );

  return (
    <>
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed top-[98px] bottom-0 left-0 z-50 overflow-y-auto overflow-x-hidden space-y-3 pr-3 bg-[#eef4f5] scrollbar-hide shadow-xl",
          "transition-transform duration-200 md:top-[130px] md:bottom-4 md:pr-0 md:left-[42.5px] md:z-40 md:translate-x-0 md:shadow-none md:transition-[width]",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
          effectiveCollapsed ? "w-[64px]" : "w-[256px] md:w-[200px]"
        )}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "hidden h-[44px] w-full items-center rounded-[60px] text-[13px] font-medium text-[#808081] transition cursor-pointer hover:bg-white/40 md:flex",
            effectiveCollapsed ? "justify-center" : "gap-3 px-4"
          )}
        >
          {effectiveCollapsed ? <PanelLeftOpen className="h-5 w-5 shrink-0" /> : <PanelLeftClose className="h-5 w-5 shrink-0" />}
          {!effectiveCollapsed && <span className="flex-1 whitespace-nowrap text-left">Collapse menu</span>}
        </button>
        <nav className="space-y-1 pb-4">
          {navItems.map((item) => {
            if (item.children?.length) {
              const isOnGroupRoute = isNavGroupActive(location.pathname, item);
              const isExpanded = expandedGroups[item.label] ?? isOnGroupRoute;
              const isGroupActive = isOnGroupRoute;

              return (
                <NavGroup
                  key={item.label}
                  item={item}
                  activePath={activePath}
                  isExpanded={isExpanded}
                  isGroupActive={isGroupActive}
                  collapsed={effectiveCollapsed}
                  onToggle={() => {
                    setExpandedGroups((current) => ({
                      ...current,
                      [item.label]: !isExpanded,
                    }));
                  }}
                />
              );
            }

            return (
              <NavLinkButton
                key={item.label}
                item={item}
                isActive={activePath === item.path}
                collapsed={effectiveCollapsed}
              />
            );
          })}
        </nav>
        {!effectiveCollapsed && footer}
      </aside>
    </>
  );
}
