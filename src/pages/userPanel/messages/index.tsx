import { Link, useParams, useSearchParams } from "react-router";
import { MessagingPage } from "@/components/chat/MessagingPage";
import { AskSupportPanel } from "@/components/support/AskSupportPanel";
import { ViewSwitch } from "@/components/support/ViewSwitch";
import { Routes } from "@/routes/constants";

const BASE = Routes.userPanel.messages;

/**
 * Field staff Support: "Ask support" (the assistant first, then the agency's support
 * team) and "Chats" (direct messages, as before).
 */
export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const view = conversationId || searchParams.get("view") === "chats" ? "chats" : "support";
  const switcher = (
    <ViewSwitch
      label="Support views"
      value={view}
      options={[
        { value: "support", label: "Ask support", to: BASE },
        { value: "chats", label: "Chats", to: `${BASE}?view=chats` },
      ]}
    />
  );

  if (view === "chats") {
    return (
      <MessagingPage
        pageTitle="How can we help you today?"
        basePath={BASE}
        variant="panel"
        faqHref={Routes.userPanel.helpCenter}
        headerSlot={switcher}
      />
    );
  }

  return (
    <div className="flex h-[calc(100dvh-160px)] min-h-[520px] flex-col rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,44,0.06)] sm:p-6 dark:bg-[#1b232b]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">How can we help you today?</h1>
          {switcher}
        </div>
        <Link to={Routes.userPanel.helpCenter} className="inline-flex h-9 items-center rounded-full bg-[#10141a] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#2a3138] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:bg-[#f4f6f7] dark:text-[#10141a] dark:hover:bg-white">
          Check our FAQs
        </Link>
      </div>
      <AskSupportPanel deskName="your agency" contextPage={BASE} />
    </div>
  );
}
