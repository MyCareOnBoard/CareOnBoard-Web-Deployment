import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types";
import {
  AccountSettingsTab,
  SettingsTabNav,
  SettingsTabSkeleton,
  TabPanel,
  type SettingsTabItem,
} from "@/pages/shared/settings";

const NotificationPreferencesTab = lazy(
  () => import("@/pages/shared/settings/NotificationPreferencesTab"),
);
const MyPayrollTab = lazy(() => import("@/features/payroll/components/MyPayrollTab"));

type UserSettingsTabId = "account" | "notification" | "myPayroll";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<UserSettingsTabId>("account");
  const [visitedTabs, setVisitedTabs] = useState<Set<UserSettingsTabId>>(
    () => new Set(["account"]),
  );
  const isEmployee = user?.userType === UserType.EMPLOYEE;

  const tabs = useMemo(() => {
    const items: SettingsTabItem<UserSettingsTabId>[] = [
      { id: "account", label: "Account" },
      { id: "notification", label: "Notifications" },
    ];
    if (user && isEmployee) {
      items.push({ id: "myPayroll", label: "My Payroll" });
    }
    return items;
  }, [user, isEmployee]);

  const subtitle =
    user && isEmployee
      ? "Manage your account, notifications, and payroll."
      : "Manage your account and notifications.";

  const handleTabChange = useCallback((tabId: UserSettingsTabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set(prev).add(tabId));
  }, []);

  useEffect(() => {
    if (!isEmployee && activeTab === "myPayroll") {
      setActiveTab("account");
      setVisitedTabs((prev) => {
        const next = new Set(prev);
        next.delete("myPayroll");
        return next;
      });
    }
  }, [isEmployee, activeTab]);

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <h1 className="text-[40px] font-semibold leading-[1.4] text-[#10141a]">Settings</h1>
        <p className="mt-1 text-[14px] text-[#808081]">{subtitle}</p>
      </div>

      <SettingsTabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        className="mb-6"
      />

      <div className="mt-6 flex min-w-0 flex-col gap-4">
        <TabPanel tabId="account" activeTab={activeTab}>
          <AccountSettingsTab />
        </TabPanel>

        {visitedTabs.has("notification") && (
          <TabPanel tabId="notification" activeTab={activeTab}>
            <Suspense fallback={<SettingsTabSkeleton variant="form" cardCount={1} />}>
              <NotificationPreferencesTab />
            </Suspense>
          </TabPanel>
        )}

        {user && isEmployee && activeTab === "myPayroll" && visitedTabs.has("myPayroll") && (
          <TabPanel tabId="myPayroll" activeTab={activeTab}>
            <Suspense fallback={<SettingsTabSkeleton variant="form" cardCount={1} />}>
              <MyPayrollTab
                active={activeTab === "myPayroll"}
                scope={{
                  audience: "employee",
                  actorUid: user.uid,
                  agencyId: user.agencyId ?? "",
                  employmentId: user.payrollEmploymentId ?? "",
                }}
              />
            </Suspense>
          </TabPanel>
        )}
      </div>
    </div>
  );
}
