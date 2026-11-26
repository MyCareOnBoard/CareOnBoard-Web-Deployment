import { useParams, useSearchParams } from "react-router";
import { LifeBuoy } from "lucide-react";
import { MessagingPage } from "@/components/chat/MessagingPage";
import { AgencyPageHeader } from "@/components/agency/AgencyShell";
import { AskSupportPanel } from "@/components/support/AskSupportPanel";
import { SupportDesk } from "@/components/support/SupportDesk";
import { ViewSwitch } from "@/components/support/ViewSwitch";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { isProgramScopedRole } from "@/lib/roleLabel";
import { Routes } from "@/routes/constants";

const BASE = Routes.agency.support;
type View = "messages" | "cases" | "careonboard";

/** Field staff open on their DSP profile; other people have no agency profile page. */
function profileHref(participant: { uid: string; role: string }) {
  return isProgramScopedRole(participant.role) ? Routes.agency.dspProfile.replace(":dspId", encodeURIComponent(participant.uid)) : null;
}

/**
 * Agency Support: messages with DSPs, office staff and CareOnboard (the default
 * view), the support desk your staff's questions land on (the assistant answers
 * first), and a way to ask CareOnboard for help.
 */
export default function AgencySupportPage() {
  const programMode = useEffectiveAgencyMode();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("view");
  // A ?case= link (from a notification) opens that case on the desk.
  const view: View = conversationId ? "messages"
    : requested === "cases" || (!requested && searchParams.has("case")) ? "cases"
    : requested === "careonboard" ? "careonboard"
    : "messages";

  const switcher = (
    <ViewSwitch
      label="Support views"
      value={view}
      options={[
        { value: "messages", label: "Messages", to: BASE },
        { value: "cases", label: "Staff cases", to: `${BASE}?view=cases` },
        { value: "careonboard", label: "Ask CareOnboard", to: `${BASE}?view=careonboard` },
      ]}
    />
  );

  if (view === "messages") {
    return (
      <MessagingPage
        variant="agency"
        pageTitle="Support"
        pageIcon={LifeBuoy}
        pageDescription="Messages with DSPs, office staff and CareOnboard administration."
        basePath={BASE}
        showFilterTabs={true}
        programMode={programMode}
        headerSlot={switcher}
        getProfileHref={profileHref}
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
          : "Your staff's questions. The assistant answers first and hands the rest to your team."}
        actions={switcher}
      />
      {view === "careonboard" ? (
        <div className="flex min-h-[600px] flex-1 flex-col">
          <AskSupportPanel
            variant="agency"
            deskName="CareOnboard"
            contextPage={BASE}
            showUrgentOption={false}
            placeholder="For example: our 837P batch was rejected with a 999 error. What should we check?"
          />
        </div>
      ) : (
        <SupportDesk desk="agency" variant="agency" />
      )}
    </div>
  );
}
