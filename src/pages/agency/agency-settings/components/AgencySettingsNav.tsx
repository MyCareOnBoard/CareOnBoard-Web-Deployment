import type { ComponentType, KeyboardEvent } from "react";
import { Banknote, Bell, Building2, ChevronRight, Layers, UserRound, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SettingsTabId, SettingsTabItem } from "./SettingsTabNav";

const ICONS: Record<SettingsTabId, ComponentType<{ className?: string }>> = {
  account: UserRound,
  agencyInfo: Building2,
  notification: Bell,
  myPayroll: Wallet,
  payrollSetup: Banknote,
  evv: Layers,
};

/**
 * Settings sections as a list down the left (a scrolling row on small screens). Same tab
 * semantics and ids as the shared tab bar, so each panel stays labelled by its tab.
 */
export default function AgencySettingsNav({ tabs, activeTab, onChange, className }: {
  tabs: SettingsTabItem[];
  activeTab: SettingsTabId;
  onChange: (tab: SettingsTabId) => void;
  className?: string;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
    const next = event.key === "Home" ? 0
      : event.key === "End" ? tabs.length - 1
        : (index + (forward ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  return (
    <nav aria-label="Settings" className={cn("min-w-0", className)}>
      <div role="tablist" aria-label="Settings sections" aria-orientation="vertical"
        className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {tabs.map((tab, index) => {
          const on = tab.id === activeTab;
          const Icon = ICONS[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`settings-tab-${tab.id}`}
              aria-controls={`settings-panel-${tab.id}`}
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "flex h-11 shrink-0 cursor-pointer items-center gap-3 rounded-[10px] px-3 text-left text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679] lg:w-full",
                on ? "bg-[#f4f5f6] font-medium text-[#10141a] dark:bg-white/10 dark:text-[#f4f6f7]"
                  : "text-[#2a3138] hover:bg-[#f8f9fa] dark:text-[#c9d1d4] dark:hover:bg-white/5",
              )}
            >
              <Icon aria-hidden="true" className={cn("h-[18px] w-[18px] shrink-0", on ? "text-[#007679] dark:text-[#7fd3d3]" : "text-[#4b535b] dark:text-[#9aa4a8]")} />
              <span className="whitespace-nowrap lg:flex-1">{tab.label}</span>
              {on && <ChevronRight aria-hidden="true" className="hidden h-4 w-4 text-[#4b535b] lg:block dark:text-[#9aa4a8]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
