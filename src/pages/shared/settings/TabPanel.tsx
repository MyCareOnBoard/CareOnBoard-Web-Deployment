import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TabPanelProps<T extends string> = {
  tabId: T;
  activeTab: T;
  children: ReactNode;
  className?: string;
};

export function TabPanel<T extends string>({
  tabId,
  activeTab,
  children,
  className,
}: TabPanelProps<T>) {
  const isActive = activeTab === tabId;

  return (
    <div
      className={cn(!isActive && "hidden", className)}
      id={`settings-panel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`settings-tab-${tabId}`}
      aria-hidden={!isActive}
      hidden={!isActive}
    >
      {children}
    </div>
  );
}

export default TabPanel;
