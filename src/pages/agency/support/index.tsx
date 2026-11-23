import { useParams, useSearchParams } from "react-router";
import { LifeBuoy } from "lucide-react";
import { MessagingPage } from "@/components/chat/MessagingPage";
import { AgencyPageHeader } from "@/components/agency/AgencyShell";
import { AskSupportPanel } from "@/components/support/AskSupportPanel";
import { SupportDesk } from "@/components/support/SupportDesk";
import { ViewSwitch } from "@/components/support/ViewSwitch";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { Routes } from "@/routes/constants";

const BASE = Routes.agency.support;
type View = "cases" | "messages" | "careonboard";

/**
 * Agency Support: the support desk your staff's questions land on (the assistant
 * answers first), direct messages, and a way to ask CareOnboard for help.
 */
export default function AgencySupportPage() {
  const programMode = useEffectiveAgencyMode();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("view");
  const view: View = conversationId || requested === "messages" ? "messages" : requested === "careonboard" ? "careonboard" : "cases";

  const switcher = (
    <ViewSwitch
      label="Support views"
      value={view}
      options={[
        { value: "cases", label: "Staff cases", to: BASE },
        { value: "messages", label: "Messages", to: `${BASE}?view=messages` },
        { value: "careonboard", label: "Ask CareOnboard", to: `${BASE}?view=careonboard` },
      ]}
    />
  );

  if (view === "messages") {
    return (
      <MessagingPage
        pageTitle="Support"
        basePath={BASE}
        buttonColor="#2563eb"
        showFilterTabs={true}
        programMode={programMode}
        headerSlot={switcher}
      />
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-160px)] flex-col gap-5 px-4 py-4 sm:px-6">
      <AgencyPageHeader
        icon={LifeBuoy}
        title="Support"
        description={view === "careonboard"
          ? "Questions for the CareOnboard team about the platform, billing or your account."
          : "Your staff's questions. The assistant answers from your help articles first and hands the rest to your support team."}
        actions={switcher}
      />
      {view === "careonboard" ? (
        <div className="flex min-h-[600px] flex-1 flex-col">
          <AskSupportPanel
            deskName="CareOnboard"
            contextPage={BASE}
            showUrgentOption={false}
            placeholder="For example: our 837P batch was rejected with a 999 error. What should we check?"
          />
        </div>
      ) : (
        <SupportDesk desk="agency" />
      )}
    </div>
  );
}
