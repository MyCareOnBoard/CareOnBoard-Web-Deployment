import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { format, subDays } from "date-fns";
import { Loader2, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";
import BillingDashboardHeader from "../components/BillingDashboardHeader";
import type { BillingDateRangeValues } from "../components/types";
import { useAuth } from "@/utils/auth";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { canAccessBillingChild } from "@/lib/agency/agency-billing-permissions";
import { Routes } from "@/routes/constants";
import {
  evvApi,
  evvErrorMessage,
  EVV_STATE_LABELS,
  type EvvCaregiver,
  type EvvClient,
  type EvvProgram,
  type EvvSettings,
  type EvvTransaction,
  type EvvVisit,
  type EvvVisitState,
} from "@/lib/api/evv";
import { EvvStateBadge, EVV_GHOST_BUTTON, EVV_INPUT, isAbort } from "./evvUi";
import EvvVisitDrawer from "./EvvVisitDrawer";
import EvvClientLinkDialog from "./EvvClientLinkDialog";

type Tab = "visits" | "clients" | "caregivers" | "activity";
type VisitFilter = EvvVisitState | "attention" | "all";

const TILES: { key: VisitFilter; label: string; states: EvvVisitState[]; tone: string }[] = [
  { key: "accepted", label: "Accepted", states: ["accepted"], tone: "text-[#1a7f37]" },
  { key: "transmitted", label: "Sent, awaiting HHAeXchange", states: ["transmitted", "queued"], tone: "text-[#007c7f]" },
  { key: "attention", label: "Need attention", states: ["needs_info", "rejected", "failed"], tone: "text-[#b42318]" },
  { key: "voided", label: "Voided", states: ["void_pending", "voided"], tone: "text-[#5b636b]" },
];

const FILTERS: { value: VisitFilter; label: string }[] = [
  { value: "all", label: "All visits" },
  { value: "attention", label: "Needs attention" },
  ...(Object.keys(EVV_STATE_LABELS) as EvvVisitState[]).map((state) => ({ value: state, label: EVV_STATE_LABELS[state] })),
];

const dateKey = (date: Date) => format(date, "yyyy-MM-dd");

function shortDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : format(date, value.length === 10 ? "MMM d, yyyy" : "MMM d, h:mm a");
}

