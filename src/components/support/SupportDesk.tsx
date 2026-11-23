import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, BookPlus, CheckCircle2, ExternalLink, Loader2, RotateCcw, Search, Settings2, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/utils/auth";
import {
  AGENT_STATUS_LABELS,
  getAgentCase,
  getSuggestedReply,
  getSupportQueue,
  replyToCase,
  transferCaseToCareOnboard,
  supportErrorCode,
  supportErrorMessage,
  updateCase,
  type SupportCase,
  type SupportCaseDetail,
  type SupportDesk as Desk,
  type SupportPriority,
  type SupportQueue,
  type SupportQueueQuery,
} from "@/lib/api/support";
import { PriorityChip, StatusChip, SupportComposer, SupportThread, formatTime, relativeDue } from "./SupportThread";
import { SupportTeamDrawer, fieldClass, primaryButton, secondaryButton } from "./SupportTeamDrawer";
import { KnowledgeBasePanel, type ArticleDraft } from "./KnowledgeBasePanel";
import { SupportReportsPanel } from "./SupportReportsPanel";

const POLL_QUEUE_MS = 20000;
const POLL_CASE_MS = 10000;

type DeskTab = "cases" | "articles" | "reports";
type StatusFilter = NonNullable<SupportQueueQuery["status"]>;

const STATUS_FILTERS: { value: StatusFilter; label: string; count: keyof SupportQueue["counts"] }[] = [
  { value: "open", label: "All open", count: "all" },
  { value: "waiting", label: "Needs reply", count: "waiting" },
  { value: "pending_user", label: "Waiting on person", count: "pending_user" },
  { value: "ai", label: "With assistant", count: "ai" },
  { value: "resolved", label: "Resolved", count: "resolved" },
];

/**
 * An agent's support desk: the case queue, the open case with its details, the
 * knowledge base and the desk's reports. Used by agencies (desk "agency") and by
 * CareOnboard's super admins (desk "corporate").
 */
