import { useEffect, useState } from "react";
import { Clock, MessageSquare, Plus, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import CustomDatePicker from "@/components/ui/datePicker";
import { AgencySearchField, agencyOutlineButton } from "@/components/agency/AgencyListKit";
import { useDeleteConversationMutation, useListConversationsQuery, type Conversation } from "../api";
import { cn } from "@/lib/utils";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";

interface ConversationsSidebarProps {
  open: boolean;
  activeId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
}

/** A conversation's last activity as a Date: ISO strings, epoch numbers or Firestore timestamps. */
function activityDate(conversation: Conversation): Date | undefined {
  const value = conversation.lastMessageAt ?? conversation.createdAt;
  if (value === null || value === undefined) return undefined;
  let date: Date | undefined;
  if (value instanceof Date) date = value;
  else if (typeof value === "string") date = new Date(value);
  else if (typeof value === "number") date = new Date(Math.abs(value) < 1e12 ? value * 1000 : value);
  else if (typeof value === "object") {
    if (typeof value.toDate === "function") date = value.toDate();
    else {
      const seconds = value.seconds ?? value._seconds;
      if (typeof seconds === "number") date = new Date(seconds * 1000);
    }
  }
  return date && Number.isFinite(date.getTime()) ? date : undefined;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function ConversationsSidebar({
  open,
  activeId,
  onClose,
  onSelect,
  onNew,
}: ConversationsSidebarProps) {
  const mode = useEffectiveAgencyMode();
  // Backend scopes the list to the active DDD/HHA view (unpinned conversations show in both).
  const { data, isLoading } = useListConversationsQuery(
    { mode: mode ?? undefined },
    { skip: !open, refetchOnMountOrArgChange: true },
  );
  const [deleteConversation] = useDeleteConversationMutation();
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  // Start each visit to the history with no search or dates applied.
  useEffect(() => {
    if (!open) {
      setSearch("");
      setFromDate(null);
      setToDate(null);
    }
  }, [open]);

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    try {
      await deleteConversation(id).unwrap();
      if (activeId === id) onNew();
    } catch {
      // swallow; toast handled at page level if needed
    }
  };

  const conversations = data?.conversations ?? [];
  const term = search.trim().toLowerCase();
  // Whole days, inclusive; either end may be left open. Dates picked the wrong way round still work.
  const [rangeStart, rangeEnd] = fromDate && toDate && fromDate > toDate ? [toDate, fromDate] : [fromDate, toDate];
  const startTime = rangeStart ? new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).getTime() : undefined;
  const endTime = rangeEnd ? new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate() + 1).getTime() : undefined;
  const filtered = conversations.filter((conversation) => {
    if (term && !(conversation.title || "New conversation").toLowerCase().includes(term)) return false;
    if (startTime !== undefined || endTime !== undefined) {
      const time = activityDate(conversation)?.getTime();
      if (time === undefined) return false;
      if (startTime !== undefined && time < startTime) return false;
      if (endTime !== undefined && time >= endTime) return false;
    }
    return true;
  });
  const today = new Date();
  const todays = filtered.filter((conversation) => {
    const date = activityDate(conversation);
    return !!date && sameDay(date, today);
  });
  const groups = [
    { label: "Today", items: todays },
    { label: "Earlier", items: filtered.filter((conversation) => !todays.includes(conversation)) },
  ].filter((group) => group.items.length > 0);
  const filtering = !!term || !!fromDate || !!toDate;

  const select = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent showCloseButton={false} className="flex max-h-[calc(100vh-48px)] w-[calc(100vw-32px)] max-w-[560px] flex-col gap-0 rounded-[20px] p-0">
        <div className="flex items-start gap-3.5 border-b border-[#eceef0] px-5 py-4 dark:border-white/10">
          <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#dcdfe2] text-[#007679] dark:border-white/15 dark:text-[#7fd3d3]">
            <Clock className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[22px] font-medium leading-tight">History</DialogTitle>
            <DialogDescription className="mt-0.5 text-[14px] leading-normal text-[#4b535b]">
              Pick up a past conversation or start a new one.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close history"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] text-[#4b535b] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:border-white/15 dark:text-[#c9d1d4]"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 border-b border-[#eceef0] px-5 py-4 dark:border-white/10">
          <button type="button" onClick={onNew} className={cn(agencyOutlineButton, "w-full justify-between border-dashed")}>
            Start a new conversation
            <Plus aria-hidden="true" className="h-4 w-4" />
          </button>
          <AgencySearchField
            value={search}
            onChange={setSearch}
            placeholder="Search conversations"
            label="Search conversations"
          />
          <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <legend className="sr-only">Date range</legend>
            {([
              { label: "From", value: fromDate, set: setFromDate, align: "start" },
              { label: "To", value: toDate, set: setToDate, align: "end" },
            ] as const).map(({ label, value, set, align }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-9 shrink-0 text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">{label}</span>
                <CustomDatePicker
                  date={value}
                  setDate={set}
                  placeholder="Any date"
                  ariaLabel={`${label} date`}
                  startMonth={new Date(2000, 0)}
                  endMonth={new Date(2100, 11)}
                  align={align}
                  className="h-10 min-h-10 rounded-[10px] px-3 [--cr-field-height:40px]"
                  inputClassName="text-[14px]"
                />
              </div>
            ))}
          </fieldset>
          {filtering && (
            <div className="flex items-center justify-between text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">
              <span>{filtered.length} of {conversations.length} conversations</span>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFromDate(null);
                  setToDate(null);
                }}
                className="cursor-pointer font-medium text-[#007679] underline underline-offset-4 dark:text-[#7fd3d3]"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        <div className="min-h-[160px] flex-1 overflow-y-auto px-3 py-3">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} aria-hidden="true" className="mx-2 my-2 h-12 animate-pulse rounded-[10px] bg-[#f4f5f6] dark:bg-white/5" />
            ))}

          {!isLoading && conversations.length === 0 && (
            <p className="py-8 text-center text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">No conversations yet</p>
          )}

          {!isLoading && conversations.length > 0 && filtered.length === 0 && (
            <p className="py-8 text-center text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">No conversations match your search.</p>
          )}

          {groups.map((group) => (
            <section key={group.label} className="mb-2 last:mb-0">
              <h3 className="px-2 pb-1.5 pt-2 text-[12px] font-medium uppercase tracking-[0.08em] text-[#4b535b] dark:text-[#9aa4a8]">
                {group.label}
              </h3>
              <ul className="space-y-1">
                {group.items.map((conversation) => (
                  <li key={conversation.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-current={activeId === conversation.id ? "true" : undefined}
                      onClick={() => select(conversation.id)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          select(conversation.id);
                        }
                      }}
                      className={cn(
                        "group flex w-full cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679]",
                        activeId === conversation.id
                          ? "border-[#dcdfe2] bg-white shadow-[0_1px_2px_rgba(16,20,26,0.06)] dark:border-white/15 dark:bg-white/5"
                          : "border-transparent hover:bg-[#f4f6f7] dark:hover:bg-white/5",
                      )}
                    >
                      <MessageSquare aria-hidden="true" className="h-4 w-4 shrink-0 text-[#007679] dark:text-[#7fd3d3]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
                          {conversation.title || "New conversation"}
                        </p>
                        <p className="text-[12px] text-[#4b535b] dark:text-[#9aa4a8]">
                          {conversation.messageCount} messages
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Delete conversation"
                        onClick={(event) => handleDelete(event, conversation.id)}
                        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-[#4b535b] opacity-0 transition-opacity hover:bg-[#fdf2f1] hover:text-[#b42318] focus:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 dark:text-[#c9d1d4]"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
