import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listAssignableClients, type AssignableClient, type AssignableClientMode } from "@/lib/api/staff-client-assignment";

interface Props {
  staffName: string;
  agencyId: string;
  modes: AssignableClientMode[];
  asPlatformAdmin?: boolean;
  assignedIds: string[];
  canAssign: boolean;
  onClose: () => void;
  onSave: (clientIds: string[], expectedClientIds: string[]) => Promise<void>;
}

/** Picks the DDD/HHA clients a staff member with Client Management can see and manage. */
export default function ClientAssignmentDrawer({ staffName, agencyId, modes, asPlatformAdmin = false, assignedIds, canAssign, onClose, onSave }: Props) {
  const [clients, setClients] = useState<AssignableClient[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(canAssign ? assignedIds : []);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const modeKey = modes.join(",");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    listAssignableClients({ modes: modeKey ? modeKey.split(",") as AssignableClientMode[] : [], agencyId, asPlatformAdmin, signal: controller.signal })
      .then((found) => { if (active) setClients(found); })
      .catch(() => { if (active) setError("Could not load clients. Close and try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [agencyId, asPlatformAdmin, modeKey]);

  const term = search.toLowerCase().trim();
  const visible = clients.filter((client) => client.name.toLowerCase().includes(term));
  const availableIds = new Set(clients.map(({ id }) => id));
  const unavailableCount = assignedIds.filter((id) => !availableIds.has(id)).length;
  const selectionChanged = selectedIds.length !== assignedIds.length || selectedIds.some((id) => !assignedIds.includes(id));
  const showMode = modes.length > 1;
  const visibleIds = visible.map(({ id }) => id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  function toggleVisible() {
    setSelectedIds((ids) => allVisibleSelected
      ? ids.filter((id) => !visibleIds.includes(id))
      : [...new Set([...ids, ...visibleIds])]);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave(selectedIds.filter((id) => availableIds.has(id)), assignedIds);
      onClose();
    } catch (cause: unknown) {
      const response = cause as { data?: { error?: string } };
      setError(response?.data?.error || "Could not save assignments. Refresh and try again.");
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
    <DialogContent showCloseButton={false} className="!top-0 !right-0 !left-auto !h-dvh !w-full !max-w-[480px] !translate-x-0 !translate-y-0 !rounded-none p-0 flex flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] px-6 py-5">
        <div><DialogTitle className="text-xl">Manage clients</DialogTitle><DialogDescription className="mt-1 text-sm">Choose the clients {staffName} can see and manage. Clients not selected stay hidden from them.</DialogDescription></div>
        <button type="button" aria-label="Close client assignment" disabled={saving} onClick={onClose} className="rounded-lg p-1 text-[#6b7280] hover:bg-[#f3f4f6] focus-visible:outline-2 focus-visible:outline-[#008f93]"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-6 pt-5">
        {!canAssign && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Give this staff member Client Management access before assigning clients. Save to clear any existing assignments.</p>}
        <label htmlFor="client-assignment-search" className="mb-2 text-sm font-medium text-[#10141a]">Search clients</label>
        <Input id="client-assignment-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" className="mb-4" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-[#6b7280]" aria-live="polite">{selectedIds.length} selected</p>
          {canAssign && !loading && visible.length > 0 && <button type="button" disabled={saving} onClick={toggleVisible} className="rounded-md text-sm font-medium text-[#007a7d] hover:underline focus-visible:outline-2 focus-visible:outline-[#008f93]">
            {allVisibleSelected ? "Clear shown" : "Select shown"}
          </button>}
        </div>
        {unavailableCount > 0 && !loading && !error && <p className="mb-3 text-sm text-amber-800">{unavailableCount} previously assigned client{unavailableCount === 1 ? " is" : "s are"} no longer available and will be removed when saved.</p>}
        {loading ? <p role="status" className="text-sm text-[#6b7280]">Loading clients…</p> :
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-5">
            {visible.length === 0 ? <p className="rounded-lg border border-[#e5e7eb] p-4 text-sm text-[#6b7280]">{search ? "No clients match your search." : "No clients are available."}</p> : visible.map((client) =>
              <label key={client.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e5e7eb] p-3 hover:border-[#00b4b8]">
                <input type="checkbox" disabled={!canAssign || saving} checked={selectedIds.includes(client.id)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, client.id] : ids.filter((id) => id !== client.id))} className="h-4 w-4 accent-[#008f93]" />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-[#10141a]">{client.name}</span>{client.status && <span className="block truncate text-xs capitalize text-[#808081]">{client.status}</span>}</span>
                {showMode && <span className="rounded-full bg-[#e6f7f7] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#008f93]">{client.mode}</span>}
              </label>)}
          </div>}
      </div>
      <div className="border-t border-[#e5e7eb] px-6 py-4">
        {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button type="button" disabled={loading || saving || (!!error && clients.length === 0) || (!selectionChanged && unavailableCount === 0)} onClick={save}>{saving ? "Saving…" : "Save assignments"}</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}