export function SupportDesk({ desk, headerSlot }: { desk: Desk; headerSlot?: ReactNode }) {
  const { user } = useAuth();
  const myUid = (user as { uid?: string } | null)?.uid;
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("case");
  const [tab, setTab] = useState<DeskTab>("cases");
  const [teamOpen, setTeamOpen] = useState(false);
  const [articleDraft, setArticleDraft] = useState<ArticleDraft | null>(null);

  const [filters, setFilters] = useState<Omit<SupportQueueQuery, "desk">>({ status: "open", assignee: "all" });
  const [searchText, setSearchText] = useState("");
  const [queue, setQueue] = useState<SupportQueue | null>(null);
  const [queueError, setQueueError] = useState<{ code?: string; message: string } | null>(null);
  const [detail, setDetail] = useState<SupportCaseDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const query = useMemo<SupportQueueQuery>(() => ({ desk, ...filters, search: searchText.trim() || undefined }), [desk, filters, searchText]);

  const loadQueue = useCallback(async () => {
    try {
      setQueue(await getSupportQueue(query));
      setQueueError(null);
    } catch (error) {
      setQueueError({ code: supportErrorCode(error), message: supportErrorMessage(error, "Cases could not be loaded.") });
    }
  }, [query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadQueue(), searchText ? 300 : 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadQueue();
    }, POLL_QUEUE_MS);
    return () => { window.clearTimeout(timeout); window.clearInterval(timer); };
  }, [loadQueue, searchText]);

  const selectCase = useCallback((id: string | null) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (id) next.set("case", id);
      else next.delete("case");
      return next;
    });
  }, [setSearchParams]);

  const openId = useRef<string | null>(null);
  useEffect(() => {
    openId.current = selectedId;
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    const load = async () => {
      try {
        const next = await getAgentCase(selectedId);
        if (!cancelled && openId.current === selectedId) setDetail(next);
      } catch (error) {
        if (!cancelled) {
          toast.error(supportErrorMessage(error, "That case could not be opened."));
          selectCase(null);
        }
      }
    };
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_CASE_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [selectedId, selectCase]);

  const apply = (next: SupportCaseDetail) => {
    setDetail(next);
    setQueue((current) => current ? { ...current, cases: current.cases.map((c) => (c.id === next.case.id ? next.case : c)) } : current);
  };
  const run = async (action: () => Promise<SupportCaseDetail>, failure: string) => {
    setBusy(true);
    try {
      apply(await action());
      void loadQueue();
      return true;
    } catch (error) {
      toast.error(supportErrorMessage(error, failure));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const agencies = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of queue?.cases ?? []) if (c.agencyId) map.set(c.agencyId, c.agencyName || c.agencyId);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [queue]);

  const notOnTeam = queueError?.code === "NOT_ON_TEAM";
  const open = detail && detail.case.id === selectedId ? detail : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {headerSlot}
          {!notOnTeam && (
            <nav aria-label="Support desk sections" className="inline-flex rounded-full bg-[#eef2f3] p-1 dark:bg-white/10">
              {(["cases", "articles", "reports"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)}
                  className={cn("inline-flex h-8 cursor-pointer items-center rounded-full px-3.5 text-[13px] font-medium", tab === value ? "bg-white text-[#10141a] shadow-[0_1px_2px_rgba(16,40,44,0.12)] dark:bg-[#2a3138] dark:text-[#f4f6f7]" : "text-[#5d6b73] hover:text-[#10141a] dark:text-[#9aa4a8]")}>
                  {value === "cases" ? "Cases" : value === "articles" ? "Knowledge base" : "Reports"}
                </button>
              ))}
            </nav>
          )}
        </div>
        {!notOnTeam && (
          <button type="button" className={secondaryButton} onClick={() => setTeamOpen(true)}>
            <Settings2 aria-hidden="true" className="h-4 w-4" />Support team
          </button>
        )}
      </div>

      {notOnTeam ? (
        <div className="rounded-[16px] border border-dashed border-[#cfd8db] p-8 text-center dark:border-white/15">
          <UserRound aria-hidden="true" className="mx-auto h-8 w-8 text-[#5d6b73]" />
          <p className="mt-2 text-[15px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">You&apos;re not on the support team</p>
          <p className="mt-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{queueError?.message}</p>
        </div>
      ) : tab === "articles" ? (
        <KnowledgeBasePanel desk={desk} categories={queue?.categories ?? []} draft={articleDraft} onDraftHandled={() => setArticleDraft(null)} />
      ) : tab === "reports" ? (
        <SupportReportsPanel desk={desk} />
      ) : (
        <div className="grid min-h-[560px] flex-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <section aria-label="Cases" className={cn("min-h-0 flex-col", selectedId ? "hidden lg:flex" : "flex")}>
            <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              {STATUS_FILTERS.map((option) => {
                const active = (filters.status ?? "open") === option.value;
                return (
                  <button key={option.value} type="button" aria-pressed={active} onClick={() => setFilters({ ...filters, status: option.value })}
                    className={cn("inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium", active ? "border-[#007679] bg-[#007679] text-white" : "border-[#e3e8ea] text-[#10141a] hover:bg-[#f3f5f6] dark:border-white/15 dark:text-[#f4f6f7]")}>
                    {option.label}
                    {queue && <span className={cn("tabular-nums", active ? "text-white/85" : "text-[#5d6b73]")}>{queue.counts[option.count] ?? 0}</span>}
                  </button>
                );
              })}
            </div>
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              <label className="sr-only" htmlFor={`${desk}-assignee`}>Assigned to</label>
              <select id={`${desk}-assignee`} value={filters.assignee ?? "all"} onChange={(e) => setFilters({ ...filters, assignee: e.target.value as SupportQueueQuery["assignee"] })} className={fieldClass}>
                <option value="all">Anyone</option>
                <option value="me">Mine{queue ? ` (${queue.counts.mine})` : ""}</option>
                <option value="unassigned">Unassigned{queue ? ` (${queue.counts.unassigned})` : ""}</option>
              </select>
              <label className="sr-only" htmlFor={`${desk}-priority`}>Priority</label>
              <select id={`${desk}-priority`} value={filters.priority ?? ""} onChange={(e) => setFilters({ ...filters, priority: (e.target.value || undefined) as SupportPriority | undefined })} className={fieldClass}>
                <option value="">Any priority</option>
                <option value="urgent">Urgent{queue ? ` (${queue.counts.urgent})` : ""}</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
              </select>
              <label className="sr-only" htmlFor={`${desk}-category`}>Topic</label>
              <select id={`${desk}-category`} value={filters.category ?? ""} onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })} className={fieldClass}>
                <option value="">Any topic</option>
                {(queue?.categories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {desk === "corporate" ? (
                <>
                  <label className="sr-only" htmlFor="corporate-agency">Agency</label>
                  <select id="corporate-agency" value={filters.agencyId ?? ""} onChange={(e) => setFilters({ ...filters, agencyId: e.target.value || undefined })} className={fieldClass}>
                    <option value="">All agencies</option>
                    {agencies.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </>
              ) : (
                <label className="flex items-center gap-1.5 text-[12.5px] text-[#10141a] dark:text-[#f4f6f7]">
                  <input type="checkbox" checked={filters.overdue === true} onChange={(e) => setFilters({ ...filters, overdue: e.target.checked || undefined })} className="h-4 w-4 accent-[#007679]" />
                  Overdue{queue ? ` (${queue.counts.overdue})` : ""}
                </label>
              )}
            </div>
            <span className="relative mb-2 block">
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a969c]" />
              <label htmlFor={`${desk}-search`} className="sr-only">Search cases</label>
              <input id={`${desk}-search`} value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by name, case number or text" className={cn(fieldClass, "pl-8")} />
            </span>
            <CaseQueueList queue={queue} error={queueError?.message} selectedId={selectedId} onSelect={selectCase} desk={desk} />
          </section>

          <section aria-label="Case" className={cn("min-h-0 flex-col rounded-[16px] border border-[#e3e8ea] dark:border-white/10", selectedId ? "flex" : "hidden lg:flex")}>
            {open ? (
              <CaseDetail
                detail={open}
                desk={desk}
                myUid={myUid}
                team={queue?.team ?? []}
                categories={queue?.categories ?? []}
                busy={busy}
                onBack={() => selectCase(null)}
                onReply={(text, internal) => run(() => replyToCase(open.case.id, text, internal), internal ? "The note was not saved." : "Your reply was not sent.")}
                onUpdate={(patch) => run(() => updateCase(open.case.id, patch), "The case was not updated.")}
                onSaveArticle={(draft) => { setArticleDraft(draft); setTab("articles"); }}
                onTransfer={desk === "agency" ? async (note) => {
                  setBusy(true);
                  try {
                    await transferCaseToCareOnboard(open.case.id, note);
                    toast.success("Sent to CareOnboard support. They'll reply to the person directly.");
                    selectCase(null);
                    void loadQueue();
                  } catch (error) {
                    toast.error(supportErrorMessage(error, "The case was not sent."));
                  } finally {
                    setBusy(false);
                  }
                } : undefined}
              />
            ) : selectedId ? (
              <div className="grid flex-1 place-items-center"><Loader2 aria-label="Loading case" className="h-6 w-6 animate-spin text-[#5d6b73]" /></div>
            ) : (
              <div className="grid flex-1 place-items-center p-8 text-center text-[13.5px] text-[#5d6b73] dark:text-[#9aa4a8]">Pick a case to read and reply.</div>
            )}
          </section>
        </div>
      )}

      <SupportTeamDrawer desk={desk} open={teamOpen} onOpenChange={setTeamOpen} onSaved={() => void loadQueue()} />
    </div>
  );
}

