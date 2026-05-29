import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types";
import type { DspPaymentDetails } from "@/lib/api/paymentDetails";
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
const PaymentTab = lazy(() => import("./components/PaymentTab"));

type UserSettingsTabId = "account" | "notification" | "payroll";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<UserSettingsTabId>("account");
  const [visitedTabs, setVisitedTabs] = useState<Set<UserSettingsTabId>>(
    () => new Set(["account"]),
  );
  const [payrollCache, setPayrollCache] = useState<DspPaymentDetails | null>(null);

  const isEmployee = user?.userType === UserType.EMPLOYEE;

  const tabs = useMemo(() => {
    const items: SettingsTabItem<UserSettingsTabId>[] = [
      { id: "account", label: "Account" },
      { id: "notification", label: "Notifications" },
    ];
    if (user && isEmployee) {
      items.push({ id: "payroll", label: "Payroll" });
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

  const handlePayrollCacheUpdate = useCallback((details: DspPaymentDetails) => {
    setPayrollCache(details);
  }, []);

  useEffect(() => {
    if (!isEmployee && activeTab === "payroll") {
      setActiveTab("account");
      setVisitedTabs((prev) => {
        const next = new Set(prev);
        next.delete("payroll");
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

        {user && isEmployee && visitedTabs.has("payroll") && (
          <TabPanel tabId="payroll" activeTab={activeTab}>
            <Suspense fallback={<SettingsTabSkeleton variant="form" cardCount={2} />}>
              <PaymentTab cachedDetails={payrollCache} onCacheUpdate={handlePayrollCacheUpdate} />
            </Suspense>
          </TabPanel>
        )}
      </div>
    </div>
  );
}
