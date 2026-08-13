import { useState, useEffect, lazy, Suspense, useMemo, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router";
import AccountTab from "./components/AccountTab";
import SettingsTabNav, { SettingsTabId, SettingsTabItem } from "./components/SettingsTabNav";
import SettingsTabSkeleton from "./components/SettingsTabSkeleton";
import { TabPanel } from "@/pages/shared/settings";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types";

const AgencyInfoTab = lazy(() => import("./components/AgencyInfoTab"));
const NotificationsTab = lazy(() => import("./components/NotificationTab"));
const UserLevelsTab = lazy(() => import("./components/UserLevelsTab"));
const AgencyPayrollSetupTab = lazy(() => import("./components/AgencyPayrollSetupTab"));



export default function AgencySettingsPage() {

  const { user } = useAuth();

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<SettingsTabId>("account");

  const [visitedTabs, setVisitedTabs] = useState<Set<SettingsTabId>>(() => new Set(["account"]));
  const canOpenPayrollSetup = user?.canOpenAgencyPayrollSetup === true;



  useEffect(() => {

    if (location.state?.activeTab === "userLevels") {

      setActiveTab("userLevels");

      setVisitedTabs((prev) => new Set(prev).add("userLevels"));

    }

  }, [location.state]);

  useEffect(() => {
    const requested = searchParams.get("tab");
    const removePayrollQuery = () => {
      const next = new URLSearchParams(searchParams);
      next.delete("tab");
      setSearchParams(Object.fromEntries(next.entries()), { replace: true });
    };
    if (requested === "payrollSetup" && (!canOpenPayrollSetup || !user?.uid || !user.agencyId)) { setActiveTab("account"); setVisitedTabs((prev) => { const next = new Set(prev); next.delete("payrollSetup"); return next; }); removePayrollQuery(); return; }
    if (requested && requested !== "payrollSetup") { setActiveTab("account"); removePayrollQuery(); return; }
    if ((!canOpenPayrollSetup || !user?.uid || !user.agencyId) && activeTab === "payrollSetup") { setActiveTab("account"); setVisitedTabs((prev) => { const next = new Set(prev); next.delete("payrollSetup"); return next; }); removePayrollQuery(); return; }
    if (requested === "payrollSetup" && canOpenPayrollSetup) { setActiveTab("payrollSetup"); setVisitedTabs((prev) => new Set(prev).add("payrollSetup")); }
  }, [searchParams, canOpenPayrollSetup, activeTab, setSearchParams, user?.uid, user?.agencyId]);



  const showTeamTab =

    (user?.userType === UserType.AGENCY_STAFF &&

      user?.profile?.accessList?.includes("User Levels")) ||

    user?.userType === UserType.AGENCY;



  const tabs = useMemo(() => {

    const items: SettingsTabItem[] = [

      { id: "account", label: "Account" },

      { id: "agencyInfo", label: "Agency Information" },

      { id: "notification", label: "Notifications" },

    ];

    if (showTeamTab) {

      items.push({ id: "userLevels", label: "Staff Management" });

    }
    if (canOpenPayrollSetup) items.push({ id: "payrollSetup", label: "Payroll Setup" });

    return items;

  }, [showTeamTab, canOpenPayrollSetup]);



  const handleTabChange = useCallback((tabId: SettingsTabId) => {

    setActiveTab(tabId);

    setVisitedTabs((prev) => new Set(prev).add(tabId));
    if (tabId === "payrollSetup") setSearchParams({ tab: "payrollSetup" }); else setSearchParams({});

  }, [setSearchParams]);



  return (

    <div className="min-w-0">

      <div className="mb-6">

        <h1 className="text-[40px] font-semibold leading-[1.4] text-[#10141a]">Settings</h1>

        <p className="mt-1 text-[14px] text-[#808081]">

          Manage your account, agency profile, notifications, and staff access.

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

              <NotificationsTab />

            </Suspense>

          </TabPanel>

        )}



        {showTeamTab && visitedTabs.has("userLevels") && (

          <TabPanel tabId="userLevels" activeTab={activeTab}>

            <Suspense fallback={<SettingsTabSkeleton variant="form" cardCount={2} />}>

              <UserLevelsTab />

            </Suspense>

          </TabPanel>

        )}

        {canOpenPayrollSetup && visitedTabs.has("payrollSetup") && user?.uid && user.agencyId && (
          <TabPanel tabId="payrollSetup" activeTab={activeTab}>
            <Suspense fallback={<SettingsTabSkeleton variant="form" cardCount={2} />}>
              <AgencyPayrollSetupTab scope={{ audience: "agency", actorUid: user.uid, agencyId: user.agencyId }} />
            </Suspense>
          </TabPanel>
        )}

      </div>

    </div>

  );

}


