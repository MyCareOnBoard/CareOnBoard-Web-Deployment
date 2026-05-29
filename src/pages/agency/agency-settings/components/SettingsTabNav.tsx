export type SettingsTabId = "account" | "agencyInfo" | "notification" | "userLevels";

export type SettingsTabItem = {
  id: SettingsTabId;
  label: string;
};

export { SettingsTabNav as default, SettingsTabNav } from "@/pages/shared/settings/SettingsTabNav";
