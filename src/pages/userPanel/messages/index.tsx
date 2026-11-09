import { MessagingPage } from "@/components/chat/MessagingPage";
import { Routes } from "@/routes/constants";

export default function MessagesPage() {
  return (
    <MessagingPage
      pageTitle="How can we help you today?"
      basePath={Routes.userPanel.messages}
      variant="panel"
      faqHref={Routes.userPanel.helpCenter}
    />
  );
}
