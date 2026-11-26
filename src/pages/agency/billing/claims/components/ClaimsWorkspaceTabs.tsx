import { AgencySegmented } from "@/components/agency/AgencyListKit";

export type ClaimsWorkspaceTab = "shifts" | "saved";

type ClaimsWorkspaceTabsProps = {
  activeTab: ClaimsWorkspaceTab;
  onTabChange: (tab: ClaimsWorkspaceTab) => void;
  counts?: Partial<Record<ClaimsWorkspaceTab, number>>;
};

export default function ClaimsWorkspaceTabs({
  activeTab,
  onTabChange,
  counts = {},
}: ClaimsWorkspaceTabsProps) {
  return (
    <AgencySegmented
      label="Claims views"
      value={activeTab}
      onChange={onTabChange}
      options={[
        { value: "shifts", label: "Ready to bill", count: counts.shifts },
        { value: "saved", label: "Claims & invoices", count: counts.saved },
      ]}
      className="w-fit"
    />
  );
}
