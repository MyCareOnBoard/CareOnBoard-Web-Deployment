export type SettingsTabId = "account" | "agencyInfo" | "notification" | "myPayroll" | "payrollSetup";

export type SettingsTabItem = {
  id: SettingsTabId;
  label: string;
};

export { SettingsTabNav as default, SettingsTabNav } from "@/pages/shared/settings/SettingsTabNav";