/** Billing › HHAeXchange EVV: what has been sent, what HHAeXchange said, and what needs fixing. */
export default function AgencyEvvPage() {
  const { user } = useAuth();
  const mode = useEffectiveAgencyMode();
  const accessList = user?.profile?.accessList ?? [];
  const canManage = canAccessBillingChild(user?.userType, accessList, "EVV Management");
  const program: EvvProgram | undefined = mode === "hha" || mode === "ddd" ? mode : undefined;

  const [settings, setSettings] = useState<EvvSettings | null>(null);
  const [settingsError, setSettingsError] = useState("");
  const [tab, setTab] = useState<Tab>("visits");
  const [range, setRange] = useState<BillingDateRangeValues>(() => ({ startDate: dateKey(subDays(new Date(), 30)), endDate: dateKey(new Date()) }));
  const [summary, setSummary] = useState<{ counts: Partial<Record<EvvVisitState, number>>; needsAttention: number } | null>(null);
  const [filter, setFilter] = useState<VisitFilter>("attention");
  const [visits, setVisits] = useState<EvvVisit[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const openShiftId = searchParams.get("visit");
  const setOpenShiftId = useCallback((shiftId: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (shiftId) next.set("visit", shiftId);
      else next.delete("visit");
      return next;
    });
  }, [setSearchParams]);
  const [reloadKey, setReloadKey] = useState(0);
  const listController = useRef<AbortController | null>(null);

  useEffect(() => {
    evvApi.getSettings().then(setSettings).catch((error) => setSettingsError(evvErrorMessage(error, "EVV settings could not be loaded.")));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    evvApi.getSummary({ from: range.startDate, to: range.endDate, program }, controller.signal)
      .then(setSummary)
      .catch((error) => { if (!isAbort(error)) setSummary(null); });
    return () => controller.abort();
  }, [range.startDate, range.endDate, program, reloadKey]);

  const loadVisits = useCallback(async (cursor?: string) => {
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    setLoadingVisits(true);
    try {
      const page = await evvApi.listVisits({
        state: filter === "all" ? undefined : filter,
        program,
        from: range.startDate || undefined,
        to: range.endDate || undefined,
        cursor,
        limit: 50,
      }, controller.signal);
      setVisits((prev) => (cursor ? [...prev, ...page.visits] : page.visits));
      setNextCursor(page.nextCursor);
    } catch (error) {
      if (!isAbort(error)) toast.error(evvErrorMessage(error, "Visits could not be loaded."));
    } finally {
      if (listController.current === controller) setLoadingVisits(false);
    }
  }, [filter, program, range.startDate, range.endDate]);

  useEffect(() => {
    if (tab === "visits") void loadVisits();
    return () => listController.current?.abort();
  }, [tab, loadVisits, reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);

  const tileCount = (states: EvvVisitState[]) => states.reduce((n, state) => n + (summary?.counts[state] ?? 0), 0);

  if (mode === "sc") {
    return (
      <div className="min-w-0">
        <BillingDashboardHeader title="HHAeXchange EVV" subtitle="Electronic visit verification for HHA and DDD visits." />
        <p className="rounded-xl border border-[#e4e7ea] bg-white p-6 text-sm text-[#5b636b]">EVV does not apply to Support Coordination. Switch to the HHA or DDD program to see visits.</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <BillingDashboardHeader
        title="HHAeXchange EVV"
        subtitle="Completed visits are sent to HHAeXchange automatically. Fix anything that is held back here."
        dateRange={range}
        onDateRangeChange={setRange}
        primaryAction={{ label: "Refresh", onClick: refresh, icon: RefreshCw }}
      />

      <ConnectionBanner settings={settings} error={settingsError} canManage={canManage} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TILES.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => { setTab("visits"); setFilter(tile.key); }}
            className={`cursor-pointer rounded-2xl border bg-white p-5 text-left transition hover:border-[#00b4b8] dark:bg-[#1b232b] ${filter === tile.key && tab === "visits" ? "border-[#00b4b8]" : "border-[#e4e7ea] dark:border-white/10"}`}
          >
            <p className={`text-[28px] font-semibold ${tile.tone}`}>{summary ? tileCount(tile.states) : "—"}</p>
            <p className="text-[13px] text-[#5b636b]">{tile.label}</p>
          </button>
        ))}
      </div>

      <div role="tablist" aria-label="EVV sections" className="mb-4 flex flex-wrap gap-2 border-b border-[#e4e7ea] dark:border-white/10">
        {(["visits", "clients", "caregivers", "activity"] as Tab[]).map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px cursor-pointer border-b-2 px-3 py-2 text-sm font-medium capitalize ${tab === id ? "border-[#00b4b8] text-[#10141a] dark:text-[#f4f6f7]" : "border-transparent text-[#5b636b]"}`}
          >
            {id === "clients" ? "Client links" : id}
            {id === "visits" && summary?.needsAttention ? <span className="ml-2 rounded-full bg-[#fdecec] px-2 text-xs text-[#b42318]">{summary.needsAttention}</span> : null}
          </button>
        ))}
      </div>

      {tab === "visits" && (
        <section aria-label="Visits">
          <div className="mb-3 flex items-center gap-3">
            <label className="text-sm text-[#5b636b]" htmlFor="evv-filter">Show</label>
            <select id="evv-filter" className={EVV_INPUT} value={filter} onChange={(e) => setFilter(e.target.value as VisitFilter)}>
              {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f7f8f9] text-xs uppercase text-[#5b636b] dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 font-medium">Visit date</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Caregiver</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">What happened</th>
                  <th className="px-4 py-3 font-medium">EVVMSID</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.shiftId} className="cursor-pointer border-t border-[#eef0f2] hover:bg-[#f7fbfb] dark:border-white/5" onClick={() => setOpenShiftId(visit.shiftId)}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button type="button" className="cursor-pointer font-medium text-[#10141a] underline-offset-2 hover:underline dark:text-[#f4f6f7]" onClick={(e) => { e.stopPropagation(); setOpenShiftId(visit.shiftId); }}>
                        {shortDate(visit.visitDate)}
                      </button>
                      {visit.isMissed && <span className="ml-2 text-xs text-[#9a5b00]">Missed</span>}
                    </td>
                    <td className="px-4 py-3">{visit.clientName ?? "—"}</td>
                    <td className="px-4 py-3">{visit.caregiverName ?? "—"}</td>
                    <td className="px-4 py-3"><EvvStateBadge state={visit.state} /></td>
                    <td className="max-w-[320px] truncate px-4 py-3 text-[#5b636b]" title={visitSummary(visit)}>{visitSummary(visit)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{visit.evvmsid ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loadingVisits && <p className="flex items-center gap-2 p-4 text-sm text-[#5b636b]"><Loader2 className="h-4 w-4 animate-spin" /> Loading visits…</p>}
            {!loadingVisits && visits.length === 0 && (
              <p className="p-6 text-sm text-[#5b636b]">{filter === "attention" ? "Nothing needs attention for these dates." : "No EVV visits for these dates."}</p>
            )}
          </div>
          {nextCursor && !loadingVisits && (
            <button type="button" className={`${EVV_GHOST_BUTTON} mt-3`} onClick={() => void loadVisits(nextCursor)}>Load more</button>
          )}
        </section>
      )}

      {tab === "clients" && <ClientsTab settings={settings} canManage={canManage} program={program} onLinked={refresh} />}
      {tab === "caregivers" && <CaregiversTab canManage={canManage} />}
      {tab === "activity" && <ActivityTab />}

      {openShiftId && (
        <EvvVisitDrawer
          shiftId={openShiftId}
          settings={settings}
          canManage={canManage}
          onClose={() => setOpenShiftId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function visitSummary(visit: EvvVisit): string {
  if (visit.state === "needs_info") return visit.issues.map((i) => i.message).join(" ") || "Missing information";
  if (visit.state === "rejected" || visit.state === "failed") return visit.lastError || visit.hhaxErrors.map((e) => e.message).join("; ") || "HHAeXchange did not accept this visit";
  if (visit.state === "accepted") return `Accepted ${shortDate(visit.acceptedAt)}`;
  if (visit.state === "transmitted") return `Sent ${shortDate(visit.transmittedAt)}, waiting for HHAeXchange`;
  if (visit.state === "queued") return "Waiting to send";
  if (visit.state === "void_pending") return "Void requested";
  return visit.deleted ? "Shift deleted" : "Voided";
}

function ConnectionBanner({ settings, error, canManage }: { settings: EvvSettings | null; error: string; canManage: boolean }) {
  const settingsLink = `${Routes.agency.agencySettings}?tab=evv`;
  if (error) return <p role="alert" className="mb-4 rounded-xl bg-[#fdecec] p-4 text-sm text-[#b42318]">{error}</p>;
  if (!settings) return null;
  let message: string | null = null;
  if (!settings.enabled) message = "Sending to HHAeXchange is off. Visits are not sent until it is turned on.";
  else if (!settings.credentialsConfigured) message = `HHAeXchange ${settings.effectiveEnvironment} credentials are not set up on the server yet. Visits wait in the queue.`;
  else if (!settings.sendsEnabled) message = "Production sending is switched off on the server. Visits wait in the queue.";
  else if (settings.connection.status === "auth_error") message = "HHAeXchange refused CareOnboard's credentials. Sends are retried every 30 minutes.";
  else if (settings.connection.status === "error") message = settings.connection.message || "The last HHAeXchange connection test failed.";
  if (!message) {
    return (
      <p className="mb-4 flex items-center gap-2 text-sm text-[#5b636b]">
        <span className="h-2 w-2 rounded-full bg-[#1a7f37]" aria-hidden="true" />
        Connected to HHAeXchange {settings.effectiveEnvironment}{settings.goLiveDate ? `, sending visits from ${shortDate(settings.goLiveDate)}` : ""}.
        {canManage && <Link to={settingsLink} className="ml-auto inline-flex items-center gap-1 text-[#007c7f] hover:underline"><Settings className="h-4 w-4" /> Settings</Link>}
      </p>
    );
  }
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#f5d9a8] bg-[#fff8ec] p-4 text-sm text-[#7a4a00]">
      <span>{message}</span>
      {canManage && <Link to={settingsLink} className="ml-auto font-medium text-[#007c7f] hover:underline">Open EVV settings</Link>}
    </div>
  );
}

function ClientsTab({ settings, canManage, program, onLinked }: { settings: EvvSettings | null; canManage: boolean; program?: EvvProgram; onLinked: () => void }) {
  const [clients, setClients] = useState<EvvClient[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [search, setSearch] = useState("");
  const [onlyUnlinked, setOnlyUnlinked] = useState(true);
  const [linking, setLinking] = useState<EvvClient | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    evvApi.listClients(controller.signal)
      .then((data) => { setClients(data.clients); setTruncated(data.truncated); })
      .catch((error) => { if (!isAbort(error)) { toast.error(evvErrorMessage(error, "Clients could not be loaded.")); setClients([]); } });
    return () => controller.abort();
  }, [reload]);

  const shown = useMemo(() => (clients ?? [])
    .filter((c) => !program || c.program === program)
    .filter((c) => c.evvRequired)
    .filter((c) => !onlyUnlinked || c.link.linkState !== "linked")
    .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase())), [clients, program, onlyUnlinked, search]);

  return (
    <section aria-label="Client links">
      <p className="mb-3 text-sm text-[#5b636b]">Each EVV client needs a link to their HHAeXchange member record before their visits can be sent.</p>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input className={`${EVV_INPUT} w-64`} placeholder="Search clients" aria-label="Search clients" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-[#5b636b]">
          <input type="checkbox" className="h-4 w-4 accent-[#00b4b8]" checked={onlyUnlinked} onChange={(e) => setOnlyUnlinked(e.target.checked)} />
          Only clients without a link
        </label>
      </div>
      {!clients ? <p className="text-sm text-[#5b636b]">Loading clients…</p> : (
        <div className="overflow-x-auto rounded-2xl border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[#f7f8f9] text-xs uppercase text-[#5b636b] dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Medicaid ID</th>
                <th className="px-4 py-3 font-medium">HHAeXchange member</th>
                <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((client) => (
                <tr key={client.clientId} className="border-t border-[#eef0f2] dark:border-white/5">
                  <td className="px-4 py-3 font-medium">{client.name}<span className="ml-2 text-xs uppercase text-[#808081]">{client.program}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{client.medicaidIdLast4 ? `•••• ${client.medicaidIdLast4}` : "—"}</td>
                  <td className="px-4 py-3">
                    {client.link.linkState === "linked"
                      ? <span className="text-[#1a7f37]">Linked · {client.link.payerId} · •••• {client.link.memberIdLast4}</span>
                      : <span className="text-[#9a5b00]">Not linked</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <button type="button" className={EVV_GHOST_BUTTON} onClick={() => setLinking(client)}>
                        {client.link.linkState === "linked" ? "Change link" : "Link member"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {truncated && <p className="border-t border-[#eef0f2] p-4 text-xs text-[#5b636b]">Showing the first 300 clients. Visits for any client that still needs a link also show up under Needs attention.</p>}
          {shown.length === 0 && <p className="p-6 text-sm text-[#5b636b]">{onlyUnlinked ? "Every EVV client is linked." : "No EVV clients found."}</p>}
        </div>
      )}
      {linking && (
        <EvvClientLinkDialog
          client={linking}
          settings={settings}
          onClose={() => setLinking(null)}
          onLinked={() => { setLinking(null); setReload((n) => n + 1); onLinked(); }}
        />
      )}
    </section>
  );
}

const SYNC_LABELS: Record<EvvCaregiver["syncState"], string> = {
  not_synced: "Not sent yet",
  synced: "Synced",
  pending: "Waiting for HHAeXchange",
  failed: "Failed",
  needs_info: "Needs info",
};

const MISSING_LABELS: Record<EvvCaregiver["missing"][number], string> = {
  name: "first or last name",
  dateOfBirth: "date of birth",
  address: "home state and ZIP code",
};

function CaregiversTab({ canManage }: { canManage: boolean }) {
  const [caregivers, setCaregivers] = useState<EvvCaregiver[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    evvApi.listCaregivers(controller.signal)
      .then((data) => setCaregivers(data.caregivers))
      .catch((error) => { if (!isAbort(error)) { toast.error(evvErrorMessage(error, "Caregivers could not be loaded.")); setCaregivers([]); } });
    return () => controller.abort();
  }, []);

  async function sync(caregiver: EvvCaregiver) {
    setBusy(caregiver.employeeId);
    try {
      await evvApi.syncCaregiver(caregiver.employeeId);
      toast.success(`${caregiver.name} will be sent to HHAeXchange shortly.`);
    } catch (error) {
      toast.error(evvErrorMessage(error, "The caregiver could not be queued."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-label="Caregivers">
      <p className="mb-3 text-sm text-[#5b636b]">Caregivers are added to HHAeXchange automatically before their first visit is sent. They need a first and last name and a date of birth.</p>
      {!caregivers ? <p className="text-sm text-[#5b636b]">Loading caregivers…</p> : (
        <div className="overflow-x-auto rounded-2xl border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[#f7f8f9] text-xs uppercase text-[#5b636b] dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 font-medium">Caregiver</th>
                <th className="px-4 py-3 font-medium">Sync</th>
                <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {caregivers.map((caregiver) => (
                <tr key={caregiver.employeeId} className="border-t border-[#eef0f2] dark:border-white/5">
                  <td className="px-4 py-3 font-medium">
                    {caregiver.name}
                    {caregiver.missing.length > 0 && <span className="ml-2 text-xs text-[#9a5b00]">Missing {caregiver.missing.map((m) => MISSING_LABELS[m]).join(", ")}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {SYNC_LABELS[caregiver.syncState] ?? caregiver.syncState}
                    {caregiver.lastError && <span className="block text-xs text-[#b42318]">{caregiver.lastError}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <button type="button" className={EVV_GHOST_BUTTON} disabled={busy === caregiver.employeeId || caregiver.missing.length > 0} onClick={() => void sync(caregiver)}>
                        {caregiver.lastSyncedAt ? "Resend" : "Send now"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {caregivers.length === 0 && <p className="p-6 text-sm text-[#5b636b]">No caregivers found.</p>}
        </div>
      )}
    </section>
  );
}

const ACTION_LABELS: Record<string, string> = { submit: "Visit sent", void: "Void sent", sync: "Caregiver sent", status: "Status check", test: "Connection test", lookup: "Member lookup" };

function ActivityTab() {
  const [rows, setRows] = useState<EvvTransaction[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (after?: string) => {
    setLoading(true);
    try {
      const page = await evvApi.listTransactions({ cursor: after, limit: 50 });
      setRows((prev) => (after ? [...(prev ?? []), ...page.transactions] : page.transactions));
      setCursor(page.nextCursor);
    } catch (error) {
      toast.error(evvErrorMessage(error, "Activity could not be loaded."));
      setRows((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section aria-label="Activity">
      <p className="mb-3 text-sm text-[#5b636b]">Every call CareOnboard made to HHAeXchange. Only ids and results are kept, never visit details.</p>
      {!rows ? <p className="text-sm text-[#5b636b]">Loading activity…</p> : (
        <div className="overflow-x-auto rounded-2xl border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[#f7f8f9] text-xs uppercase text-[#5b636b] dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">What</th>
                <th className="px-4 py-3 font-medium">Result</th>
                <th className="px-4 py-3 font-medium">Transaction</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[#eef0f2] dark:border-white/5">
                  <td className="px-4 py-3 whitespace-nowrap">{shortDate(row.createdAt)}</td>
                  <td className="px-4 py-3">{ACTION_LABELS[row.action] ?? row.action}{row.environment ? <span className="ml-2 text-xs text-[#808081]">{row.environment}</span> : null}</td>
                  <td className="px-4 py-3">
                    {row.ok ? <span className="text-[#1a7f37]">{row.state ? row.state : "OK"}</span> : <span className="text-[#b42318]">{row.errors[0]?.message ?? `Failed${row.httpStatus ? ` (HTTP ${row.httpStatus})` : ""}`}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.transactionId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-6 text-sm text-[#5b636b]">No activity yet.</p>}
        </div>
      )}
      {cursor && <button type="button" className={`${EVV_GHOST_BUTTON} mt-3`} disabled={loading} onClick={() => void load(cursor)}>Load more</button>}
    </section>
  );
}

