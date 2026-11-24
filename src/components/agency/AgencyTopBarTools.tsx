import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { FileText, Megaphone, Search, User, Users } from "lucide-react";
import axiosClient from "@/lib/axios";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { searchClients } from "@/lib/api/clients";
import { listEmployees } from "@/lib/api/employees";
import type { NavItem } from "@/components/DashboardSidebar";
import { Routes } from "@/routes/constants";

interface Announcement {
  id: string;
  title: string;
  type: "info" | "warning" | "urgent";
}

// The design shows announcements in amber; urgent ones stay red so they still stand out.
const AMBER_TONE = "bg-[#fcf5dc] text-[#7a5800] hover:bg-[#f9efc8] dark:bg-[#e0b400]/15 dark:text-[#f0cf6b] dark:hover:bg-[#e0b400]/20";
const PILL_TONE: Record<Announcement["type"], string> = {
  info: AMBER_TONE,
  warning: AMBER_TONE,
  urgent: "bg-[#fde8e6] text-[#b42318] hover:bg-[#fbdcd9] dark:bg-[#ef4444]/15 dark:text-[#f8a1a1] dark:hover:bg-[#ef4444]/20",
};
const PRIORITY: Record<string, number> = { urgent: 0, warning: 1, info: 2 };

/** Top bar pill with the most important current announcement, linking to the list. */
export function AgencyAnnouncementPill({ endpoint, viewAllPath }: { endpoint: string; viewAllPath: string }) {
  const [top, setTop] = useState<{ item: Announcement; count: number } | null>(null);
  const location = useLocation();
  useEffect(() => {
    let cancelled = false;
    axiosClient.get<{ success: boolean; data: Announcement[] }>(endpoint)
      .then((res) => {
        if (cancelled) return;
        const list = [...(res.data.data ?? [])].sort((a, b) => (PRIORITY[a.type] ?? 2) - (PRIORITY[b.type] ?? 2));
        setTop(list.length ? { item: list[0], count: list.length } : null);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [endpoint]);
  if (!top || location.pathname === viewAllPath) return null;
  return (
    <Link to={viewAllPath} title={top.item.title}
      aria-label={`Announcement: ${top.item.title}${top.count > 1 ? `, and ${top.count - 1} more` : ""}`}
      className={cn("inline-flex h-9 min-w-0 max-w-[340px] shrink items-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-colors", PILL_TONE[top.item.type] ?? PILL_TONE.info)}>
      <Megaphone aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="hidden truncate lg:inline">{top.item.title}</span>
      {top.count > 1 && <span className="shrink-0 opacity-75"><span className="lg:hidden">+{top.count - 1}</span><span className="hidden lg:inline">+{top.count - 1} more</span></span>}
    </Link>
  );
}

type Result = { key: string; label: string; detail?: string; path: string; kind: "page" | "client" | "staff" };
const ICON = { page: FileText, client: User, staff: Users } as const;

/**
 * Global search in the agency top bar (Ctrl/Cmd + K): pages from the menu,
 * plus clients and staff when the user can open those areas.
 */
export function AgencyGlobalSearch({ navItems, agencyId }: { navItems: NavItem[]; agencyId: string | null | undefined }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const seq = useRef(0);

  const pages = useMemo(() => navItems.flatMap((item) => [
    ...(item.path ? [{ label: item.label, path: item.path }] : []),
    ...(item.children ?? []).map((child) => ({ label: `${item.label} › ${child.label}`, path: child.path })),
  ]).filter((p): p is { label: string; path: string } => typeof p.path === "string"), [navItems]);
  const canClients = pages.some((p) => p.path === Routes.agency.clients);
  const canStaff = pages.some((p) => p.path === Routes.agency.dspManagement);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (!open) { setQuery(""); setPeople([]); } }, [open]);

  const q = query.trim().toLowerCase();
  useEffect(() => {
    setActive(0);
    if (q.length < 2 || !agencyId || (!canClients && !canStaff)) { setPeople([]); setLoading(false); return; }
    const id = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      const [clients, staff] = await Promise.all([
        canClients ? searchClients(q, agencyId).catch(() => []) : Promise.resolve([]),
        canStaff ? listEmployees({ agencyId, search: q, limit: 5 }).then((r) => r.employees).catch(() => []) : Promise.resolve([]),
      ]);
      if (id !== seq.current) return;
      setPeople([
        ...clients.slice(0, 5).map((c) => ({ key: `c:${c.id}`, kind: "client" as const, label: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Client", detail: "Client", path: Routes.agency.clientDetails.replace(":clientId", encodeURIComponent(c.id)) })),
        ...staff.slice(0, 5).map((e) => ({ key: `s:${e.id}`, kind: "staff" as const, label: e.fullName || e.email || "Staff member", detail: "Staff", path: Routes.agency.dspProfile.replace(":dspId", encodeURIComponent(e.id)) })),
      ]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, agencyId, canClients, canStaff]);

  const pageResults: Result[] = (q ? pages.filter((p) => p.label.toLowerCase().includes(q)) : pages).slice(0, q ? 6 : 8)
    .map((p) => ({ key: `p:${p.path}`, kind: "page", label: p.label, path: p.path }));
  const results = [...pageResults, ...people];

  const go = (result: Result | undefined) => {
    if (!result) return;
    setOpen(false);
    navigate(result.path);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Search (Ctrl+K)" title="Search (Ctrl+K)"
        className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[rgba(22,22,22,0.1)] bg-white text-[#10141a] transition-colors hover:bg-[#f3f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:border-white/10 dark:bg-[#1b232b] dark:text-[#f4f6f7] dark:hover:bg-white/5">
        <Search aria-hidden="true" className="h-5 w-5" strokeWidth={1.6} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-[15vh] max-w-[560px] translate-y-0 gap-0 overflow-hidden rounded-[16px] p-0 dark:bg-[#1b232b]">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">Find a page, client or staff member.</DialogDescription>
          <div className="flex items-center gap-2 border-b border-[#edf1f2] px-4 dark:border-white/10">
            <Search aria-hidden="true" className="h-4 w-4 text-[#8a979d]" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={canClients || canStaff ? "Search pages, clients and staff" : "Search pages"}
              role="combobox" aria-expanded="true" aria-controls="agency-search-results" aria-activedescendant={results[active] ? `agency-search-${active}` : undefined}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
                if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
              }}
              className="h-12 flex-1 bg-transparent text-[15px] text-[#10141a] outline-none placeholder:text-[#8a979d] dark:text-[#f4f6f7]" />
          </div>
          <ul id="agency-search-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
            {results.map((r, i) => {
              const Icon = ICON[r.kind];
              return (
                <li key={r.key} id={`agency-search-${i}`} role="option" aria-selected={i === active}>
                  <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(r)}
                    className={cn("flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2 text-left text-[14px] text-[#10141a] dark:text-[#f4f6f7]", i === active && "bg-[#eef4f5] dark:bg-white/5")}>
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#5d6b73]" />
                    <span className="min-w-0 flex-1 truncate">{r.label}</span>
                    {r.detail && <span className="text-[12px] text-[#5d6b73]">{r.detail}</span>}
                  </button>
                </li>
              );
            })}
            {!results.length && !loading && <li className="px-3 py-6 text-center text-[13px] text-[#5d6b73]">No matches.</li>}
            {loading && <li className="px-3 py-2 text-[12px] text-[#5d6b73]">Searching clients and staff…</li>}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
