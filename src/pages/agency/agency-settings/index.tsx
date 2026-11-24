import { useState, useEffect, lazy, Suspense, useMemo, useCallback } from "react";
import { Navigate, useSearchParams } from "react-router";
import AccountTab from "./components/AccountTab";
import { Settings } from "lucide-react";
import type { SettingsTabId, SettingsTabItem } from "./components/SettingsTabNav";
import AgencySettingsNav from "./components/AgencySettingsNav";
import { AgencyPageHeader } from "@/components/agency/AgencyShell";
import SettingsTabSkeleton from "./components/SettingsTabSkeleton";
import { TabPanel } from "@/pages/shared/settings";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types";
import { canAccessBillingChild, canManageEmployeePayroll } from "@/lib/agency/agency-billing-permissions";
import { Routes } from "@/routes/constants";

const AgencyInfoTab = lazy(() => import("./components/AgencyInfoTab"));
const NotificationsTab = lazy(() => import("./components/NotificationTab"));
const AgencyPayrollSetupTab = lazy(() => import("./components/AgencyPayrollSetupTab"));
const MyPayrollTab = lazy(() => import("@/features/payroll/components/MyPayrollTab"));
const EvvSettingsTab = lazy(() => import("./components/EvvSettingsTab"));



export default function AgencySettingsPage() {

  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const [visitedTabs, setVisitedTabs] = useState<Set<SettingsTabId>>(() => new Set(["account"]));
  const isAgencyStaff = user?.userType === UserType.AGENCY_STAFF;
  const accessList = user?.profile?.accessList ?? [];
  const canOpenPayrollSetup = canManageEmployeePayroll(user?.userType, accessList)
    || user?.canOpenAgencyPayrollSetup === true;
  const supportedTypes: readonly string[] = user?.agency?.supportedClientTypes ?? [];
  // HHAeXchange EVV: HHA and DDD agencies; EVV View can look, EVV Management can change.
  const evvPrograms = (["hha", "ddd"] as const).filter((type) => supportedTypes.includes(type));
  const canViewEvv = evvPrograms.length > 0 && canAccessBillingChild(user?.userType, accessList, "EVV View");
  const canManageEvv = canViewEvv && canAccessBillingChild(user?.userType, accessList, "EVV Management");

  const tabs = useMemo(() => {

    const items: SettingsTabItem[] = [

      { id: "account", label: "Account" },

      { id: "agencyInfo", label: "Agency information" },

      { id: "notification", label: "Notifications" },

    ];

    if (isAgencyStaff) items.push({ id: "myPayroll", label: "Payroll setup" });
    if (canOpenPayrollSetup) items.push({ id: "payrollSetup", label: "Agency payroll setup" });
    // HHAeXchange EVV is the only integration so far.
    if (canViewEvv) items.push({ id: "evv", label: "Integrations" });

    return items;

  }, [isAgencyStaff, canOpenPayrollSetup, canViewEvv]);



  const requestedTab = searchParams.get("tab");
  const activeTab = tabs.some((tab) => tab.id === requestedTab)
    ? requestedTab as SettingsTabId
    : "account";

  const handleTabChange = useCallback((tabId: SettingsTabId) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tabId);
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setVisitedTabs((prev) => prev.has(activeTab) ? prev : new Set(prev).add(activeTab));
  }, [activeTab]);

  useEffect(() => {
    if (!user || !requestedTab || requestedTab === "userLevels" || tabs.some((tab) => tab.id === requestedTab)) return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", "account");
    setSearchParams(next, { replace: true });
  }, [requestedTab, searchParams, setSearchParams, tabs, user]);
  if (requestedTab === "userLevels") return <Navigate to={Routes.agency.staffManagement} replace />;

  return (

    <div className="min-w-0 pb-6">

      <AgencyPageHeader
        icon={Settings}
        title="Settings"
        description="Your account, agency details, notifications and payroll setup."
      />

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">

      <AgencySettingsNav tabs={tabs} activeTab={activeTab} onChange={handleTabChange} className="lg:sticky lg:top-24 lg:self-start" />

      <div className="flex min-w-0 flex-col gap-4">

        <TabPanel tabId="account" activeTab={activeTab}>

          <AccountTab />

        </TabPanel>



        {visitedTabs.has("agencyInfo") && (

          <TabPanel tabId="agencyInfo" activeTab={activeTab}>

            <Suspense fallback={<SettingsTabSkeleton variant="accordion" cardCount={5} />}>

              <AgencyInfoTab />

            </Suspense>

          </TabPanel>

        )}



        {visitedTabs.has("notification") && (

          <TabPanel tabId="notification" activeTab={activeTab}>

            <Suspense fallback={<SettingsTabSkeleton variant="form" cardCount={1} />}>

              <NotificationsTab active={activeTab === "notification"} />

            </Suspense>

          </TabPanel>

        )}




        {isAgencyStaff && activeTab === "myPayroll" && visitedTabs.has("myPayroll") && user?.uid && user.agencyId && (

          <TabPanel tabId="myPayroll" activeTab={activeTab}>

            <Suspense fallback={<SettingsTabSkeleton variant="form" cardCount={2} />}>

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

        {canViewEvv && visitedTabs.has("evv") && (
          <TabPanel tabId="evv" activeTab={activeTab}>
            <Suspense fallback={<SettingsTabSkeleton variant="form" cardCount={3} />}>
              <EvvSettingsTab canManage={canManageEvv} supportedPrograms={[...evvPrograms]} />
            </Suspense>
          </TabPanel>
        )}

        {canOpenPayrollSetup && visitedTabs.has("payrollSetup") && user?.uid && user.agencyId && (
          <TabPanel tabId="payrollSetup" activeTab={activeTab}>
            <Suspense fallback={<SettingsTabSkeleton variant="form" cardCount={1} />}>
              <AgencyPayrollSetupTab scope={{ audience: "agency", actorUid: user.uid, agencyId: user.agencyId }} active={activeTab === "payrollSetup"} />
            </Suspense>
          </TabPanel>
        )}

      </div>

      </div>

    </div>

  );

}


