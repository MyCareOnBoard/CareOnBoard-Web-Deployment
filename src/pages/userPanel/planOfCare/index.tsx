import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type SVGProps } from "react";
import { Link } from "react-router";
import { CalendarSearch, CircleAlert, ClipboardList, Files, UsersRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/utils/auth";
import { padCount } from "@/pages/userPanel/clientsAndServices/myClients";
import { EmptyRecords, PAGE_SIZE, Pagination, SearchBox, StatusPill, TableSkeleton } from "@/pages/userPanel/records/RecordsKit";
import { useGetAllPlansOfCareQuery } from "./api";
import type { PlanOfCare } from "./types";
import { clientLabel, filterPlans, formatDate, goalsHref, PLAN_STATUS_LABEL, PLAN_STATUS_TONE, planOverview, planStatus, serviceLabel } from "./planOfCareView";

const PlanOfCareModal = lazy(() => import("./components/PlanOfCareModal").then((m) => ({ default: m.PlanOfCareModal })));

const cardTones = {
  blue: "bg-[#e4f0ff] text-[#2b82ff] dark:bg-[#2b82ff]/20 dark:text-[#9cc3ff]",
  green: "bg-[#e8f7ee] text-[#20a35c] dark:bg-[#20a35c]/20 dark:text-[#7fd6a3]",
  purple: "bg-[#f7e9fc] text-[#b04fd8] dark:bg-[#b04fd8]/20 dark:text-[#dcaaf0]",
  orange: "bg-[#fff1dd] text-[#f29d0c] dark:bg-[#f29d0c]/20 dark:text-[#f7c46b]",
};

interface OverviewCard { label: string; sub: string; value: number; tone: keyof typeof cardTones; icon: ComponentType<SVGProps<SVGSVGElement>> }

const MUTED = "text-[#5d6b73] md:hidden dark:text-[#9aa4a8]";
const CELL = "md:px-2 md:py-4";
const ACTION = "inline-flex h-8 cursor-pointer items-center rounded-[6px] border border-[#e3e8ea] px-3 text-[13px] font-semibold text-[#10141a] transition-colors hover:bg-[#f3f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:border-white/15 dark:text-[#f4f6f7] dark:hover:bg-white/5";

const isSupportCoordinator = (user: ReturnType<typeof useAuth>["user"]) =>
  user?.applicantType === "support_coordinator" || user?.profile?.role === "support_coordinator" || user?.role === "support_coordinator";

export default function PlanOfCarePage() {
  const { user } = useAuth();
  const showNames = isSupportCoordinator(user);
  const { data, isLoading, isError, refetch } = useGetAllPlansOfCareQuery();
  const plans = useMemo(() => data ?? [], [data]);
  const [now] = useState(() => new Date());
  const overview = useMemo(() => planOverview(plans, now), [plans, now]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const visible = useMemo(() => filterPlans(plans, search, showNames), [plans, search, showNames]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const [selected, setSelected] = useState<PlanOfCare | null>(null);

  const cards: OverviewCard[] = [
    { label: "Clients you support", sub: "Clients in your care with a plan record", value: overview.clients, tone: "blue", icon: UsersRound },
    { label: "Active care plans", sub: "Plans uploaded and not expired", value: overview.activePlans, tone: "green", icon: Files },
    { label: "Reviews due", sub: "Plans expired or expiring within 30 days", value: overview.reviewsDue, tone: "purple", icon: CalendarSearch },
    { label: "Plans not uploaded", sub: "Clients still waiting on a plan document", value: overview.missing, tone: "orange", icon: CircleAlert },
  ];

  const empty = !isLoading && !isError && plans.length === 0;

  return <div className="flex min-h-[calc(100vh-200px)] flex-col">
    <h1 className="sr-only">Plan of care</h1>
    <div className="flex flex-1 flex-col gap-6 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,44,0.06)] sm:p-6 dark:bg-[#1b232b]">
      <section aria-labelledby="plan-overview" className="flex flex-col gap-3">
        <h2 id="plan-overview" className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">Overview</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return <div key={card.label} className="flex min-w-0 flex-col rounded-[12px] border border-[#e8edef] px-4 py-4 dark:border-white/10">
              <span className={cn("grid h-8 w-8 place-items-center rounded-[8px]", cardTones[card.tone])}><Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></span>
              {isLoading ? <Skeleton className="mt-3 h-7 w-12 motion-reduce:animate-none" />
                : <p className="mt-2.5 text-[26px] leading-tight text-[#10141a] dark:text-[#f4f6f7]">{isError ? "—" : padCount(card.value)}</p>}
              <p className="mt-1 text-[15px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{card.label}</p>
              <p className="mt-1.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{card.sub}</p>
            </div>;
          })}
        </div>
      </section>

      {empty ? <EmptyRecords icon={ClipboardList} title="No plans of care yet."
        body="Your assigned care plans will appear here once they're available. Check back for updates on your clients' care needs and activities." />
        : <section aria-labelledby="plan-list" className="flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
            <h2 id="plan-list" className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">Your plans of care</h2>
            <SearchBox value={search} onChange={setSearch} placeholder={showNames ? "Search client or service" : "Search client ID or service"} label="Search plans of care" className="sm:w-[240px]" />
          </div>

          {isError ? <p role="alert" className="border-t border-[#edf1f2] py-16 text-center text-sm text-[#b3371c] dark:border-white/10 dark:text-[#f3a08c]">
            We couldn&apos;t load your plans of care.{" "}
            <button type="button" onClick={() => void refetch()} className="cursor-pointer font-semibold underline">Try again</button>
          </p> : <>
            <table className="w-full border-t border-[#edf1f2] text-left dark:border-white/10">
              <caption className="sr-only">Plans of care by client, with service, latest shift, status and expiry</caption>
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-[#edf1f2] text-[13px] font-semibold text-[#10141a] dark:border-white/10 dark:text-[#f4f6f7]">
                  <th scope="col" className="px-2 py-4 font-semibold">{showNames ? "Client" : "Client #ID"}</th>
                  <th scope="col" className="px-2 py-4 font-semibold">Service</th>
                  <th scope="col" className="px-2 py-4 font-semibold">Latest shift</th>
                  <th scope="col" className="px-2 py-4 font-semibold">Plan status</th>
                  <th scope="col" className="px-2 py-4 font-semibold">Expires</th>
                  <th scope="col" className="px-2 py-4 text-right font-semibold"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? <TableSkeleton columns={6} />
                  : pageRows.length === 0 ? <tr><td colSpan={6} className="px-2 py-12 text-center text-sm text-[#5d6b73] dark:text-[#9aa4a8]">No plans match &quot;{search.trim()}&quot;.</td></tr>
                  : pageRows.map((plan) => <PlanRow key={plan.clientId} plan={plan} now={now} showNames={showNames} onView={setSelected} />)}
              </tbody>
            </table>
            {!isLoading && visible.length > PAGE_SIZE && <Pagination page={page} pages={pages} onPage={setPage} label="Plan of care pages" />}
          </>}
        </section>}
    </div>

    {selected && <Suspense fallback={null}>
      <PlanOfCareModal open plan={selected} clientLabel={clientLabel(selected, showNames)} onClose={() => setSelected(null)} />
    </Suspense>}
  </div>;
}

function PlanRow({ plan, now, showNames, onView }: { plan: PlanOfCare; now: Date; showNames: boolean; onView: (plan: PlanOfCare) => void }) {
  const label = clientLabel(plan, showNames);
  const status = planStatus(plan, now);
  const goals = goalsHref(plan);
  const pill = <StatusPill label={PLAN_STATUS_LABEL[status]} tone={PLAN_STATUS_TONE[status]} />;
  // Below md the row stacks into a small card; from md up it is a table row.
  return <tr className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-[#edf1f2] px-2 py-3.5 text-[14px] text-[#34434c] md:table-row md:p-0 dark:border-white/10 dark:text-[#c9d3d6]">
    <th scope="row" className={cn("font-semibold text-[#10141a] md:font-normal dark:text-[#f4f6f7]", CELL)}>
      <span className={cn("font-normal", MUTED)}>{showNames ? "Client: " : "Client #ID: "}</span>{label}
    </th>
    <td className="justify-self-end md:hidden">{pill}</td>
    <td className={cn("col-span-2", CELL)}><span className={MUTED}>Service: </span>{serviceLabel(plan) ?? "—"}</td>
    <td className={cn("col-span-2", CELL)}><span className={MUTED}>Latest shift: </span>{formatDate(plan.date) ?? "—"}</td>
    <td className={cn("hidden md:table-cell", CELL)}>{pill}</td>
    <td className={cn("col-span-2", CELL)}><span className={MUTED}>Expires: </span>{formatDate(plan.planOfCare?.expiryDate) ?? "—"}</td>
    <td className={cn("col-span-2 pt-2 md:pt-4", CELL)}>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <button type="button" className={ACTION} onClick={() => onView(plan)} aria-label={`View plan for ${label}`}>View plan</button>
        {goals && <Link to={goals} className={ACTION} aria-label={`View goals for ${label}`}>View goals</Link>}
      </div>
    </td>
  </tr>;
}
