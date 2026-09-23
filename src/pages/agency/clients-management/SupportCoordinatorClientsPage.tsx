import { useState } from "react";
import { useNavigate } from "react-router";
import { CalendarDays, ClipboardCheck, Plus, Search, TriangleAlert, UsersRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Routes } from "@/routes/constants";
import "./support-coordinator-clients.css";

type Filter = "All clients" | "Alerts" | "Monitoring due" | "SP" | "CCP";

const clients = [
  { id: "182441", name: "Leslie Alexander", initials: "LA", coordinator: "M. S.", program: "CCP", county: "HUDSON", tier: "Tier D", effective: "01/15/2026", isp: "04/21/2026 – 04/20/2027", compliance: 60, monitoring: "Sep 24", monitoringNote: "Due soon", monitoringDue: true, alerts: 1, underReview: true },
  { id: "310562", name: "Sofia Ramirez", initials: "SR", coordinator: "Ph. D.", program: "SP", county: "Essex", tier: "Tier B", effective: "01/15/2026", isp: "04/21/2026 – 04/20/2027", compliance: 100, monitoring: "Oct 5", monitoringNote: "Scheduled", monitoringDue: false, alerts: 0, underReview: false },
  { id: "274893", name: "Marcus Chen", initials: "MC", coordinator: "B. A.", program: "SP", county: "Bergen", tier: "Tier C", effective: "04/01/2026", isp: "04/21/2026 – 04/20/2027", compliance: 80, monitoring: "Oct 12", monitoringNote: "Scheduled", monitoringDue: false, alerts: 2, underReview: false },
  { id: "198037", name: "James Okafor", initials: "JO", coordinator: "M. B. A.", program: "CCP", county: "Middlesex", tier: "Tier A", effective: "02/20/2026", isp: "04/21/2026 – 04/20/2027", compliance: 64, monitoring: "Oct 28", monitoringNote: "Scheduled", monitoringDue: false, alerts: 3, underReview: false },
  { id: "214608", name: "Ava Patel", initials: "AP", coordinator: "M. S.", program: "SP", county: "Hudson", tier: "Tier B", effective: "03/10/2026", isp: "05/01/2026 – 04/30/2027", compliance: 92, monitoring: "Oct 18", monitoringNote: "Scheduled", monitoringDue: false, alerts: 0, underReview: false },
  { id: "225719", name: "Evan Brooks", initials: "EB", coordinator: "B. A.", program: "CCP", county: "Bergen", tier: "Tier C", effective: "02/01/2026", isp: "03/01/2026 – 02/28/2027", compliance: 72, monitoring: "Sep 25", monitoringNote: "Due soon", monitoringDue: true, alerts: 2, underReview: true },
  { id: "236820", name: "Naomi Carter", initials: "NC", coordinator: "Ph. D.", program: "SP", county: "Essex", tier: "Tier A", effective: "05/15/2026", isp: "06/01/2026 – 05/31/2027", compliance: 96, monitoring: "Nov 3", monitoringNote: "Scheduled", monitoringDue: false, alerts: 0, underReview: false },
  { id: "247931", name: "Daniel Kim", initials: "DK", coordinator: "M. S.", program: "CCP", county: "Passaic", tier: "Tier D", effective: "01/20/2026", isp: "02/01/2026 – 01/31/2027", compliance: 55, monitoring: "Oct 22", monitoringNote: "Scheduled", monitoringDue: false, alerts: 2, underReview: false },
  { id: "259042", name: "Olivia Thompson", initials: "OT", coordinator: "B. A.", program: "SP", county: "Union", tier: "Tier B", effective: "04/12/2026", isp: "05/01/2026 – 04/30/2027", compliance: 88, monitoring: "Nov 8", monitoringNote: "Scheduled", monitoringDue: false, alerts: 0, underReview: false },
  { id: "260153", name: "Henry Reed", initials: "HR", coordinator: "M. B. A.", program: "CCP", county: "Morris", tier: "Tier C", effective: "03/05/2026", isp: "04/01/2026 – 03/31/2027", compliance: 70, monitoring: "Oct 1", monitoringNote: "Due soon", monitoringDue: true, alerts: 1, underReview: false },
  { id: "271264", name: "Priya Shah", initials: "PS", coordinator: "Ph. D.", program: "SP", county: "Somerset", tier: "Tier A", effective: "06/01/2026", isp: "06/15/2026 – 06/14/2027", compliance: 100, monitoring: "Nov 15", monitoringNote: "Scheduled", monitoringDue: false, alerts: 0, underReview: false },
  { id: "282375", name: "Gabriel Torres", initials: "GT", coordinator: "M. S.", program: "CCP", county: "Hudson", tier: "Tier D", effective: "01/03/2026", isp: "02/01/2026 – 01/31/2027", compliance: 48, monitoring: "Oct 20", monitoringNote: "Scheduled", monitoringDue: false, alerts: 4, underReview: true },
  { id: "293486", name: "Emma Wilson", initials: "EW", coordinator: "B. A.", program: "SP", county: "Bergen", tier: "Tier B", effective: "05/20/2026", isp: "06/01/2026 – 05/31/2027", compliance: 84, monitoring: "Nov 19", monitoringNote: "Scheduled", monitoringDue: false, alerts: 1, underReview: false },
  { id: "304597", name: "Robert Davis", initials: "RD", coordinator: "M. B. A.", program: "CCP", county: "Middlesex", tier: "Tier C", effective: "02/14/2026", isp: "03/01/2026 – 02/28/2027", compliance: 76, monitoring: "Oct 29", monitoringNote: "Scheduled", monitoringDue: false, alerts: 1, underReview: false },
  { id: "315708", name: "Maya Johnson", initials: "MJ", coordinator: "Ph. D.", program: "SP", county: "Union", tier: "Tier A", effective: "06/10/2026", isp: "07/01/2026 – 06/30/2027", compliance: 90, monitoring: "Nov 25", monitoringNote: "Scheduled", monitoringDue: false, alerts: 0, underReview: false },
] as const;

