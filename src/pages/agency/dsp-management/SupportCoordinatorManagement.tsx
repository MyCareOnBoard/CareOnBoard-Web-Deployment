import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { listClients, updateClient, type Client } from "@/lib/api/clients";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { useDSPList } from "./useDSPManagement";
import type { DSP } from "./types";

const MAX_CASELOAD = 5;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
const clientName = (client: Client) => [client.firstName, client.lastName].filter(Boolean).join(" ") || client.preferredName || client.id;
const assignedTo = (client: Client, coordinator: DSP) => client.supportCoordinatorId
  ? client.supportCoordinatorId === coordinator.id
  : client.supportCoordinatorName?.trim().toLowerCase() === coordinator.fullName.trim().toLowerCase();

function TeamSkeleton() {
  return <div role="status" aria-label="Loading support coordinators" className="space-y-7">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-xl border border-[#e5e7eb] bg-white p-4">
        <Skeleton className="h-4 w-24" /><Skeleton className="mt-4 h-7 w-12" /><Skeleton className="mt-2 h-3 w-32" />
      </div>)}
    </div>
    <div className="space-y-2">
      {Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4">
        <Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-56 max-w-full" /></div><Skeleton className="h-8 w-24 rounded-lg" />
      </div>)}
    </div>
  </div>;
}

