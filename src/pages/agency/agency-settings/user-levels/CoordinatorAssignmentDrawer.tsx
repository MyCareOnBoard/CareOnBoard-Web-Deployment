import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listEmployees } from "@/lib/api/employees";

type Coordinator = { id: string; fullName: string; email?: string };

interface Props {
  staffName: string;
  agencyId: string;
  assignedIds: string[];
  canAssign: boolean;
  onClose: () => void;
  onSave: (coordinatorIds: string[], expectedCoordinatorIds: string[]) => Promise<void>;
}

export default function CoordinatorAssignmentDrawer({ staffName, agencyId, assignedIds, canAssign, onClose, onSave }: Props) {
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(canAssign ? assignedIds : []);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      try {
        const found: Coordinator[] = [];
        let cursor: string | undefined;
        const seen = new Set<string>();
        do {
          const page = await listEmployees({ agencyId, role: "support_coordinator", limit: 100, cursor, signal: controller.signal });
          found.push(...page.employees.map(({ id, fullName, email }) => ({ id, fullName, email })));
          cursor = page.nextCursor || undefined;
          if (cursor && seen.has(cursor)) throw new Error("Unable to load all coordinators.");
          if (cursor) seen.add(cursor);
        } while (cursor);
        if (active) setCoordinators(found.sort((a, b) => a.fullName.localeCompare(b.fullName)));
      } catch {
        if (active) setError("Could not load coordinators. Close and try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [agencyId]);

  const visible = coordinators.filter((coordinator) =>
    `${coordinator.fullName} ${coordinator.email || ""}`.toLowerCase().includes(search.toLowerCase().trim()));
  const availableIds = new Set(coordinators.map(({ id }) => id));
  const unavailableCount = assignedIds.filter((id) => !availableIds.has(id)).length;
  const selectionChanged = selectedIds.length !== assignedIds.length || selectedIds.some((id) => !assignedIds.includes(id));

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
        <div><DialogTitle className="text-xl">Manage coordinators</DialogTitle><DialogDescription className="mt-1 text-sm">Choose the support coordinators {staffName} can manage.</DialogDescription></div>
        <button type="button" aria-label="Close assignment drawer" disabled={saving} onClick={onClose} className="rounded-lg p-1 text-[#6b7280] hover:bg-[#f3f4f6] focus-visible:outline-2 focus-visible:outline-[#008f93]"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-6 pt-5">
        {!canAssign && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Give this staff member Support Coordination access before assigning coordinators. Save to clear any existing assignments.</p>}
        <label htmlFor="coordinator-search" className="mb-2 text-sm font-medium text-[#10141a]">Search coordinators</label>
        <Input id="coordinator-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email" className="mb-4" />
        <p className="mb-3 text-sm text-[#6b7280]">{selectedIds.length} selected</p>
        {unavailableCount > 0 && !loading && <p className="mb-3 text-sm text-amber-800">{unavailableCount} previously assigned coordinator{unavailableCount === 1 ? " is" : "s are"} no longer available and will be removed when saved.</p>}
        {loading ? <p role="status" className="text-sm text-[#6b7280]">Loading coordinators…</p> :
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-5">
            {visible.length === 0 ? <p className="rounded-lg border border-[#e5e7eb] p-4 text-sm text-[#6b7280]">{search ? "No coordinators match your search." : "No support coordinators are available."}</p> : visible.map((coordinator) =>
              <label key={coordinator.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e5e7eb] p-3 hover:border-[#00b4b8]">
                <input type="checkbox" disabled={!canAssign || saving} checked={selectedIds.includes(coordinator.id)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, coordinator.id] : ids.filter((id) => id !== coordinator.id))} className="h-4 w-4 accent-[#008f93]" />
                <span className="min-w-0"><span className="block truncate text-sm font-medium text-[#10141a]">{coordinator.fullName}</span><span className="block truncate text-xs text-[#808081]">{coordinator.email}</span></span>
              </label>)}
          </div>}
      </div>
      <div className="border-t border-[#e5e7eb] px-6 py-4">
        {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button type="button" disabled={loading || saving || !!error && coordinators.length === 0 || (!selectionChanged && unavailableCount === 0)} onClick={save}>{saving ? "Saving…" : "Save assignments"}</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}
