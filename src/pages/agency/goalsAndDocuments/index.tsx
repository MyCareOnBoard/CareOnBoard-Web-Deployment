import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import { BriefcaseBusiness, Check, ChevronDown, Eye, FileText, Flag, GraduationCap, Loader2, RotateCcw, Search, Sparkles, Users } from "lucide-react";
import { Routes } from "@/routes/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { AgencyPageHeader } from "@/components/agency/AgencyShell";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { getAgencyClientById, listAgencyClients, type Client } from "@/lib/api/clients";
import { listGoalDocuments, type GoalDocument } from "@/lib/api/goals-and-documents";
import { UploadClientDocumentModal } from "@/pages/agency/client-details/components/UploadClientDocumentModal";
import { useGetCareerPlansQuery } from "./api";
import { buildGoalFormCards, CARD_FILTERS, type GoalCardFilter, type GoalCardState, type GoalFormCard, type GoalFormIcon } from "./goal-forms";

const ICONS: Record<GoalFormIcon, ComponentType<{ className?: string }>> = {
    briefcase: BriefcaseBusiness,
    flag: Flag,
    sparkle: Sparkles,
    people: Users,
    cap: GraduationCap,
    cycle: RotateCcw,
};

const STATE_PILL: Record<GoalCardState, { label: string; className: string; dot: string }> = {
    completed: { label: "Completed", className: "bg-[#e8f6ee] text-[#157f3c] dark:bg-[#12392a] dark:text-[#7fe0a8]", dot: "bg-[#22a35a]" },
    review: { label: "Needs approval", className: "bg-[#fdf4dc] text-[#8a5a00] dark:bg-[#3a2f12] dark:text-[#ffd27a]", dot: "bg-[#e0a100]" },
    due: { label: "Due", className: "bg-[#fdf4dc] text-[#8a5a00] dark:bg-[#3a2f12] dark:text-[#ffd27a]", dot: "bg-[#e0a100]" },
    overdue: { label: "Overdue", className: "bg-[#fde8e6] text-[#b42318] dark:bg-[#3d1a17] dark:text-[#ff9b8f]", dot: "bg-[#d92d20]" },
    not_started: { label: "Not started", className: "bg-[#eef0f2] text-[#3d4a50] dark:bg-white/10 dark:text-[#c9d3d6]", dot: "bg-[#8a979d]" },
};

const TABS: { id: GoalCardFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "due", label: "Due" },
    { id: "completed", label: "Completed" },
];

const clientName = (c: Pick<Client, "firstName" | "lastName">): string =>
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "Unnamed client";

