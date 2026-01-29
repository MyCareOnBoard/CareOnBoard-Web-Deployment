import { MessagingPage } from "@/components/chat/MessagingPage";

export default function MessagesPage() {
  return (
    <MessagingPage
      pageTitle="Messages"
      basePath="/user-panel/messages"
      buttonColor="#00b8d4"
      showFilterTabs={false}
      containerClassName="bg-white shadow-sm rounded-2xl"
    />
  );
}
