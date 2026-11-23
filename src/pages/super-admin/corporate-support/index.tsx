import { useParams, useSearchParams } from "react-router";
import { MessagingPage } from "@/components/chat/MessagingPage";
import { SupportDesk } from "@/components/support/SupportDesk";
import { ViewSwitch } from "@/components/support/ViewSwitch";
import { Routes } from "@/routes/constants";

const BASE = Routes.superAdmin.corporateSupport;

/** Corporate Support: agencies' support cases (the CareOnboard assistant answers first) and direct messages. */
export default function SuperAdminCorporateSupportPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const view = conversationId || searchParams.get("view") === "messages" ? "messages" : "cases";
  const switcher = (
    <ViewSwitch
      label="Corporate Support views"
      value={view}
      options={[
        { value: "cases", label: "Agency cases", to: BASE },
        { value: "messages", label: "Messages", to: `${BASE}?view=messages` },
      ]}
    />
  );

  if (view === "messages") {
    return (
      <MessagingPage
        pageTitle="Corporate Support"
        basePath={BASE}
        buttonColor="#00b8d4"
        showFilterTabs={true}
        showAgencyName={true}
        headerSlot={switcher}
      />
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-160px)] flex-col px-4 py-4 sm:px-6">
      <div className="mb-4">
        <h1 className="text-[24px] font-bold text-[#10141a] dark:text-[#f4f6f7] sm:text-[28px]">Corporate Support</h1>
        <p className="mt-0.5 text-[13.5px] text-[#5d6b73] dark:text-[#9aa4a8]">Agencies&apos; questions. The assistant answers from platform articles first and hands the rest to the CareOnboard support team.</p>
      </div>
      <SupportDesk desk="corporate" headerSlot={switcher} />
    </div>
  );
}
