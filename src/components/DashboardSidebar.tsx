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
  accessKey?: string;
};

/** "brand": full-height teal panel used by the employee (user) panel. */
// Faint vertical lines over the brand sidebar's dark teal, as in the design.
const brandPattern = {
  backgroundImage: "repeating-linear-gradient(90deg, transparent 0 77px, rgba(255,255,255,0.035) 77px 78px)",
};

export type SidebarVariant = "default" | "brand";

export type NavItem = {
  label: string;
  path?: string;
  icon: ComponentType<{ className?: string }>;
  accessKey?: string;
  staffOnly?: boolean;
  children?: NavSubItem[];
};

const iconClassName = (isActive: boolean, variant: SidebarVariant = "default") =>
  variant === "brand" ? "h-5 w-5 shrink-0 text-current" : cn(
    "h-5 w-5 shrink-0",
    isActive
      ? "[&_*]:stroke-white [&_*]:fill-transparent [&_path]:stroke-white [&_path]:fill-transparent [&_circle]:stroke-white [&_circle]:fill-transparent [&_rect]:stroke-white [&_rect]:fill-transparent"
      : "[&_*]:stroke-[#808081] [&_*]:fill-transparent [&_path]:stroke-[#808081] [&_path]:fill-transparent [&_circle]:stroke-[#808081] [&_circle]:fill-transparent [&_rect]:stroke-[#808081] [&_rect]:fill-transparent dark:[&_*]:stroke-[#9aa4a8] dark:[&_path]:stroke-[#9aa4a8] dark:[&_circle]:stroke-[#9aa4a8] dark:[&_rect]:stroke-[#9aa4a8]"
  );

function NavGroup({
  item,
  activePath,
  isExpanded,
  isGroupActive,
  collapsed,
  onToggle,
  variant,
}: {
  item: NavItem;
  activePath: string;
  isExpanded: boolean;
  isGroupActive: boolean;
  collapsed: boolean;
  onToggle: () => void;
  variant: SidebarVariant;
}) {
  const brand = variant === "brand";
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
          "flex w-full items-center justify-center transition cursor-pointer",
          brand ? "h-[44px] rounded-[12px] text-white" : "h-[52px] rounded-[60px]",
          brand
            ? isGroupActive ? "bg-white/15" : "text-white/85 hover:bg-white/10"
            : isGroupActive ? "bg-[#00b4b8]" : "text-[#808081] hover:bg-white/40 dark:text-[#9aa4a8] dark:hover:bg-white/5"
        )}
      >
        <Icon className={iconClassName(isGroupActive, variant)} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden transition-colors",
        brand ? "rounded-[14px]" : "rounded-[20px]",
        isGroupActive && (brand ? "bg-white/15" : "bg-[#00b4b8]")
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 text-sm transition cursor-pointer",
          brand ? "h-[44px] rounded-[12px] px-3" : "h-[52px] rounded-[60px] px-4 font-semibold backdrop-blur-[22px]",
          brand
            ? isGroupActive ? "font-semibold text-white" : "font-medium text-white/85 hover:bg-white/10 hover:text-white"
            : isGroupActive ? "font-medium text-white" : "font-medium text-[#808081] hover:bg-white/40 dark:text-[#9aa4a8] dark:hover:bg-white/5"
        )}
      >
        <Icon className={iconClassName(isGroupActive, variant)} />
        <span className="flex-1 whitespace-nowrap text-left">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isGroupActive || brand ? "text-white" : "text-[#808081] dark:text-[#9aa4a8]",
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
                    ? brand ? "bg-white/20 text-white" : "bg-[#009a9e] text-white"
                    : isGroupActive || brand
                      ? "text-white/90 hover:bg-white/15"
                      : "text-[#808081] hover:bg-white/40 dark:text-[#9aa4a8] dark:hover:bg-white/5"
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
  variant,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  variant: SidebarVariant;
}) {
  const brand = variant === "brand";
  const navigate = useNavigate();
  const { icon: Icon, label, path } = item;

  if (!path) {
    return null;
  }

  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      onClick={() => navigate(path)}
      className={cn(
        "flex w-full items-center text-sm transition cursor-pointer",
        brand ? "h-[44px] rounded-[12px]" : "h-[52px] rounded-[60px] font-semibold backdrop-blur-[22px]",
        collapsed ? "justify-center" : brand ? "gap-3 px-3" : "gap-3 px-4",
        brand
          ? isActive ? "bg-white/15 font-semibold text-white" : "font-medium text-white/85 hover:bg-white/10 hover:text-white"
          : isActive ? "bg-[#00b4b8] font-medium text-white" : "font-medium text-[#808081] hover:bg-white/40 dark:text-[#9aa4a8] dark:hover:bg-white/5"
      )}
    >
      <Icon className={iconClassName(isActive, variant)} />
      {!collapsed && <span className="flex-1 whitespace-nowrap text-left">{label}</span>}
    </button>
  );
}

