import { cn } from "@/lib/utils";

export type ClaimsWorkspaceTab = "shifts" | "saved";

type ClaimsWorkspaceTabsProps = {
  activeTab: ClaimsWorkspaceTab;
  onTabChange: (tab: ClaimsWorkspaceTab) => void;
};

const tabs: Array<{ id: ClaimsWorkspaceTab; label: string }> = [
  { id: "shifts", label: "Shifts to claim" },
  { id: "saved", label: "Generated Claims" },
];

export default function ClaimsWorkspaceTabs({
  activeTab,
  onTabChange,
}: ClaimsWorkspaceTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "rounded-full border px-5 py-2 text-sm font-medium transition-colors cursor-pointer",
            activeTab === tab.id
              ? "border-[#00b4b8] bg-[#00b4b8] text-white"
              : "border-[#e5e5e6] text-[#10141a] hover:border-[#00b4b8]/40 hover:bg-[#eef4f5]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
