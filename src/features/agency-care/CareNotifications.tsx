import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { HeaderActionButton } from "@/components/DashboardHeader";
import BellIcon from "@/assets/icons/bell.svg?react";
import { agencyCareApi, type CareNotification } from "@/lib/api/agencyCare";
import { careError, useScopedMutation } from "./hooks";
import {
  CareEmpty,
  CareFailure,
  CareHeading,
  CareLoad,
  CarePanel,
  CareStatus,
  careDate,
} from "./ui";

export function careNotificationDestination(value?: string): string | null {
  if (!value || !value.startsWith("/agency-care/") || value.includes("\\"))
    return null;
  try {
    const url = new URL(value, "https://care.invalid");
    if (
      url.origin !== "https://care.invalid" ||
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
  if (!inbox)
    return (
      <CareFailure
        message="The care inbox is unavailable."
        onRetry={() => window.location.reload()}
      />
    );
  return (
    <div className="ac-stack">
      <CareHeading
        title="Care notifications"
        description="Recent notifications for the selected organization and your current client access."
        actions={
          <Button variant="outline" onClick={inbox.retry}>
            Refresh
          </Button>
        }
      />
      {inbox.loading ? (
        <CareLoad />
      ) : inbox.error ? (
        <CareFailure message={inbox.error} onRetry={inbox.retry} />
      ) : (
        <CarePanel title="Latest notifications">
          {inbox.items.length ? (
            <div className="ac-list">
              {inbox.items.map((item) => {
                const destination = careNotificationDestination(item.actionUrl);
                return (
                  <article className="ac-list-row" key={item.id}>
                    <div className="ac-stack">
                      <div className="ac-actions">
                        <strong>{item.title}</strong>
                        <CareStatus>{item.status}</CareStatus>
                      </div>
                      <p>{item.message}</p>
                      <small>{careDate(item.createdAt)}</small>
                    </div>
                    <div className="ac-actions">
                      {destination && (
                        <Button asChild variant="outline">
                          <Link
                            to={destination}
                            onClick={() => void inbox.read(item.id)}
                          >
                            Open item
                          </Link>
                        </Button>
                      )}
                      {item.status === "unread" && (
                        <Button
                          variant="outline"
                          disabled={inbox.saving}
                          onClick={() => void inbox.read(item.id)}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <CareEmpty title="No care notifications">
              New care activity will appear here when it is available to your
              organization.
            </CareEmpty>
          )}
          <small>Shows up to 50 recent notifications.</small>
        </CarePanel>
      )}
      {inbox.saveError && (
        <CareFailure message={inbox.saveError} onRetry={inbox.retry} />
      )}
    </div>
  );
}
