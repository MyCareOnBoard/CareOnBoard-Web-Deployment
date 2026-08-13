import { memo, type ReactElement, type KeyboardEvent } from "react";
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
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!(["ArrowRight", "ArrowLeft", "Home", "End"] as string[]).includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[nextIndex].id); (event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]")[nextIndex])?.focus();
  };
  return (
    <div className={cn("min-w-0 overflow-x-auto pb-1", className)}>
      <div role="tablist" aria-label="Settings sections" className="flex items-center gap-2">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`settings-tab-${tab.id}`}
            aria-controls={`settings-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
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
