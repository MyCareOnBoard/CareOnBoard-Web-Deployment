import { memo, type ReactElement } from "react";
import { cn } from "@/lib/utils";
import { settingsTabPillActiveClass, settingsTabPillInactiveClass } from "./settingsCardStyles";

export type SettingsTabItem<T extends string = string> = {
  id: T;
  label: string;
};

type SettingsTabNavProps<T extends string> = {
  tabs: SettingsTabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  className?: string;
};

export const SettingsTabNav = memo(function SettingsTabNav<T extends string>({
  tabs,
  activeTab,
  onChange,
  className,
}: SettingsTabNavProps<T>) {
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
}) as <T extends string>(props: SettingsTabNavProps<T>) => ReactElement;

export default SettingsTabNav;
