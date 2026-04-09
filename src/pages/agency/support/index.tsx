import { MessagingPage } from "@/components/chat/MessagingPage";

export default function AgencySupportPage() {
  return (
    <MessagingPage
      pageTitle="Support"
      basePath="/agency/support"
      buttonColor="#2563eb"
      showFilterTabs={true}
    />
  );
}