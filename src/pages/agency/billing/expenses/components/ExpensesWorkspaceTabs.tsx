import { AgencySegmented } from "@/components/agency/AgencyListKit";

export type ExpensesWorkspaceTab = "pending" | "all";

type ExpensesWorkspaceTabsProps = {
  activeTab: ExpensesWorkspaceTab;
  onTabChange: (tab: ExpensesWorkspaceTab) => void;
};

export default function ExpensesWorkspaceTabs({
  activeTab,
  onTabChange,
}: ExpensesWorkspaceTabsProps) {
  return (
    <AgencySegmented
      label="Expense views"
      value={activeTab}
      onChange={onTabChange}
      options={[
        { value: "pending", label: "Awaiting review" },
        { value: "all", label: "All submissions" },
      ]}
      className="w-fit"
    />
  );
}