/** "Client: Paul Walker" picker: the agency's DDD clients, searched on the server as you type. */
function ClientPicker({ agencyId, value, valueLabel, onChange }: {
    agencyId?: string;
    value: string;
    valueLabel: string;
    onChange: (client: Client) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [clients, setClients] = useState<Client[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            setError(false);
            listAgencyClients({ agencyId, type: "ddd", brief: true, search: query.trim() || undefined, limit: 50, signal: controller.signal })
                .then((list) => setClients([...list].sort((a, b) => clientName(a).localeCompare(clientName(b)))))
                .catch(() => { if (!controller.signal.aborted) setError(true); });
        }, query ? 250 : 0);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [open, query, agencyId]);

    return (
        <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-flex h-10 max-w-[260px] cursor-pointer items-center gap-2 rounded-[10px] border border-[#dcdfe2] bg-white px-3.5 text-sm text-[#10141a] hover:bg-[#f4f5f6] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7]"
                >
                    <span className="truncate"><span className="text-[#5b636b] dark:text-[#9aa4a8]">Client: </span>{value ? valueLabel : "Choose a client"}</span>
                    <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-[#5b636b]" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="z-50 w-[300px] rounded-[12px] border border-[#e4e7ea] bg-white p-2 shadow-lg dark:border-white/10 dark:bg-[#1b232b]">
                <div className="relative mb-2">
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a979d]" />
                    <input
                        autoFocus
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search clients"
                        aria-label="Search clients"
                        className="h-9 w-full rounded-[8px] border border-[#dcdfe2] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#0b5c5d] dark:border-white/15 dark:bg-[#141b21]"
                    />
                </div>
                <div role="listbox" aria-label="Clients" className="max-h-[280px] overflow-y-auto">
                    {error ? (
                        <p className="px-2 py-3 text-sm text-[#b42318]">Couldn't load clients. Try again.</p>
                    ) : clients === null ? (
                        <p className="flex items-center gap-2 px-2 py-3 text-sm text-[#5b636b]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Loading clients</p>
                    ) : clients.length === 0 ? (
                        <p className="px-2 py-3 text-sm text-[#5b636b]">No clients found.</p>
                    ) : clients.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            role="option"
                            aria-selected={c.id === value}
                            onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left text-sm hover:bg-[#f4f5f6] dark:hover:bg-white/5"
                        >
                            <span className="truncate">{clientName(c)}</span>
                            {c.id === value && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-[#0b5c5d]" />}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

function FormCard({ card }: { card: GoalFormCard }) {
    const Icon = ICONS[card.form.icon];
    const pill = STATE_PILL[card.state];
    return (
        <article className="flex flex-col rounded-[14px] border border-[#e4e7ea] bg-white p-4 dark:border-white/10 dark:bg-[#1b232b]">
            <div className="flex items-start justify-between gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f1f4f4] text-[#0b5c5d] dark:bg-white/5 dark:text-[#7fd3d3]">
                    <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium", pill.className)}>
                    <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", pill.dot)} />
                    {pill.label}
                </span>
            </div>
            <h3 className="mt-3 text-base font-medium text-[#10141a] dark:text-[#f4f6f7]">{card.form.title}</h3>
            <p className="mt-1 text-[13px] text-[#5b636b] dark:text-[#9aa4a8]">{card.form.description}</p>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eceef0] pt-3 dark:border-white/10">
                <p className={cn("min-w-0 truncate text-xs", card.state === "overdue" ? "font-medium text-[#b42318] dark:text-[#ff9b8f]" : "text-[#5b636b] dark:text-[#9aa4a8]")}>{card.detail}</p>
                {card.action === "view" ? (
                    <Link
                        to={card.href}
                        aria-label={`View ${card.form.title}`}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] border border-[#dcdfe2] bg-white px-3 text-[13px] font-medium text-[#10141a] hover:bg-[#f4f5f6] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7]"
                    >
                        <Eye aria-hidden="true" className="h-4 w-4" />View
                    </Link>
                ) : (
                    <Link
                        to={card.href}
                        aria-label={`Fill now: ${card.form.title}`}
                        className="inline-flex h-8 shrink-0 items-center rounded-[8px] bg-[#003839] px-3 text-[13px] font-medium text-white hover:bg-[#0b4c4d] dark:bg-[#00a3a7] dark:text-[#06292a]"
                    >
                        Fill now
                    </Link>
                )}
            </div>
        </article>
    );
}

export default function GoalsAndDocumentsPage() {
    const mode = useEffectiveAgencyMode();
    const { user } = useAuth();
    const { toast } = useToast();
    const agencyId = user?.agencyId;
    const [params, setParams] = useSearchParams();
    const clientId = params.get("clientId") ?? "";
    const [tab, setTab] = useState<GoalCardFilter>("all");
    const [search, setSearch] = useState("");
    const [uploadOpen, setUploadOpen] = useState(false);

    const [client, setClient] = useState<Client | null>(null);
    const [documents, setDocuments] = useState<GoalDocument[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [reload, setReload] = useState(0);
    const loadedFor = useRef("");

    const careerPlans = useGetCareerPlansQuery({ agencyId, clientId }, { skip: !clientId || mode !== "ddd" });

    useEffect(() => {
        if (!clientId) { setClient(null); setDocuments(null); return; }
        const controller = new AbortController();
        if (loadedFor.current !== clientId) { setClient((prev) => (prev?.id === clientId ? prev : null)); setDocuments(null); }
        loadedFor.current = clientId;
        setLoadError(false);
        Promise.all([
            getAgencyClientById(clientId, { signal: controller.signal, mode: "ddd" }),
            listGoalDocuments({ agencyId, clientId, limit: 100 }),
        ]).then(([c, docs]) => {
            if (controller.signal.aborted) return;
            setClient(c);
            setDocuments(docs.documents ?? []);
        }).catch(() => { if (!controller.signal.aborted) setLoadError(true); });
        return () => controller.abort();
    }, [clientId, agencyId, reload]);

    const cards = useMemo(
        () => (clientId && documents ? buildGoalFormCards({ client, clientId, documents, careerPlans: careerPlans.data?.items }) : []),
        [client, clientId, documents, careerPlans.data],
    );
    const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, cards.filter(CARD_FILTERS[t.id]).length])) as Record<GoalCardFilter, number>, [cards]);
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return cards.filter(CARD_FILTERS[tab]).filter((c) => !q || `${c.form.title} ${c.form.description}`.toLowerCase().includes(q));
    }, [cards, tab, search]);

    if (mode === "hha") return <Navigate to={Routes.agency.dashboard} replace />;

    const loading = !!clientId && !documents && !loadError;
    const pickClient = (c: Client) => {
        setClient(c);
        setParams((prev) => { const next = new URLSearchParams(prev); next.set("clientId", c.id); return next; }, { replace: true });
    };

    return (
        <div className="space-y-6">
            <AgencyPageHeader
                icon={FileText}
                title="Goals & documents"
                description="DDD forms and goal plans per client. Fill them here; signed copies go to client documents."
                actions={(
                    <>
                        <ClientPicker agencyId={agencyId} value={clientId} valueLabel={client ? clientName(client) : "Loading…"} onChange={pickClient} />
                        <button
                            type="button"
                            disabled={!clientId}
                            title={clientId ? undefined : "Choose a client first"}
                            onClick={() => setUploadOpen(true)}
                            className="inline-flex h-10 cursor-pointer items-center rounded-[10px] bg-[#003839] px-4 text-sm font-medium text-white hover:bg-[#0b4c4d] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#00a3a7] dark:text-[#06292a]"
                        >
                            Upload signed form
                        </button>
                    </>
                )}
            />

            {!clientId ? (
                <div className="flex flex-col items-center rounded-[14px] border border-dashed border-[#dcdfe2] px-6 py-14 text-center dark:border-white/15">
                    <FileText aria-hidden="true" className="h-10 w-10 text-[#8a979d]" />
                    <p className="mt-3 text-base font-medium text-[#10141a] dark:text-[#f4f6f7]">Choose a client to see their forms</p>
                    <p className="mt-1 max-w-md text-sm text-[#5b636b] dark:text-[#9aa4a8]">Each client's goals, training plans and annual updates show here with what's due, based on their services and ISP plan year.</p>
                    <Link to={`${Routes.agency.goalsAndDocuments.index}/list`} className="mt-4 text-sm font-medium text-[#0b5c5d] underline underline-offset-2 dark:text-[#7fd3d3]">Browse every saved document</Link>
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div role="tablist" aria-label="Form status" className="flex w-fit gap-1 rounded-[10px] bg-[#f4f5f6] p-1 dark:bg-white/5">
                            {TABS.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === t.id}
                                    onClick={() => setTab(t.id)}
                                    className={cn(
                                        "inline-flex cursor-pointer items-center gap-2 rounded-[8px] px-3 py-1.5 text-sm transition-colors",
                                        tab === t.id ? "bg-white font-medium text-[#10141a] shadow-sm dark:bg-[#1b232b] dark:text-[#f4f6f7]" : "text-[#5b636b] hover:text-[#10141a] dark:text-[#9aa4a8]",
                                    )}
                                >
                                    {t.label}
                                    <span className={cn("rounded-md px-1.5 text-xs", tab === t.id && t.id === "all" ? "bg-[#003839] text-white dark:bg-[#00a3a7] dark:text-[#06292a]" : "bg-[#e4e7ea] text-[#3d4a50] dark:bg-white/10 dark:text-[#c9d3d6]")}>
                                        {loading ? "–" : counts[t.id]}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="relative sm:w-[240px]">
                            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a979d]" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search forms"
                                aria-label="Search forms"
                                className="h-10 w-full rounded-[10px] border border-[#dcdfe2] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#0b5c5d] dark:border-white/15 dark:bg-[#141b21]"
                            />
                        </div>
                    </div>

                    {loadError ? (
                        <div className="rounded-[14px] border border-[#f4c7c1] bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]">
                            Couldn't load this client's forms.{" "}
                            <button type="button" className="cursor-pointer font-medium underline underline-offset-2" onClick={() => setReload((n) => n + 1)}>Try again</button>
                        </div>
                    ) : loading ? (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[150px] rounded-[14px]" />)}
                        </div>
                    ) : visible.length === 0 ? (
                        <p className="rounded-[14px] border border-dashed border-[#dcdfe2] px-6 py-10 text-center text-sm text-[#5b636b] dark:border-white/15 dark:text-[#9aa4a8]">
                            {search ? "No forms match your search." : tab === "due" ? "Nothing is due for this client." : "No completed forms yet."}
                        </p>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {visible.map((card) => <FormCard key={card.form.key} card={card} />)}
                        </div>
                    )}
                </>
            )}

            {uploadOpen && clientId && (
                <UploadClientDocumentModal
                    isOpen={uploadOpen}
                    setIsOpen={setUploadOpen}
                    clientId={clientId}
                    onComplete={() => toast({ title: "Signed form uploaded", description: "It's saved with the client's documents." })}
                    onError={(message) => toast({ title: "Upload failed", description: message, variant: "destructive" })}
                />
            )}
        </div>
    );
}
