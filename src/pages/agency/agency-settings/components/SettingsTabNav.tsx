import { memo } from "react";
import { cn } from "@/lib/utils";
import { settingsTabPillActiveClass, settingsTabPillInactiveClass } from "./settingsCardStyles";

export type SettingsTabId = "account" | "agencyInfo" | "notification" | "userLevels";

export type SettingsTabItem = {
  id: SettingsTabId;
  label: string;
};

type SettingsTabNavProps = {
  tabs: SettingsTabItem[];
  activeTab: SettingsTabId;
  onChange: (tab: SettingsTabId) => void;
  className?: string;
};

export const SettingsTabNav = memo(function SettingsTabNav({
  tabs,
  activeTab,
  onChange,
  className,
}: SettingsTabNavProps) {
  return (
    <div className={cn("min-w-0 overflow-x-auto pb-1", className)}>
      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "cursor-pointer whitespace-nowrap transition-colors",
              activeTab === tab.id ? settingsTabPillActiveClass : settingsTabPillInactiveClass,
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
});

export default SettingsTabNav;
