import { lazy, Suspense } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useSearchParams } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/utils/auth";
import { PersonalInfoTab } from "./PersonalInfoTab";
import { SecurityTab } from "./SecurityTab";
import { NotificationsTab } from "./NotificationsTab";

const MyPayrollTab = lazy(() => import("@/features/payroll/components/MyPayrollTab"));

const TABS = [
  { value: "personal", label: "Personal information" },
  { value: "security", label: "Account & security" },
  { value: "notifications", label: "Notification" },
  { value: "payroll", label: "Payroll setup" },
] as const;

type TabValue = (typeof TABS)[number]["value"];
const isTab = (value: string | null): value is TabValue => TABS.some((tab) => tab.value === value);
// Tab names from the old Settings page, so its links still open the right tab.
const OLD_TABS: Record<string, TabValue> = { account: "personal", notification: "notifications", payrollSetup: "payroll" };

export default function UserPanelProfilePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab: TabValue = isTab(requested) ? requested : (requested && OLD_TABS[requested]) || "personal";

  const selectTab = (next: string) => {
    if (!isTab(next)) return;
    setParams((prev) => {
      const out = new URLSearchParams(prev);
      if (next === "personal") out.delete("tab"); else out.set("tab", next);
      return out;
    }, { replace: true });
  };

  return <div className="flex min-h-[calc(100vh-200px)] flex-col">
    <div className="flex flex-1 flex-col gap-5 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,44,0.06)] sm:p-6 dark:bg-[#1b232b]">
      <h1 className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">Profile &amp; settings</h1>
      <TabsPrimitive.Root value={tab} onValueChange={selectTab} className="flex flex-col gap-6">
        <TabsPrimitive.List aria-label="Profile sections"
          className="flex w-full gap-1 overflow-x-auto rounded-[10px] bg-[#f3f5f6] p-1 sm:w-fit dark:bg-white/5">
          {TABS.map((item) => <TabsPrimitive.Trigger key={item.value} value={item.value}
            className="h-9 shrink-0 cursor-pointer rounded-[8px] px-4 text-[14px] font-medium whitespace-nowrap text-[#5d6b73] transition-colors hover:text-[#10141a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] data-[state=active]:bg-white data-[state=active]:text-[#10141a] data-[state=active]:shadow-[0_1px_2px_rgba(16,40,44,0.08)] dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7] dark:data-[state=active]:bg-[#26313a] dark:data-[state=active]:text-[#f4f6f7]">
            {item.label}
          </TabsPrimitive.Trigger>)}
        </TabsPrimitive.List>
        <TabsPrimitive.Content value="personal" className="outline-none"><PersonalInfoTab /></TabsPrimitive.Content>
        <TabsPrimitive.Content value="security" className="outline-none"><SecurityTab /></TabsPrimitive.Content>
        <TabsPrimitive.Content value="notifications" className="outline-none"><NotificationsTab /></TabsPrimitive.Content>
        <TabsPrimitive.Content value="payroll" className="outline-none">
          {user && <Suspense fallback={<Skeleton className="h-40 w-full motion-reduce:animate-none" />}>
            <MyPayrollTab active={tab === "payroll"}
              scope={{ audience: "employee", actorUid: user.uid, agencyId: user.agencyId ?? "", employmentId: user.payrollEmploymentId ?? "" }} />
          </Suspense>}
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  </div>;
}