const pageSize = 5;
const totalAlerts = clients.reduce((sum, client) => sum + client.alerts, 0);
const averageCompliance = Math.round(clients.reduce((sum, client) => sum + client.compliance, 0) / clients.length);
const filters: Filter[] = ["All clients", "Alerts", "Monitoring due", "SP", "CCP"];
const columns = ["Client", "Program", "County", "Tier", "ISP period", "PA compliance", "Next monitoring", "Alerts"];

export default function SupportCoordinatorClientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All clients");
  const [page, setPage] = useState(1);
  const query = search.trim().toLowerCase();
  const visibleClients = clients.filter((client) =>
    client.name.toLowerCase().includes(query) &&
    (filter === "All clients" ||
      (filter === "Alerts" && client.alerts > 0) ||
      (filter === "Monitoring due" && client.monitoringDue) ||
      client.program === filter)
  );
  const pageCount = Math.max(1, Math.ceil(visibleClients.length / pageSize));
  const pageClients = visibleClients.slice((page - 1) * pageSize, page * pageSize);

  const summary = [
    { label: "Active clients", value: clients.length, detail: `${clients.filter((client) => client.underReview).length} under review`, icon: UsersRound },
    { label: "Open alerts", value: totalAlerts, detail: "PA missing · SDR pending", icon: TriangleAlert },
    { label: "Monitoring due", value: clients.filter((client) => client.monitoringDue).length, detail: "Within next 14 days", icon: CalendarDays },
    { label: "PA Compliance", value: `${averageCompliance}%`, detail: "Avg across active services", icon: ClipboardCheck },
  ];

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] font-bold leading-[1.4] text-[#10141a] sm:text-[32px] lg:text-[40px]">Client Management</h1>
        <Button size="lg" className="h-[52px] gap-2 px-5" onClick={() => navigate(Routes.agency.addClient)}>
          <Plus className="h-5 w-5" />New Enrollment
        </Button>
      </div>

      <section aria-labelledby="sc-overview-title" className="mb-7">
        <h2 id="sc-overview-title" className="mb-3 text-[20px] font-bold text-[#10141a]">Overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map(({ label, value, detail, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-[#e5e7eb] bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e6f8f8] text-[#008f93]"><Icon className="h-4 w-4" /></span>
                <span className="text-[13px] font-semibold text-[#6b7280]">{label}</span>
              </div>
              <p className="mt-1 text-[28px] font-bold leading-tight text-[#10141a]">{value}</p>
              <p className="mt-1 text-[12px] text-[#6b7280]">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="sc-clients-title" className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-[#e5e7eb] p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 id="sc-clients-title" className="text-[22px] font-bold text-[#10141a]">Clients</h2>
              <p className="mt-0.5 text-[13px] text-[#6b7280]">Enrollment and monitoring overview</p>
            </div>
            <div className="relative w-full sm:w-[300px]">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#808081]" />
              <Input aria-label="Search client name" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search client name" className="h-10 rounded-full border-[#e5e7eb] pl-9 text-[13px]" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e5e7eb] px-4 py-3 sm:px-6">
          {filters.map((item) => (
            <button key={item} type="button" aria-pressed={filter === item} onClick={() => { setFilter(item); setPage(1); }}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b4b8] ${filter === item ? "border-[#00b4b8] bg-[#00b4b8] text-white" : "border-[#e5e7eb] text-[#6b7280] hover:border-[#cccccd]"}`}>
              {item === "Alerts" ? `Alerts (${totalAlerts})` : item}
            </button>
          ))}
          <span className="ml-auto text-[13px] text-[#6b7280]">{visibleClients.length} clients</span>
        </div>
        <div className="overflow-x-auto">
          <div role="table" aria-label="Support Coordination clients" className="sc-client-table">
            <div role="row" className="sc-client-grid hidden gap-3 border-b border-[#e5e5e6] bg-[#f9fafb] px-4 py-3 lg:grid">
              {columns.map((column) => <span key={column} role="columnheader" className="text-[12px] font-semibold uppercase tracking-wide text-[#808081]">{column}</span>)}
            </div>
            {visibleClients.length === 0 ? (
              <p className="px-4 py-12 text-center text-[14px] text-[#6b7280]">No clients match your search or filter.</p>
            ) : pageClients.map((client) => {
              const tone = client.compliance === 100 ? "#0eaf52" : client.compliance < 50 ? "#d92d20" : "#f97316";
              return <div role="row" key={client.id} className="sc-client-grid grid grid-cols-1 gap-3 border-b border-[#e5e5e6] px-4 py-4 last:border-b-0 hover:bg-[#f9fafb] lg:items-center">
                <div role="cell" className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-10 w-10"><AvatarFallback className="bg-[#e6f8f8] text-[12px] font-bold text-[#007f84]">{client.initials}</AvatarFallback></Avatar>
                  <div className="min-w-0"><p className="truncate text-[14px] font-semibold text-[#10141a]">{client.name}</p><p className="truncate text-[12px] text-[#6b7280]">ID: {client.id} · SC: {client.coordinator}</p></div>
                </div>
                <div role="cell"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">Program</span><Badge variant="outline" className="px-2 py-1" style={{ borderColor: client.program === "CCP" ? "#2b82ff" : "#8754d6", color: client.program === "CCP" ? "#2b82ff" : "#8754d6" }}>{client.program}</Badge></div>
                <div role="cell" className="text-[13px] text-[#10141a]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">County</span>{client.county}</div>
                <div role="cell" className="text-[13px]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">Tier</span><span className="font-semibold text-[#10141a]">{client.tier}</span><span className="block text-[12px] text-[#6b7280]">eff. {client.effective}</span></div>
                <div role="cell" className="text-[12px] text-[#10141a]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">ISP period</span>{client.isp}</div>
                <div role="cell" className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: tone }}><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">PA compliance</span><span role="progressbar" aria-label={`${client.name} PA compliance`} aria-valuenow={client.compliance} aria-valuemin={0} aria-valuemax={100} className="h-2 w-20 overflow-hidden rounded-full bg-[#e5e7eb]"><span className="block h-full rounded-full" style={{ width: `${client.compliance}%`, backgroundColor: tone }} /></span>{client.compliance}%</div>
                <div role="cell" className="text-[13px] text-[#10141a]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">Next monitoring</span><span className="font-semibold">{client.monitoring}</span><span className="ml-1 text-[12px] text-[#6b7280]">{client.monitoringNote}</span></div>
                <div role="cell"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">Alerts</span><Badge variant={client.alerts ? "error" : "success"} className="px-2 py-1">{client.alerts || "Clear"}</Badge></div>
              </div>;
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e7eb] px-4 py-3 sm:pl-6" style={{ paddingRight: 72 }}>
          <p className="text-[13px] text-[#6b7280]">Showing {visibleClients.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, visibleClients.length)} of {visibleClients.length} clients</p>
          <div className="flex items-center gap-2">
            <span className="mr-2 text-[13px] text-[#6b7280]">Page {page} of {pageCount}</span>
            <Button variant="outline" size="sm" className="text-[#10141a]" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <Button variant="outline" size="sm" className="text-[#10141a]" aria-label="Next page" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
