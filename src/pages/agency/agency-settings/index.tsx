import { useState, useEffect, lazy, Suspense, useMemo, useCallback } from "react";
import { Navigate, useSearchParams } from "react-router";
import AccountTab from "./components/AccountTab";
import SettingsTabNav, { SettingsTabId, SettingsTabItem } from "./components/SettingsTabNav";
import SettingsTabSkeleton from "./components/SettingsTabSkeleton";
import { TabPanel } from "@/pages/shared/settings";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types";
import { canManageEmployeePayroll } from "@/lib/agency/agency-billing-permissions";
import { Routes } from "@/routes/constants";

const AgencyInfoTab = lazy(() => import("./components/AgencyInfoTab"));
const NotificationsTab = lazy(() => import("./components/NotificationTab"));
const AgencyPayrollSetupTab = lazy(() => import("./components/AgencyPayrollSetupTab"));
const MyPayrollTab = lazy(() => import("@/features/payroll/components/MyPayrollTab"));



export default function AgencySettingsPage() {

  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const [visitedTabs, setVisitedTabs] = useState<Set<SettingsTabId>>(() => new Set(["account"]));
  const isAgencyStaff = user?.userType === UserType.AGENCY_STAFF;
  const accessList = user?.profile?.accessList ?? [];
  const canOpenPayrollSetup = canManageEmployeePayroll(user?.userType, accessList)
    || user?.canOpenAgencyPayrollSetup === true;

  const tabs = useMemo(() => {

    const items: SettingsTabItem[] = [

      { id: "account", label: "Account" },

      { id: "agencyInfo", label: "Agency Information" },

      { id: "notification", label: "Notifications" },

    ];

    if (isAgencyStaff) items.push({ id: "myPayroll", label: "Payroll Setup" });
    if (canOpenPayrollSetup) items.push({ id: "payrollSetup", label: "Agency Payroll Setup" });

    return items;

  }, [isAgencyStaff, canOpenPayrollSetup]);



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

    <div className="min-w-0">

      <div className="mb-6">

        <h1 className="text-[40px] font-semibold leading-[1.4] text-[#10141a]">Settings</h1>

        <p className="mt-1 text-[14px] text-[#808081]">

          Manage your account, agency profile, and notifications.

        </p>

      </div>



      <SettingsTabNav tabs={tabs} activeTab={activeTab} onChange={handleTabChange} className="mb-6" />



      <div className="mt-6 flex min-w-0 flex-col gap-4">

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

        {canOpenPayrollSetup && visitedTabs.has("payrollSetup") && user?.uid && user.agencyId && (
          <TabPanel tabId="payrollSetup" activeTab={activeTab}>
            <Suspense fallback={<SettingsTabSkeleton variant="form" cardCount={1} />}>
              <AgencyPayrollSetupTab scope={{ audience: "agency", actorUid: user.uid, agencyId: user.agencyId }} active={activeTab === "payrollSetup"} />
            </Suspense>
          </TabPanel>
        )}

      </div>

    </div>

  );

}