export default function SupportCoordinatorManagement() {
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const { dsps, isLoading: staffLoading, error: staffError } = useDSPList();
  const coordinators = dsps.filter((person) => person.role.toLowerCase() === "support_coordinator");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState("");
  const [tab, setTab] = useState<"team" | "documents">("team");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<DSP | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const refreshClients = async () => {
    const result = await listClients({ agencyId, type: "sc", all: true });
    setClients(result);
  };

  useEffect(() => {
    if (!agencyId) {
      setClientsError("Agency ID not found.");
      setClientsLoading(false);
      return;
    }
    let active = true;
    setClientsLoading(true);
    listClients({ agencyId, type: "sc", all: true })
      .then((result) => { if (active) { setClients(result); setClientsError(""); } })
      .catch(() => { if (active) setClientsError("Unable to load clients. Refresh the page to retry."); })
      .finally(() => { if (active) setClientsLoading(false); });
    return () => { active = false; };
  }, [agencyId]);

  const openAssignment = (person: DSP) => {
    setAssigning(person);
    setSelectedIds(clients.filter((client) => assignedTo(client, person)).map((client) => client.id));
    setSaveError("");
  };

  const saveAssignment = async () => {
    if (!assigning || selectedIds.length > MAX_CASELOAD) return;
    setSaving(true);
    setSaveError("");
    try {
      for (const client of clients) {
        const wasAssigned = assignedTo(client, assigning);
        const shouldAssign = selectedIds.includes(client.id);
        if (wasAssigned === shouldAssign) continue;
        await updateClient(client.id, shouldAssign
          ? { supportCoordinatorId: assigning.id, supportCoordinatorName: assigning.fullName, supportCoordinatorAgency: user?.agency?.name || "", supportCoordinatorContact: assigning.email || assigning.phoneNumber || "" }
          : { supportCoordinatorId: null, supportCoordinatorName: "", supportCoordinatorAgency: "", supportCoordinatorContact: "" }, agencyId);
      }
      await refreshClients();
      setAssigning(null);
    } catch {
      setSaveError("Assignments could not be saved. Review the client list and try again.");
      try { await refreshClients(); } catch { /* Preserve the save error. */ }
    } finally {
      setSaving(false);
    }
  };

  const assignedCount = clients.filter((client) => coordinators.some((person) => assignedTo(client, person))).length;
  const availableCount = coordinators.filter((person) => clients.filter((client) => assignedTo(client, person)).length < MAX_CASELOAD).length;
  const metrics = [
    ["My Team (SCs)", coordinators.length, "Support coordinators"],
    ["My Clients", clients.length, "Assigned by agency"],
    ["Unassigned", clients.length - assignedCount, "Need SC assignment"],
    ["SC Capacity", `${availableCount}/${coordinators.length}`, "SCs with open slots"],
  ] as const;

  return <div className="min-h-screen">
    <div className="mx-auto space-y-7 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Support Coordinator Management</h1>
        <div role="tablist" aria-label="Support coordinator management" className="flex gap-2">
          {([ ["team", "My Team"], ["documents", "Document review"] ] as const).map(([id, label]) => <button key={id} id={`sc-${id}-tab`} type="button" role="tab" aria-controls={`sc-${id}-panel`} aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${tab === id ? "border-[#008f93] bg-[#008f93] text-white" : "border-[#e5e7eb] bg-white text-[#10141a] hover:border-[#008f93]"}`}>{label}</button>)}
        </div>
      </header>

      {(staffError || clientsError) && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{staffError || clientsError}</p>}
      {staffLoading || clientsLoading ? <TeamSkeleton /> : staffError || clientsError ? null : tab === "team" ? <div id="sc-team-panel" role="tabpanel" aria-labelledby="sc-team-tab" className="space-y-7">
        <section aria-labelledby="sc-overview-title">
          <h2 id="sc-overview-title" className="mb-3 text-lg font-semibold text-[#10141a]">Overview</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value, detail]) => <div key={label} className="rounded-xl border border-[#e5e7eb] bg-white p-4">
              <p className="text-xs font-semibold text-[#10141a]">{label}</p><p className="mt-3 text-2xl text-[#10141a]">{value}</p><p className="mt-1 text-xs text-[#808081]">{detail}</p>
            </div>)}
          </div>
        </section>
        <section aria-labelledby="sc-team-title" className="space-y-3">
          <h2 id="sc-team-title" className="text-lg font-semibold text-[#10141a]">My team</h2>
          {coordinators.length === 0 ? <p className="rounded-xl border border-[#e5e7eb] bg-white p-6 text-sm text-[#6b7280]">No support coordinators yet.</p> : coordinators.map((person) => {
            const assigned = clients.filter((client) => assignedTo(client, person));
            const expanded = expandedId === person.id;
            return <div key={person.id} className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
              <div className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
                <Avatar className="h-10 w-10 shrink-0"><AvatarImage src={person.profilePicture} alt="" /><AvatarFallback className="bg-[#fbe7ea] text-xs font-semibold text-[#c8213a]">{initials(person.fullName)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#10141a]">{person.fullName}</p><p className="truncate text-xs text-[#808081]">{[person.email, person.phoneNumber].filter(Boolean).join(" · ")}</p></div>
                <div className="w-20 shrink-0 text-right"><p className="text-[11px] text-[#808081]">Caseload</p><div className="flex items-center gap-2"><div className="h-1 w-full rounded-full bg-[#e5e7eb]"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, assigned.length / MAX_CASELOAD * 100)}%` }} /></div><span className="text-xs font-semibold">{assigned.length}/{MAX_CASELOAD}</span></div></div>
                <Button type="button" variant="outline" size="sm" onClick={() => openAssignment(person)} className="border-[#ffb7c2] bg-[#fff4f6] text-[#c8213a] hover:bg-[#ffe8ec]">Assign Clients</Button>
                <button type="button" aria-label={`${expanded ? "Collapse" : "Expand"} ${person.fullName}'s clients`} aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : person.id)} className="rounded p-1 text-[#808081] hover:bg-gray-100"><ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></button>
              </div>
              {expanded && <div className="space-y-2 border-t border-[#f0f0f0] px-4 py-3">
                {assigned.length === 0 ? <p className="text-sm text-[#808081]">No clients assigned.</p> : assigned.map((client) => <Link key={client.id} to={Routes.agency.clientDetails.replace(":clientId", client.id)} className="flex items-center gap-3 rounded-lg border border-[#f0f0f0] bg-[#fcfcfd] p-2 hover:bg-[#f5fafa]">
                  <Avatar className="h-8 w-8"><AvatarFallback className="bg-[#fbe7ea] text-[10px] font-semibold text-[#c8213a]">{initials(clientName(client))}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#10141a]">{clientName(client)}</p><p className="truncate text-[11px] text-[#808081]">ID: {client.id} · {client.scEnrollment?.program || "SC"} · {client.countyState || "County not set"} · {client.tier || "Tier not set"}</p></div>
                  <Badge variant={client.status === "active" ? "success" : "warning"}>{client.status === "active" ? "Active" : "Review"}</Badge>
                </Link>)}
              </div>}
            </div>;
          })}
        </section>
      </div> : <section id="sc-documents-panel" role="tabpanel" aria-labelledby="sc-documents-tab" className="space-y-3">
        <h2 id="sc-documents-title" className="text-lg font-semibold text-[#10141a]">Document review</h2>
        <p className="text-sm text-[#6b7280]">Open a coordinator's staff record to review documents and request missing files.</p>
        {coordinators.length === 0 ? <p className="rounded-xl border border-[#e5e7eb] bg-white p-6 text-sm text-[#6b7280]">No support coordinators yet.</p> : coordinators.map((person) => <div key={person.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4"><span className="truncate text-sm font-semibold">{person.fullName}</span><Button asChild variant="outline" size="sm"><Link to={Routes.agency.dspProfile.replace(":dspId", person.id)}>Review documents</Link></Button></div>)}
      </section>}
    </div>

    <Dialog open={assigning !== null} onOpenChange={(open) => { if (!open && !saving) setAssigning(null); }}>
      <DialogContent className="w-[min(95vw,520px)] p-0" showCloseButton={false}>
        <div className="border-b border-[#e5e7eb] px-5 py-4"><DialogTitle className="text-base font-medium">Assign Clients to {assigning?.fullName}</DialogTitle><DialogDescription className="sr-only">Select up to five clients for this support coordinator.</DialogDescription></div>
        <div className="space-y-3 p-5">
          <p className="text-sm text-[#6b7280]">Assigning clients to <strong className="text-[#10141a]">{assigning?.fullName}</strong>. <span className="text-amber-700">Maximum 5 clients per coordinator.</span></p>
          <div className="flex items-center gap-2"><div className="h-1 flex-1 rounded-full bg-[#e5e7eb]"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${selectedIds.length / MAX_CASELOAD * 100}%` }} /></div><span className="text-xs">{selectedIds.length} / {MAX_CASELOAD}</span></div>
          <div className="max-h-[45vh] space-y-2 overflow-y-auto">
            {clients.length === 0 ? <p className="py-6 text-center text-sm text-[#808081]">No clients to assign.</p> : clients.map((client) => {
              const checked = selectedIds.includes(client.id);
              const atCapacity = !checked && selectedIds.length >= MAX_CASELOAD;
              return <label key={client.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 ${checked ? "border-[#ff5775] bg-[#fff4f6]" : "border-[#e5e7eb]"}`}>
                <input type="checkbox" checked={checked} disabled={saving || atCapacity} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, client.id] : current.filter((id) => id !== client.id))} aria-label={`Assign ${clientName(client)}`} className="size-4 shrink-0 accent-[#c8213a]" />
                <Avatar className="h-8 w-8"><AvatarFallback className="bg-[#fbe7ea] text-[10px] font-semibold text-[#c8213a]">{initials(clientName(client))}</AvatarFallback></Avatar>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#10141a]">{clientName(client)}</span><span className="block truncate text-[11px] text-[#808081]">ID: {client.id} · {client.scEnrollment?.program || "SC"} · {client.countyState || "County not set"} · {client.tier || "Tier not set"}</span></span>
                <Badge variant={client.status === "active" ? "success" : "warning"}>{client.status === "active" ? "Active" : "Review"}</Badge>
              </label>;
            })}
          </div>
          {saveError && <p role="alert" className="text-xs text-red-700">{saveError}</p>}
          <div className="grid grid-cols-2 gap-2 border-t border-[#e5e7eb] pt-3"><Button variant="secondary" disabled={saving} onClick={() => setAssigning(null)}>Cancel</Button><Button disabled={saving || selectedIds.length > MAX_CASELOAD || Boolean(clientsError)} onClick={() => void saveAssignment()}>{saving ? "Saving…" : "Save Assignment"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