export default function DashboardSidebar({
  navItems,
  footer,
  activePath: activePathOverride,
  variant = "default",
  logo,
}: {
  footer?: ReactNode;
  navItems: NavItem[];
  activePath?: string;
  variant?: SidebarVariant;
  /** Brand variant only: the logo shown at the top of the panel, given the collapsed state. */
  logo?: (collapsed: boolean) => ReactNode;
}) {
  const brand = variant === "brand";
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
    () => activePathOverride ?? resolveActiveNavPath(location.pathname, navItems),
    [activePathOverride, location.pathname, navItems]
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
        inert={isMobile && !drawerOpen}
        style={brand ? brandPattern : undefined}
        className={cn(
          brand
            ? "fixed inset-y-0 left-0 z-[60] flex flex-col gap-3 overflow-hidden bg-[#003839] px-3 pb-4 pt-5 text-white scrollbar-hide shadow-xl dark:bg-[#002c2d]"
            : "fixed top-[98px] bottom-0 left-0 z-50 overflow-y-auto overflow-x-hidden space-y-3 pr-3 bg-[#eef4f5] dark:bg-[#10141a] scrollbar-hide shadow-xl",
          brand
            ? "transition-transform duration-200 md:z-40 md:translate-x-0 md:shadow-none md:transition-[width]"
            : "transition-transform duration-200 md:top-[130px] md:bottom-4 md:pr-0 md:left-[42.5px] md:z-40 md:translate-x-0 md:shadow-none md:transition-[width]",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
          brand
            ? effectiveCollapsed ? "w-[256px] md:w-[88px]" : "w-[256px] md:w-[248px]"
            : effectiveCollapsed ? "w-[64px]" : "w-[256px] md:w-[200px]"
        )}
      >
        {brand && logo && <div className={cn("flex shrink-0 items-center pb-2", effectiveCollapsed ? "justify-center" : "px-2")}>{logo(effectiveCollapsed)}</div>}
        {/* Brand: the logo stays put; the menu and help card scroll together below it. */}
        <div className={cn(brand ? "-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-1 scrollbar-hide" : "space-y-3")}>
        <button
          type="button"
          onClick={toggleCollapsed}
          title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "hidden h-[44px] w-full shrink-0 items-center text-[13px] font-medium transition cursor-pointer md:flex",
            brand
              ? "rounded-[12px] text-white/85 hover:bg-white/10 hover:text-white"
              : "rounded-[60px] text-[#808081] dark:text-[#9aa4a8] hover:bg-white/40 dark:hover:bg-white/5",
            effectiveCollapsed ? "justify-center" : brand ? "gap-3 px-3" : "gap-3 px-4"
          )}
        >
          {effectiveCollapsed ? <PanelLeftOpen className="h-5 w-5 shrink-0" /> : <PanelLeftClose className="h-5 w-5 shrink-0" />}
          {!effectiveCollapsed && <span className="flex-1 whitespace-nowrap text-left">Collapse menu</span>}
        </button>
        <nav aria-label="Main" className={cn("space-y-1", brand ? "pb-2" : "pb-4")}>
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
                  variant={variant}
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
                variant={variant}
              />
            );
          })}
        </nav>
        {!effectiveCollapsed && (brand ? <div className="mt-auto shrink-0 pt-2">{footer}</div> : footer)}
        </div>
      </aside>
    </>
  );
}
