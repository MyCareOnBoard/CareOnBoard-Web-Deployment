import { MessagingPage } from "@/components/chat/MessagingPage";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";

export default function AgencySupportPage() {
  const programMode = useEffectiveAgencyMode();
  return (
    <MessagingPage
      pageTitle="Support"
      basePath="/agency/support"
      buttonColor="#2563eb"
      showFilterTabs={true}
      programMode={programMode}
    />
  );
}
