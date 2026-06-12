import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { searchEmployees, type Employee } from "@/lib/api/employees";
import { useAuth } from "@/utils/auth";

export type AssignedDsp = { id: string; name: string };

export type ServiceAssignedDspsSectionProps = {
  isEditing: boolean;
  assignedDsps?: AssignedDsp[];
  onChange?: (assignedDsps: AssignedDsp[]) => void;
};

function DspSearchSlotRow({
  assigned,
  onPick,
  onRemoveSlot,
}: {
  assigned: { id: string }[];
  onPick: (emp: Employee) => void;
  onRemoveSlot: () => void;
}) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(
    (q: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (q.trim().length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      const agencyId = user?.agencyId || user?.uid;
      const assignedIds = new Set(assigned.map((d) => d.id));
      timeoutRef.current = setTimeout(async () => {
        try {
          setSearching(true);
          const res = await searchEmployees(q, agencyId);
          const filtered = res.filter((e) => !assignedIds.has(e.id));
          setResults(filtered);
          setOpen(filtered.length > 0);
        } catch {
          setResults([]);
          setOpen(false);
        } finally {
          setSearching(false);
        }
      }, 300);
    },
    [user?.agencyId, user?.uid, assigned],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="max-w-md">
      <div ref={containerRef} className="relative flex flex-col gap-1">
        <div className="flex h-11 w-full items-stretch overflow-hidden rounded-xl border border-[#cccccd] bg-white">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                runSearch(v);
              }}
              placeholder="Search staff by name (2+ characters)"
              className="min-w-0 flex-1 bg-transparent text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none"
            />
            {searching ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#808081]" />
            ) : null}
          </div>
          <button
            type="button"
            className="flex h-full w-11 shrink-0 items-center justify-center text-[#10141a] transition-colors hover:bg-gray-50"
            onClick={onRemoveSlot}
            aria-label="Cancel search"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {open && results.length > 0 ? (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-[200px] overflow-y-auto rounded-xl border border-[#cccccd] bg-white shadow-lg">
            {results.map((emp) => (
              <button
                key={emp.id}
                type="button"
                className="w-full cursor-pointer border-b border-[#f0f0f0] px-4 py-3 text-left first:rounded-t-[12px] last:rounded-b-[12px] last:border-b-0 hover:bg-gray-50"
                onClick={() => {
                  onPick(emp);
                  setQuery("");
                  setOpen(false);
                  setResults([]);
                }}
              >
                <p className="text-[14px] font-normal text-black">{emp.fullName}</p>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ServiceAssignedDspsEditor({
  assignedDsps,
  onChange,
}: {
  assignedDsps: AssignedDsp[];
  onChange: (assignedDsps: AssignedDsp[]) => void;
}) {
  const [dspSearchSlotIds, setDspSearchSlotIds] = useState<string[]>([]);

  const addDspFromEmployee = useCallback(
    (emp: Employee) => {
      if (assignedDsps.some((d) => d.id === emp.id)) return;
      onChange([...assignedDsps, { id: emp.id, name: emp.fullName }]);
    },
    [assignedDsps, onChange],
  );

  const removeDsp = (id: string) => {
    onChange(assignedDsps.filter((d) => d.id !== id));
  };

  const addSearchSlot = () => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Math.random());
    setDspSearchSlotIds((s) => [...s, id]);
  };

  const removeSearchSlot = (slotId: string) => {
    setDspSearchSlotIds((s) => s.filter((x) => x !== slotId));
  };

  return (
    <div>
      <div className="mb-4">
        <p className="mb-1 text-[14px] font-semibold leading-[1.4] text-[#10141a]">
          Assigned Caregivers
        </p>
        <p className="text-[13px] text-[#808081]">
          Search for staff to assign to this service. Assignments are not imported from uploaded
          files.
        </p>
      </div>
      {assignedDsps.length === 0 ? (
        <p className="mb-2 text-[13px] text-[#808081]">
          No caregivers assigned yet. Use Add Caregiver below to search.
        </p>
      ) : (
        <ul className="mb-3 flex w-full max-w-md flex-col gap-2">
          {assignedDsps.map((d) => (
            <li
              key={d.id}
              className="flex min-w-0 items-center justify-between rounded-[12px] border border-[#cccccd] bg-white px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-[14px] text-[#10141a]">{d.name}</span>
              <button
                type="button"
                className="shrink-0 rounded-md p-1 text-[#10141a] transition-colors hover:bg-gray-50"
                onClick={() => removeDsp(d.id)}
                aria-label={`Remove ${d.name} from this service`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mb-2 flex flex-col gap-3">
        {dspSearchSlotIds.map((slotId) => (
          <DspSearchSlotRow
            key={slotId}
            assigned={assignedDsps}
            onPick={(emp) => {
              addDspFromEmployee(emp);
              removeSearchSlot(slotId);
            }}
            onRemoveSlot={() => removeSearchSlot(slotId)}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed border-[#808081] text-[#10141a] sm:w-auto"
        onClick={addSearchSlot}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add Caregiver
      </Button>
    </div>
  );
}

function ServiceAssignedDspsView({ assignedDsps }: { assignedDsps: AssignedDsp[] }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[12px] font-normal text-[#10141a]">Assigned DSPs</p>
      <p className="text-[14px] font-semibold text-[#10141a]">
        {assignedDsps.map((d) => d.name).join(", ")}
      </p>
    </div>
  );
}

export function ServiceAssignedDspsSection({
  isEditing,
  assignedDsps = [],
  onChange,
}: ServiceAssignedDspsSectionProps) {
  if (!isEditing) {
    if (!assignedDsps.length) return null;
    return (
      <div className="mt-3 border-t border-[#e5e5e6] pt-3">
        <ServiceAssignedDspsView assignedDsps={assignedDsps} />
      </div>
    );
  }

  return (
    <div className="col-span-full mt-6 space-y-6 border-t border-[#cccccd]/60 pt-6">
      <ServiceAssignedDspsEditor
        assignedDsps={assignedDsps}
        onChange={onChange ?? (() => {})}
      />
    </div>
  );
}
