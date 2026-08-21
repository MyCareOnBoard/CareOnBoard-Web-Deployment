import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
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

type UserSettingsTabId = "account" | "notification" | "payrollSetup";

export default function SettingsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
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
      items.push({ id: "payrollSetup", label: "Payroll Setup" });
    }
    return items;
  }, [user, isEmployee]);

  const subtitle =
    user && isEmployee
      ? "Manage your account, notifications, and payroll setup."
      : "Manage your account and notifications.";

  const requestedTab = searchParams.get("tab");
  const activeTab = tabs.some((tab) => tab.id === requestedTab)
    ? requestedTab as UserSettingsTabId
    : "account";

  const handleTabChange = useCallback((tabId: UserSettingsTabId) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tabId);
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setVisitedTabs((prev) => prev.has(activeTab) ? prev : new Set(prev).add(activeTab));
  }, [activeTab]);

  useEffect(() => {
    if (!user || !requestedTab || tabs.some((tab) => tab.id === requestedTab)) return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", "account");
    setSearchParams(next, { replace: true });
  }, [requestedTab, searchParams, setSearchParams, tabs, user]);

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

        {user && isEmployee && activeTab === "payrollSetup" && visitedTabs.has("payrollSetup") && (
          <TabPanel tabId="payrollSetup" activeTab={activeTab}>
            <Suspense fallback={<SettingsTabSkeleton variant="form" cardCount={1} />}>
              <MyPayrollTab
                active={activeTab === "payrollSetup"}
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
