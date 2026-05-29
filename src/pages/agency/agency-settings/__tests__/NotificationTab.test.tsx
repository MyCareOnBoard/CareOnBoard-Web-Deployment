import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/ui/loader", () => ({
  ButtonLoader: () => null,
  PageLoader: () => null,
}));

import AgencyNotificationTab from "../components/NotificationTab";
import SharedNotificationTab from "@/pages/shared/settings/NotificationPreferencesTab";

describe("NotificationsTab (agency re-export)", () => {
  it("re-exports shared NotificationPreferencesTab", () => {
    expect(AgencyNotificationTab).toBe(SharedNotificationTab);
  });
});
