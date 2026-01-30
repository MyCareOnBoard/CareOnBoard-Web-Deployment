import { MessagingPage } from "@/components/chat/MessagingPage";

export default function SuperAdminCorporateSupportPage() {
  return (
    <MessagingPage
      pageTitle="Corporate Support"
      basePath="/super-admin/corporate-support"
      buttonColor="#00b8d4"
      showFilterTabs={true}
      showAgencyName={true}
    />
  );
}
