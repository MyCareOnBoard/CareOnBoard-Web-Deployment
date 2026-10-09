import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router";
import { Bell, Check, ClipboardCheck, FileText, LoaderCircle, Mail, MessageCircle, RefreshCw, RotateCcw, Users } from "lucide-react";
import { HeaderActionButton } from "@/components/DashboardHeader";
import BellIcon from "@/assets/icons/bell.svg?react";
import { agencyCareApi, type CareNotification } from "@/lib/api/agencyCare";
import { careError, useScopedMutation } from "./hooks";
import {
  CareButton as Button,
  CareEmpty,
  CareFailure,
  CareHeading,
  CareLoad,
  CarePanel,
  CareStatus,
  careDate,
} from "./ui";
import "./notifications.css";

export function careNotificationDestination(value?: string): string | null {
  if (!value || !value.startsWith("/agency-care/") || value.includes("\\"))
    return null;
  try {
    const url = new URL(value, "https://care.invalid");
    if (
      url.origin !== "https://care.invalid" ||
      !url.pathname.startsWith("/agency-care/") ||
      (url.pathname.startsWith("/agency-care/invitations/") &&
        !/^\/agency-care\/invitations\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(url.pathname))
    )
      return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function useCareNotificationPoll(scope: string, agencyKey: string) {
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const refresh = useRef<() => void>(() => {});
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    scope: string;
    items: CareNotification[];
    loading: boolean;
    error?: string;
  }>({ scope, items: [], loading: true });
  useEffect(() => {
    const lifetime = new AbortController();
    let request: AbortController | null = null;
    setState({ scope, items: [], loading: true });
    async function load() {
      if (
        lifetime.signal.aborted ||
        request ||
        document.visibilityState !== "visible"
      )
        return;
      const controller = new AbortController();
      request = controller;
      try {
        const data = await agencyCareApi.notifications({
          agencyKey,
          signal: controller.signal,
        });
        if (!controller.signal.aborted && currentScope.current === scope)
          setState({ scope, items: data.notifications, loading: false });
      } catch (error) {
        if (!controller.signal.aborted && currentScope.current === scope)
          setState({
            scope,
            items: [],
            loading: false,
            error: careError(error),
          });
      } finally {
        if (request === controller) request = null;
      }
    }
    refresh.current = () => void load();
    const visible = () => {
      if (document.visibilityState !== "visible") {
        request?.abort();
        request = null;
      } else void load();
    };
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => {
      lifetime.abort();
      request?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", visible);
    };
  }, [scope, agencyKey, revision]);
  return {
    items: state.scope === scope ? state.items : [],
    loading: state.scope !== scope || state.loading,
    error: state.scope === scope ? state.error : undefined,
    refresh: () => refresh.current(),
    retry: () => setRevision((value) => value + 1),
  };
}

type Inbox = ReturnType<typeof useCareNotificationPoll> & {
  read: (id: string) => Promise<void>;
  saving: boolean;
  saveError: string;
};
const Context = createContext<Inbox | null>(null);
export function CareNotificationButton() {
  const inbox = useContext(Context);
  const navigate = useNavigate();
  const unreadCount = inbox?.items.filter((item) => item.status === "unread").length ?? 0;
  return (
    <div className="relative">
      <HeaderActionButton
        icon={BellIcon}
        ariaLabel={unreadCount ? `Care notifications (${unreadCount} unread)` : "Care notifications"}
        onClick={() => navigate("/agency-care/notifications")}
      />
      {unreadCount > 0 && (
        <span aria-hidden="true" className="absolute right-[9px] top-[9px] h-[10px] w-[10px] rounded-full bg-[#d53411] border-2 border-[#eef4f5]" />
      )}
    </div>
  );
}
export function CareNotificationProvider({
  scope,
  agencyKey,
  children,
}: {
  scope: string;
  agencyKey: string;
  children: ReactNode;
}) {
  const inbox = useCareNotificationPoll(scope, agencyKey);
  const mutation = useScopedMutation(`${scope}|notification-read`);
  async function read(id: string) {
    if (!inbox.items.some((item) => item.id === id)) return;
    const result = await mutation.run(async (_operationId, signal) => {
      await agencyCareApi.readNotification(id, { agencyKey, signal });
      return true;
    });
    if (result) inbox.refresh();
  }
  return (
    <Context.Provider
      value={{
        ...inbox,
        retry: () => {
          mutation.reset();
          inbox.retry();
        },
        read,
        saving: mutation.saving,
        saveError: mutation.error,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function AgencyCareNotifications() {
  const inbox = useContext(Context);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [readingId, setReadingId] = useState<string | null>(null);
  if (!inbox)
    return (
      <CareFailure
        message="The care inbox is unavailable."
        onRetry={() => window.location.reload()}
      />
    );
  const unreadCount = inbox.items.filter((item) => item.status === "unread").length;
  const visibleItems = filter === "unread" ? inbox.items.filter((item) => item.status === "unread") : inbox.items;
  const markRead = async (id: string) => {
    setReadingId(id);
    try { await inbox.read(id); } finally { setReadingId(current => current === id ? null : current); }
  };
  return (
    <div className="ac-stack ac-inbox">
      <CareHeading
        title="Care notifications"
        description="Care updates, invitations and requests available to your agency."
        actions={
          <Button variant="outline" disabled={inbox.loading} onClick={inbox.retry}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </Button>
        }
      />
      {inbox.loading ? (
        <CareLoad />
      ) : inbox.error ? (
        <CareFailure message={inbox.error} onRetry={inbox.retry} />
      ) : (
        <CarePanel>
          <div className="ac-inbox-toolbar">
            <div className="ac-inbox-filters" role="group" aria-label="Notification filters" aria-describedby="care-notification-count-scope">
              <Button variant="ghost" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All <span>{inbox.items.length}</span></Button>
              <Button variant="ghost" aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>Unread <span>{unreadCount}</span></Button>
            </div>
            <p className="ac-inbox-result-count" role="status">{visibleItems.length} {filter === "unread" ? "unread" : "recent"} {visibleItems.length === 1 ? "notification" : "notifications"}</p>
          </div>
          <p className="ac-inbox-scope" id="care-notification-count-scope">Counts cover your loaded notifications, up to the 50 most recent available to you.</p>
          {visibleItems.length ? (
            <ul className="ac-inbox-list" aria-label="Care notifications">
              {visibleItems.map((item) => {
                const destination = careNotificationDestination(item.actionUrl);
                const Icon = notificationIcon(destination);
                const actionLabel = notificationActionLabel(destination);
                const unread = item.status === "unread";
                const markingRead = inbox.saving && readingId === item.id;
                return (
                  <li key={item.id}>
                  <article className={`ac-inbox-row${unread ? " ac-inbox-unread" : ""}`} aria-labelledby={`care-notice-${item.id}`}>
                    <span className="ac-inbox-icon" aria-hidden="true"><Icon size={20} /></span>
                    <div className="ac-inbox-copy">
                      <div className="ac-inbox-title">
                        <h3 id={`care-notice-${item.id}`}>{item.title}</h3>
                        {item.priority === "urgent" && <CareStatus tone="danger">Urgent</CareStatus>}
                        {item.priority === "high" && <CareStatus tone="warning">High priority</CareStatus>}
                      </div>
                      <p>{item.message}</p>
                      <div className="ac-inbox-meta">
                        <time dateTime={item.createdAt}>{careDate(item.createdAt)}</time>
                        <span className={`ac-inbox-read-state${unread ? " ac-inbox-read-state-unread" : ""}`}>{unread ? <span className="ac-inbox-unread-dot" aria-hidden="true" /> : <Check size={12} aria-hidden="true" />}{unread ? "Unread" : item.status === "read" ? "Read" : item.status === "archived" ? "Archived" : "Deleted"}</span>
                      </div>
                    </div>
                    <div className="ac-inbox-actions">
                      {destination && (
                        <Button asChild variant="outline">
                          <Link
                            to={destination}
                            aria-label={`${actionLabel}: ${item.title}`}
                            onClick={() => void inbox.read(item.id)}
                          >
                            {actionLabel}
                          </Link>
                        </Button>
                      )}
                      {unread && (
                        <Button
                          variant="ghost"
                          disabled={inbox.saving}
                          aria-label={`Mark read: ${item.title}`}
                          aria-busy={markingRead}
                          onClick={() => void markRead(item.id)}
                        >
                          {markingRead && <LoaderCircle size={14} aria-hidden="true" className="motion-safe:animate-spin" />}{markingRead ? "Marking read…" : "Mark read"}
                        </Button>
                      )}
                    </div>
                  </article>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="ac-inbox-empty">
              <span className="ac-inbox-empty-icon" aria-hidden="true">{filter === "unread" && inbox.items.length ? <Check size={26} /> : <Bell size={26} />}</span>
              <CareEmpty title={filter === "unread" && inbox.items.length ? "No unread notifications" : "No notifications yet"}>
                {filter === "unread" && inbox.items.length ? "You’ve read your recent care notifications. Switch to All to revisit them." : "Care activity available to your agency will appear here."}
              </CareEmpty>
              {filter === "unread" && inbox.items.length > 0 && <Button variant="outline" onClick={() => setFilter("all")}>View all notifications</Button>}
            </div>
          )}
        </CarePanel>
      )}
      {inbox.saveError && (
        <CareFailure message={inbox.saveError} onRetry={inbox.retry} />
      )}
    </div>
  );
}

function notificationIcon(destination: string | null) {
  if (!destination) return Bell;
  const path = new URL(destination, "https://care.invalid").pathname;
  if (path.startsWith("/agency-care/invitations/")) return Mail;
  if (path.endsWith("/conversations")) return MessageCircle;
  if (path.endsWith("/documents")) return FileText;
  if (path.endsWith("/updates")) return ClipboardCheck;
  if (path.endsWith("/team")) return Users;
  if (path.endsWith("/recovery")) return RotateCcw;
  return Bell;
}

function notificationActionLabel(destination: string | null) {
  if (!destination) return "Open item";
  const url = new URL(destination, "https://care.invalid");
  if (url.pathname.startsWith("/agency-care/invitations/")) return "Review invitation";
  if (url.pathname.endsWith("/documents")) return url.searchParams.get("submission") ? "Open document" : "View documents";
  if (url.pathname.endsWith("/updates")) return url.searchParams.get("submission") ? "View update" : "View updates";
  if (url.pathname.endsWith("/conversations")) return url.searchParams.get("conversation") ? "Open conversation" : "View conversations";
  if (url.pathname.endsWith("/team")) {
    if (url.searchParams.get("section") === "invitations") return "View invitation";
    if (url.searchParams.get("section") === "relationships") return "View agency connection";
    if (url.searchParams.get("section") === "grants" && url.searchParams.has("staff")) return "View staff assignment";
    return "View care team";
  }
  if (url.pathname.endsWith("/recovery")) return "View publication status";
  if (url.pathname.endsWith("/activity")) return "View care activity";
  if (url.pathname.endsWith("/settings")) return "Open agency settings";
  return "Open item";
}
