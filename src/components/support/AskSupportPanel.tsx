import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, MessageSquarePlus, Phone, Star, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  askForPerson,
  closeMyCase,
  createSupportCase,
  getMyCase,
  listMyCases,
  rateCase,
  sendCaseFeedback,
  sendCaseMessage,
  supportErrorMessage,
  type SupportCase,
  type SupportCaseDetail,
  type SupportMessage,
} from "@/lib/api/support";
import { PriorityChip, StatusChip, SupportComposer, SupportThread, formatTime } from "./SupportThread";

const POLL_OPEN_CASE_MS = 8000;
const POLL_LIST_MS = 30000;

/**
 * The requester's side of the support desk: their cases, a box to ask something new,
 * and the open case with the assistant's answers and the team's replies.
 */
export function AskSupportPanel({ deskName, intro, placeholder, contextPage, className, showUrgentOption = true }: {
  /** Who answers, as the person sees it: "your agency" or "CareOnboard". */
  deskName: string;
  intro?: string;
  placeholder?: string;
  /** The page the person came from, sent with a new case so the team has context. */
  contextPage?: string;
  className?: string;
  showUrgentOption?: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("case");
  const [cases, setCases] = useState<SupportCase[] | null>(null);
  const [detail, setDetail] = useState<SupportCaseDetail | null>(null);
  const [loadingCase, setLoadingCase] = useState(false);
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);

  const selectCase = useCallback((id: string | null) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (id) next.set("case", id);
      else next.delete("case");
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  const refreshList = useCallback(async () => {
    try {
      setCases(await listMyCases());
    } catch (error) {
      setCases((current) => current ?? []);
      console.error("[support] list failed", error);
    }
  }, []);

  useEffect(() => {
    void refreshList();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshList();
    }, POLL_LIST_MS);
    return () => window.clearInterval(timer);
  }, [refreshList]);

  // Load the open case, and keep it fresh while someone may still reply.
  const currentId = useRef<string | null>(null);
  useEffect(() => {
    currentId.current = selectedId;
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingCase(true);
    const load = async () => {
      try {
        const next = await getMyCase(selectedId);
        if (!cancelled && currentId.current === selectedId) setDetail(next);
      } catch (error) {
        if (!cancelled) {
          toast.error(supportErrorMessage(error, "That case could not be opened."));
          selectCase(null);
        }
      } finally {
        if (!cancelled) setLoadingCase(false);
      }
    };
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_OPEN_CASE_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedId, selectCase]);

  const apply = (next: SupportCaseDetail) => {
    setDetail(next);
    setCases((current) => {
      const rest = (current ?? []).filter((c) => c.id !== next.case.id);
      return [next.case, ...rest];
    });
  };

  const run = async (action: () => Promise<SupportCaseDetail>, failure: string) => {
    setBusy(true);
    try {
      apply(await action());
      return true;
    } catch (error) {
      toast.error(supportErrorMessage(error, failure));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const showList = !selectedId && !composing;
  const open = detail && detail.case.id === selectedId ? detail : null;

  return (
    <div className={cn("grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]", className)}>
      <section aria-label="Your support cases" className={cn("min-h-0 flex-col", showList ? "flex" : "hidden lg:flex")}>
        <button
          type="button"
          onClick={() => { selectCase(null); setComposing(true); }}
          className="mb-3 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#007679] text-[14px] font-semibold text-white transition-colors hover:bg-[#00686b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679]"
        >
          <MessageSquarePlus aria-hidden="true" className="h-4 w-4" />Ask a new question
        </button>
        <CaseList cases={cases} selectedId={selectedId} onSelect={(id) => { setComposing(false); selectCase(id); }} />
      </section>

      <section aria-label={open ? `Case ${open.case.caseNumber}` : "Ask a question"} className={cn("min-h-0 flex-col rounded-[16px] border border-[#e3e8ea] dark:border-white/10", showList ? "hidden lg:flex" : "flex")}>
        {selectedId ? (
          open ? (
            <CaseView
              detail={open}
              busy={busy}
              deskName={deskName}
              onBack={() => selectCase(null)}
              onSend={(text) => run(() => sendCaseMessage(open.case.id, text), "Your message was not sent.")}
              onFeedback={(message, helpful) => run(() => sendCaseFeedback(open.case.id, message.id, helpful), "That did not save.")}
              onAskPerson={() => run(() => askForPerson(open.case.id), "Could not reach the team.")}
              onClose={() => run(() => closeMyCase(open.case.id), "Could not close the case.")}
              onRate={(rating) => run(() => rateCase(open.case.id, rating), "Your rating did not save.")}
            />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-[#5d6b73]">{loadingCase ? <Loader2 aria-label="Loading case" className="h-6 w-6 animate-spin" /> : null}</div>
          )
        ) : (
          <NewQuestion
            deskName={deskName}
            intro={intro}
            placeholder={placeholder}
            showUrgentOption={showUrgentOption}
            onBack={cases?.length ? () => setComposing(false) : undefined}
            onCreate={async (input) => {
              setBusy(true);
              try {
                const created = await createSupportCase({ ...input, context: contextPage ? { page: contextPage } : null });
                apply(created);
                setComposing(false);
                selectCase(created.case.id);
                return true;
              } catch (error) {
                toast.error(supportErrorMessage(error, "Your question was not sent. Try again."));
                return false;
              } finally {
                setBusy(false);
              }
            }}
            busy={busy}
          />
        )}
      </section>
    </div>
  );
}

function CaseList({ cases, selectedId, onSelect }: { cases: SupportCase[] | null; selectedId: string | null; onSelect: (id: string) => void }) {
  if (cases === null) {
    return <div className="grid place-items-center py-10"><Loader2 aria-label="Loading your cases" className="h-5 w-5 animate-spin text-[#5d6b73]" /></div>;
  }
  if (!cases.length) {
    return <p className="rounded-[12px] bg-[#f4f6f7] p-4 text-[13px] leading-relaxed text-[#5d6b73] dark:bg-white/5 dark:text-[#9aa4a8]">Your questions will show up here. The assistant answers most of them right away.</p>;
  }
  return (
    <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
      {cases.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={item.id === selectedId ? "true" : undefined}
            className={cn(
              "mb-1.5 w-full cursor-pointer rounded-[12px] border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679]",
              item.id === selectedId ? "border-[#007679] bg-[#f2fbfb] dark:bg-[#00686b]/15" : "border-[#e3e8ea] hover:bg-[#f7f9f9] dark:border-white/10 dark:hover:bg-white/5",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[13.5px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{item.subject || "Question"}</span>
              {item.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#007679] px-1.5 text-[11px] font-semibold text-white">{item.unread}<span className="sr-only"> unread</span></span>}
            </span>
            <span className="mt-0.5 block truncate text-[12.5px] text-[#5d6b73] dark:text-[#9aa4a8]">{item.lastMessage}</span>
            <span className="mt-1.5 flex items-center gap-1.5">
              <StatusChip status={item.status} label={STATUS_LABELS[item.status]} className="h-5 px-2 text-[11px]" />
              {item.urgent && <PriorityChip priority="urgent" />}
              <span className="ml-auto text-[11.5px] text-[#8a969c]">{formatTime(item.lastMessageAt)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function NewQuestion({ deskName, intro, placeholder, showUrgentOption, onCreate, onBack, busy }: {
  deskName: string;
  intro?: string;
  placeholder?: string;
  showUrgentOption: boolean;
  onCreate: (input: { content: string; urgent: boolean }) => Promise<boolean>;
  onBack?: () => void;
  busy: boolean;
}) {
  const [content, setContent] = useState("");
  const [urgent, setUrgent] = useState(false);
  const id = useId();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim() || busy) return;
    if (await onCreate({ content: content.trim(), urgent })) {
      setContent("");
      setUrgent(false);
    }
  };
  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      {onBack && (
        <button type="button" onClick={onBack} className="inline-flex w-fit cursor-pointer items-center gap-1 text-[13px] font-medium text-[#007679] lg:hidden">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />Your cases
        </button>
      )}
      <div>
        <h2 className="text-[18px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">What do you need help with?</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-[#5d6b73] dark:text-[#9aa4a8]">
          {intro || `Our assistant answers from ${deskName}'s help articles. If it can't help, it passes your question to a person, right here.`}
        </p>
      </div>
      <label htmlFor={`${id}-q`} className="sr-only">Your question</label>
      <textarea
        id={`${id}-q`}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={5}
        maxLength={4000}
        placeholder={placeholder || "For example: I forgot to clock out of yesterday's shift. What do I do?"}
        className="w-full resize-y rounded-[12px] border border-[#e3e8ea] bg-white p-3 text-[14px] text-[#10141a] outline-none focus:border-[#007679] focus:ring-2 focus:ring-[#007679]/20 dark:border-white/15 dark:bg-[#1b232b] dark:text-[#f4f6f7]"
      />
      {showUrgentOption && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-[#f3d4d1] bg-[#fff8f7] p-3 text-[13px] text-[#7a271a] dark:border-[#b42318]/40 dark:bg-[#b42318]/10 dark:text-[#ffb4ab]">
          <input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#b42318]" />
          <span>
            <span className="font-semibold">This is urgent: someone may be hurt or unsafe.</span>
            <span className="block text-[12.5px] opacity-90">It skips the assistant and alerts the support team. If anyone is in danger, call 911 first.</span>
          </span>
        </label>
      )}
      <div>
        <button
          type="submit"
          disabled={busy || !content.trim()}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-[#007679] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#00686b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
          {busy ? "Finding an answer…" : "Ask"}
        </button>
      </div>
    </form>
  );
}

function CaseView({ detail, busy, deskName, onBack, onSend, onFeedback, onAskPerson, onClose, onRate }: {
  detail: SupportCaseDetail;
  busy: boolean;
  deskName: string;
  onBack: () => void;
  onSend: (text: string) => Promise<boolean>;
  onFeedback: (message: SupportMessage, helpful: boolean) => Promise<boolean>;
  onAskPerson: () => Promise<boolean>;
  onClose: () => Promise<boolean>;
  onRate: (rating: number) => Promise<boolean>;
}) {
  const { case: item, messages } = detail;
  const lastAiIndex = messages.reduce((found, message, index) => (message.senderType === "ai" ? index : found), -1);
  const awaitingFeedback = item.status === "ai" && lastAiIndex >= 0 && !messages[lastAiIndex].feedback && lastAiIndex === messages.length - 1;

  return (
    <>
      <header className="flex flex-wrap items-center gap-2 border-b border-[#e3e8ea] px-4 py-3 dark:border-white/10">
        <button type="button" onClick={onBack} aria-label="Back to your cases" className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-[#10141a] hover:bg-[#f1f3f4] lg:hidden dark:text-[#f4f6f7] dark:hover:bg-white/10">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{item.subject || "Question"}</h2>
          <p className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">
            {item.caseNumber}
            {item.desk === "corporate" && deskName !== "CareOnboard" ? " · CareOnboard support" : ""}
            {item.assigneeName && item.status !== "ai" ? ` · ${item.assigneeName} is helping you` : ""}
          </p>
        </div>
        <PriorityChip priority={item.priority} />
        <StatusChip status={item.status} label={STATUS_LABELS[item.status]} />
        {item.status !== "resolved" && (
          <button type="button" onClick={() => void onClose()} disabled={busy} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[#e3e8ea] px-3 text-[12.5px] font-medium text-[#10141a] hover:bg-[#f3f5f6] disabled:opacity-50 dark:border-white/15 dark:text-[#f4f6f7] dark:hover:bg-white/5">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />Mark solved
          </button>
        )}
      </header>

      {item.urgent && item.status !== "resolved" && (
        <div role="alert" className="mx-4 mt-3 flex items-start gap-2.5 rounded-[12px] bg-[#fde8e8] p-3 text-[13px] text-[#7a271a] dark:bg-[#b42318]/20 dark:text-[#ffb4ab]">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p><span className="font-semibold">If anyone is in danger, call 911 now.</span> The support team has been alerted and will reply here. Report incidents on the Incident page as well.</p>
          <a href="tel:911" className="ml-auto inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#b42318] px-3 text-[12.5px] font-semibold text-white"><Phone aria-hidden="true" className="h-3.5 w-3.5" />Call 911</a>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        <SupportThread
          messages={messages}
          viewer="requester"
          renderAfter={(message, index) =>
            awaitingFeedback && index === lastAiIndex ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[12.5px] text-[#5d6b73] dark:text-[#9aa4a8]">Did this answer your question?</span>
                <button type="button" disabled={busy} onClick={() => void onFeedback(message, true)} className="inline-flex h-8 cursor-pointer items-center rounded-full bg-[#007679] px-3 text-[12.5px] font-semibold text-white hover:bg-[#00686b] disabled:opacity-50">Yes, that answered it</button>
                <button type="button" disabled={busy} onClick={() => void onFeedback(message, false)} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full border border-[#e3e8ea] px-3 text-[12.5px] font-medium text-[#10141a] hover:bg-[#f3f5f6] disabled:opacity-50 dark:border-white/15 dark:text-[#f4f6f7]">
                  <UserRound aria-hidden="true" className="h-3.5 w-3.5" />No, talk to a person
                </button>
              </div>
            ) : null
          }
        />
        {busy && <p className="mt-3 flex items-center gap-2 text-[12.5px] text-[#5d6b73]"><Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />Working on it…</p>}
      </div>

      <div className="border-t border-[#e3e8ea] p-3 dark:border-white/10">
        {item.status === "resolved" && item.rating === null && item.resolvedAt && !item.aiActive && <RateCase onRate={onRate} busy={busy} />}
        {item.status === "ai" && !awaitingFeedback && (
          <button type="button" onClick={() => void onAskPerson()} disabled={busy} className="mb-2 inline-flex cursor-pointer items-center gap-1 text-[12.5px] font-medium text-[#007679] hover:underline disabled:opacity-50 dark:text-[#7fd3d3]">
            <UserRound aria-hidden="true" className="h-3.5 w-3.5" />Talk to a person at {deskName}
          </button>
        )}
        <SupportComposer
          onSend={onSend}
          busy={busy}
          label={`Reply on ${item.caseNumber}`}
          placeholder={item.status === "resolved" ? "Write here to reopen this case" : "Write a message"}
        />
      </div>
    </>
  );
}

function RateCase({ onRate, busy }: { onRate: (rating: number) => Promise<boolean>; busy: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-[12px] bg-[#f4f6f7] px-3 py-2 dark:bg-white/5">
      <span className="text-[13px] text-[#10141a] dark:text-[#f4f6f7]">How did we do?</span>
      <div className="flex" role="group" aria-label="Rate this case" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" disabled={busy} aria-label={`${value} of 5`} onMouseEnter={() => setHover(value)} onFocus={() => setHover(value)} onClick={() => void onRate(value)} className="cursor-pointer p-0.5 disabled:opacity-50">
            <Star aria-hidden="true" className={cn("h-5 w-5", value <= hover ? "fill-[#f5a524] text-[#f5a524]" : "text-[#b8c2c6]")} />
          </button>
        ))}
      </div>
    </div>
  );
}