function CaseQueueList({ queue, error, selectedId, onSelect, desk }: { queue: SupportQueue | null; error?: string; selectedId: string | null; onSelect: (id: string) => void; desk: Desk }) {
  if (!queue) {
    return error
      ? <p className="rounded-[12px] bg-[#fde8e8] p-3 text-[13px] text-[#7a271a]">{error}</p>
      : <div className="grid place-items-center py-10"><Loader2 aria-label="Loading cases" className="h-5 w-5 animate-spin text-[#5d6b73]" /></div>;
  }
  if (!queue.cases.length) return <p className="rounded-[12px] bg-[#f4f6f7] p-4 text-[13px] text-[#5d6b73] dark:bg-white/5 dark:text-[#9aa4a8]">No cases match.</p>;
  return (
    <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
      {queue.cases.map((item) => (
        <li key={item.id}>
          <button type="button" onClick={() => onSelect(item.id)} aria-current={item.id === selectedId ? "true" : undefined}
            className={cn("mb-1.5 w-full cursor-pointer rounded-[12px] border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679]",
              item.id === selectedId ? "border-[#007679] bg-[#f2fbfb] dark:bg-[#00686b]/15" : item.urgent && item.status !== "resolved" ? "border-[#f3c1bc] bg-[#fff8f7] dark:border-[#b42318]/40 dark:bg-[#b42318]/10" : "border-[#e3e8ea] hover:bg-[#f7f9f9] dark:border-white/10 dark:hover:bg-white/5")}>
            <span className="flex items-center gap-2">
              <span className="truncate text-[13.5px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{item.requesterName}</span>
              {desk === "corporate" && item.agencyName && <span className="truncate text-[12px] text-[#5d6b73]">· {item.agencyName}</span>}
              {desk === "corporate" && item.requesterType === "employee" && <span className="shrink-0 rounded-full bg-[#eef1ff] px-1.5 text-[11px] text-[#3446a8] dark:bg-[#3446a8]/25 dark:text-[#aab6ff]">Field staff</span>}
              <span className="ml-auto shrink-0 text-[11.5px] text-[#8a969c]">{formatTime(item.lastMessageAt)}</span>
            </span>
            <span className="mt-0.5 block truncate text-[12.5px] text-[#10141a] dark:text-[#f4f6f7]">{item.subject}</span>
            <span className="mt-0.5 block truncate text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{item.lastMessage}</span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <StatusChip status={item.status} label={AGENT_STATUS_LABELS[item.status]} className="h-5 px-2 text-[11px]" />
              <PriorityChip priority={item.priority} />
              {item.overdue && <span className="text-[11.5px] font-medium text-[#b42318]">{relativeDue(item.replyDueAt)}</span>}
              {!item.overdue && item.status === "waiting" && item.replyDueAt && <span className="text-[11.5px] text-[#5d6b73]">{relativeDue(item.replyDueAt)}</span>}
              <span className="ml-auto text-[11.5px] text-[#8a969c]">{item.assigneeName || (item.status === "waiting" ? "Unassigned" : "")}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-2">
      <dt className="text-[11.5px] font-medium uppercase tracking-wide text-[#8a969c]">{label}</dt>
      <dd className="mt-1 text-[13px] text-[#10141a] dark:text-[#f4f6f7]">{children}</dd>
    </div>
  );
}

function CaseDetail({ detail, desk, myUid, team, categories, busy, onBack, onReply, onUpdate, onSaveArticle, onTransfer }: {
  detail: SupportCaseDetail;
  desk: Desk;
  myUid?: string;
  team: SupportQueue["team"];
  categories: string[];
  busy: boolean;
  onBack: () => void;
  onReply: (text: string, internal: boolean) => Promise<boolean>;
  onUpdate: (patch: Parameters<typeof updateCase>[1]) => Promise<boolean>;
  onSaveArticle: (draft: ArticleDraft) => void;
  /** Agency desk only: pass the case to CareOnboard support. */
  onTransfer?: (note: string) => Promise<void>;
}) {
  const { case: item, messages, notes = [], requester, relatedCases = [] } = detail;
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [suggestion, setSuggestion] = useState<string | undefined>(undefined);
  const [suggesting, setSuggesting] = useState(false);
  const [issueUrl, setIssueUrl] = useState(item.linkedIssue?.url ?? "");
  const [issueLabel, setIssueLabel] = useState(item.linkedIssue?.label ?? "");
  const [transferring, setTransferring] = useState(false);
  const [transferNote, setTransferNote] = useState("");
  useEffect(() => {
    setSuggestion(undefined);
    setMode("reply");
    setTransferring(false);
    setTransferNote("");
    setIssueUrl(item.linkedIssue?.url ?? "");
    setIssueLabel(item.linkedIssue?.label ?? "");
  }, [item.id, item.linkedIssue?.url, item.linkedIssue?.label]);

  const suggest = async () => {
    setSuggesting(true);
    try {
      const result = await getSuggestedReply(item.id);
      if (result.reply) {
        setMode("reply");
        setSuggestion(result.reply);
      } else {
        toast.info("No suggestion this time. The articles may not cover it.");
      }
    } catch (error) {
      toast.error(supportErrorMessage(error, "No suggestion this time."));
    } finally {
      setSuggesting(false);
    }
  };

  const lastAgentReply = [...messages].reverse().find((m) => m.senderType === "agent");
  const assigneeOptions = team.some((m) => m.uid === myUid) || !myUid ? team : [...team, { uid: myUid, name: "Me", role: "agent" }];

  return (
    <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-h-0 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-[#e3e8ea] px-4 py-3 dark:border-white/10">
          <button type="button" onClick={onBack} aria-label="Back to cases" className="grid h-8 w-8 cursor-pointer place-items-center rounded-full hover:bg-[#f1f3f4] lg:hidden dark:hover:bg-white/10"><ArrowLeft aria-hidden="true" className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{item.subject}</h2>
            <p className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{item.caseNumber} · {item.requesterName}{item.agencyName ? ` · ${item.agencyName}` : ""}{item.escalationLabel ? ` · ${item.escalationLabel}` : ""}</p>
          </div>
          <PriorityChip priority={item.priority} />
          <StatusChip status={item.status} label={AGENT_STATUS_LABELS[item.status]} />
          {item.status === "resolved" ? (
            <button type="button" className={secondaryButton} disabled={busy} onClick={() => void onUpdate({ status: "waiting" })}><RotateCcw aria-hidden="true" className="h-4 w-4" />Reopen</button>
          ) : (
            <button type="button" className={primaryButton} disabled={busy} onClick={() => void onUpdate({ status: "resolved" })}><CheckCircle2 aria-hidden="true" className="h-4 w-4" />Resolve</button>
          )}
        </header>
        {item.urgent && item.status !== "resolved" && (
          <div role="alert" className="mx-4 mt-3 flex items-start gap-2 rounded-[12px] bg-[#fde8e8] p-3 text-[13px] text-[#7a271a] dark:bg-[#b42318]/20 dark:text-[#ffb4ab]">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p><span className="font-semibold">Urgent.</span> The person may be hurt or unsafe. Reply now, and follow your incident process. The assistant did not answer this one.</p>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <SupportThread messages={messages} viewer="agent" />
        </div>
        <div className="border-t border-[#e3e8ea] p-3 dark:border-white/10">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full bg-[#eef2f3] p-0.5 dark:bg-white/10" role="group" aria-label="Reply or internal note">
              {(["reply", "note"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}
                  className={cn("h-7 cursor-pointer rounded-full px-3 text-[12.5px] font-medium", mode === value ? "bg-white text-[#10141a] shadow-sm dark:bg-[#2a3138] dark:text-[#f4f6f7]" : "text-[#5d6b73]")}>
                  {value === "reply" ? `Reply to ${item.requesterName?.split(" ")[0] || "person"}` : "Internal note"}
                </button>
              ))}
            </div>
            {mode === "reply" && (
              <button type="button" onClick={() => void suggest()} disabled={suggesting} className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full bg-[#e3f6f6] px-3 text-[12.5px] font-medium text-[#00686b] hover:bg-[#d3efef] disabled:opacity-60 dark:bg-[#00686b]/25 dark:text-[#7fd3d3]">
                {suggesting ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />}Suggest a reply
              </button>
            )}
          </div>
          <SupportComposer
            key={`${item.id}-${mode}`}
            tone={mode === "note" ? "note" : "default"}
            label={mode === "note" ? "Internal note" : "Reply"}
            busy={busy}
            initialValue={mode === "reply" ? suggestion : undefined}
            placeholder={mode === "note" ? "Only your team sees this" : "Write a reply. Enter sends, Shift+Enter for a new line."}
            onSend={async (text) => {
              const sent = await onReply(text, mode === "note");
              if (sent) setSuggestion(undefined);
              return sent;
            }}
          />
        </div>
      </div>

      <aside aria-label="Case details" className="max-h-[40vh] min-h-0 overflow-y-auto border-t border-[#e3e8ea] px-4 py-3 xl:max-h-none xl:border-l xl:border-t-0 dark:border-white/10">
        <dl>
          <DetailRow label="Person">
            <span className="block font-semibold">{requester?.name || item.requesterName}</span>
            {requester?.email && <span className="block text-[12px] text-[#5d6b73]">{requester.email}</span>}
            <span className="block text-[12px] text-[#5d6b73]">{(requester?.userType || item.requesterType || "").replace("_", " ")}</span>
          </DetailRow>
          <DetailRow label="Assigned to">
            <div className="flex gap-1.5">
              <label className="sr-only" htmlFor={`assignee-${item.id}`}>Assigned to</label>
              <select id={`assignee-${item.id}`} value={item.assigneeId ?? ""} disabled={busy} onChange={(e) => void onUpdate({ assigneeId: e.target.value || null })} className={fieldClass}>
                <option value="">Unassigned</option>
                {item.assigneeId && !assigneeOptions.some((m) => m.uid === item.assigneeId) && <option value={item.assigneeId}>{item.assigneeName}</option>}
                {assigneeOptions.map((m) => <option key={m.uid} value={m.uid}>{m.uid === myUid ? `${m.name} (me)` : m.name}</option>)}
              </select>
              {myUid && item.assigneeId !== myUid && <button type="button" className={cn(secondaryButton, "h-9 px-3")} disabled={busy} onClick={() => void onUpdate({ assigneeId: myUid })}>Take</button>}
            </div>
          </DetailRow>
          <DetailRow label="Priority">
            <select aria-label="Priority" value={item.priority} disabled={busy} onChange={(e) => void onUpdate({ priority: e.target.value as SupportPriority })} className={fieldClass}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </DetailRow>
          <DetailRow label="Topic">
            <select aria-label="Topic" value={item.category ?? ""} disabled={busy} onChange={(e) => void onUpdate({ category: e.target.value || null })} className={fieldClass}>
              <option value="">None</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </DetailRow>
          {item.status === "waiting" && item.replyDueAt && (
            <DetailRow label="Reply target"><span className={cn(item.overdue && "font-semibold text-[#b42318]")}>{relativeDue(item.replyDueAt)}</span></DetailRow>
          )}
          {item.transferredFrom && (
            <DetailRow label="Passed on">
              {item.transferredFrom.byName ? `By ${item.transferredFrom.byName}` : "By the agency"}{item.agencyName ? ` at ${item.agencyName}` : ""}{item.transferredFrom.at ? `, ${formatTime(item.transferredFrom.at)}` : ""}
            </DetailRow>
          )}
          {onTransfer && item.status !== "resolved" && (
            <DetailRow label="CareOnboard support">
              {transferring ? (
                <form className="flex flex-col gap-1.5" onSubmit={(e) => { e.preventDefault(); void onTransfer(transferNote.trim()); }}>
                  <label htmlFor={`transfer-${item.id}`} className="text-[12px] text-[#5d6b73]">Note for CareOnboard (optional, the person won&apos;t see it)</label>
                  <textarea id={`transfer-${item.id}`} value={transferNote} maxLength={2000} rows={3} onChange={(e) => setTransferNote(e.target.value)}
                    className="w-full resize-y rounded-[8px] border border-[#e3e8ea] bg-white p-2 text-[13px] outline-none focus:border-[#007679] dark:border-white/15 dark:bg-[#1b232b]" />
                  <p className="text-[12px] text-[#5d6b73]">The case leaves your queue and CareOnboard replies to the person here.</p>
                  <div className="flex gap-1.5">
                    <button type="submit" className={primaryButton} disabled={busy}>Send</button>
                    <button type="button" className={secondaryButton} onClick={() => setTransferring(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button type="button" className="cursor-pointer text-[13px] font-medium text-[#007679] hover:underline dark:text-[#7fd3d3]" onClick={() => setTransferring(true)}>
                  Send to CareOnboard support
                </button>
              )}
            </DetailRow>
          )}
          {item.context?.page && <DetailRow label="Asked from"><code className="text-[12px]">{item.context.page}</code></DetailRow>}
          {desk === "corporate" && (
            <DetailRow label="Linked issue">
              {item.linkedIssue ? (
                <span className="flex items-center gap-2">
                  <a href={item.linkedIssue.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[#007679] hover:underline dark:text-[#7fd3d3]">{item.linkedIssue.label || "Open issue"}<ExternalLink aria-hidden="true" className="h-3 w-3" /></a>
                  <button type="button" className="cursor-pointer text-[12px] text-[#5d6b73] hover:underline" onClick={() => void onUpdate({ linkedIssue: null })}>Remove</button>
                </span>
              ) : (
                <form className="flex flex-col gap-1.5" onSubmit={(e) => { e.preventDefault(); if (/^https?:\/\//.test(issueUrl)) void onUpdate({ linkedIssue: { url: issueUrl.trim(), label: issueLabel.trim() } }); }}>
                  <input aria-label="Issue link" type="url" value={issueUrl} onChange={(e) => setIssueUrl(e.target.value)} placeholder="https://…" className={fieldClass} />
                  <input aria-label="Issue label" value={issueLabel} onChange={(e) => setIssueLabel(e.target.value)} placeholder="Label, such as BUG-142" className={fieldClass} />
                  <button type="submit" className={secondaryButton} disabled={busy || !/^https?:\/\//.test(issueUrl)}>Link issue</button>
                </form>
              )}
            </DetailRow>
          )}
          <DetailRow label="Knowledge base">
            <button type="button" className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-[#007679] hover:underline dark:text-[#7fd3d3]"
              onClick={() => onSaveArticle({ title: item.subject.slice(0, 200), body: lastAgentReply?.content ?? "", category: item.category, audience: desk === "corporate" ? "agency" : "field_staff", status: "published", sourceCaseId: item.id })}>
              <BookPlus aria-hidden="true" className="h-4 w-4" />Save answer as {desk === "corporate" ? "platform " : ""}article
            </button>
          </DetailRow>
          <DetailRow label={`Internal notes (${notes.length})`}>
            {notes.length ? (
              <ul className="flex flex-col gap-1.5">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-[8px] bg-[#fffaeb] p-2 text-[12.5px] dark:bg-[#8a5300]/15">
                    <span className="whitespace-pre-wrap">{note.content}</span>
                    <span className="mt-1 block text-[11px] text-[#8a969c]">{note.authorName} · {formatTime(note.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : <span className="text-[12.5px] text-[#5d6b73]">None yet. Switch to Internal note to add one.</span>}
          </DetailRow>
          {relatedCases.length > 0 && (
            <DetailRow label="Earlier cases">
              <ul className="flex flex-col gap-1">
                {relatedCases.map((c: SupportCase) => (
                  <li key={c.id} className="text-[12.5px]"><span className="text-[#5d6b73]">{c.caseNumber}</span> {c.subject}</li>
                ))}
              </ul>
            </DetailRow>
          )}
        </dl>
      </aside>
    </div>
  );
}
