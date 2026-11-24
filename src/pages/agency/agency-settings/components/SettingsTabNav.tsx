export type SettingsTabId = "account" | "agencyInfo" | "notification" | "myPayroll" | "payrollSetup" | "communityInclusion" | "evv";

export type SettingsTabItem = {
  id: SettingsTabId;
  label: string;
};

export { SettingsTabNav as default, SettingsTabNav } from "@/pages/shared/settings/SettingsTabNav";
