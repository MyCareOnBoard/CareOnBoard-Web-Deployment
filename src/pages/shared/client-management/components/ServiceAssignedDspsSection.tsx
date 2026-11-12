import { RosterAssignmentReview, useRosterReviewSelection, type ReviewRosterRow } from "@/components/AssignmentReviewRoster";
import React, { lazy, Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import {Switch} from "@/components/ui/switch";
import {ConfirmDialog, ConfirmDialogContent} from "@/components/ui/confirm-dialog";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { searchEmployees, type Employee } from "@/lib/api/employees";
import { useAuth } from "@/utils/auth";
import {
  useEffectiveAgencyMode,
  agencyModeToApplicantType,
} from "@/hooks/useEffectiveAgencyMode";

const ClientCompetencyPanel = lazy(() => import("@/pages/shared/client-details/components/ClientCompetencyPanel").then(m => ({ default: m.ClientCompetencyPanel })));

export type AssignedDsp = { id: string; name: string };

export type ServiceAssignedDspsSectionProps = {
  isEditing: boolean;
  reviewRow?: ReviewRosterRow;
  assignedDsps?: AssignedDsp[];
  onChange?: (assignedDsps: AssignedDsp[]) => void;
  /** Client program, for the DSP vs Caregiver wording. Falls back to the agency mode. */
  program?: "ddd" | "hha";
};

function DspSearchSlotRow({
  assigned,
  onPick,
  onRemoveSlot,
  agencyId: explicitAgencyId,
  program,
}: {
  assigned: { id: string }[];
  onPick: (emp: Employee) => void;
  onRemoveSlot: () => void;
  agencyId?: string;
  program?: 'ddd' | 'hha';
}) {
  const { user } = useAuth();
  // Scope the staff search to the active program (DDD→dsp / HHA→hha) so caregiver
  // and DSP searches only surface employees for the current agency mode.
  const agencyMode = useEffectiveAgencyMode();
  const role = agencyModeToApplicantType(program || agencyMode);
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
      const agencyId = explicitAgencyId || user?.agencyId || user?.uid;
      const assignedIds = new Set(assigned.map((d) => d.id));
      timeoutRef.current = setTimeout(async () => {
        try {
          setSearching(true);
          const res = await searchEmployees(q, agencyId, { role });
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
    [explicitAgencyId, user?.agencyId, user?.uid, assigned, role],
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

export function MedicationRequirementQuestion() {
  const {medication} = useRosterReviewSelection(undefined);
  const toggleId = useId();
  if (!medication?.showQuestion) return null;
  return (
    <div className="mb-10 space-y-2">
      <div className="flex items-center gap-3">
        <label htmlFor={toggleId} className="text-sm font-bold">Is this client under medication?</label>
        <Switch id={toggleId} checked={medication.value.underMedication} onCheckedChange={underMedication => medication.onChange({underMedication, trainingRequired: underMedication})} />
      </div>
      {medication.value.underMedication && <p className="text-sm font-bold text-muted-foreground">Medication training requirement: {medication.value.trainingRequired ? 'On' : 'Off'}. Confirm the requirement when selecting staff.</p>}
    </div>
  );
}

// DDD staff are DSPs, HHA staff are caregivers. Default to DSP when the program is unknown.
function staffLabels(program?: string | null) {
  return program === "hha"
    ? { one: "Caregiver", many: "Caregivers", lower: "caregivers" }
    : { one: "DSP", many: "DSPs", lower: "DSPs" };
}

function ServiceAssignedDspsEditor({
  assignedDsps,
  onChange,
  reviewRow,
  program,
}: {
  reviewRow?: ReviewRosterRow;
  assignedDsps: AssignedDsp[];
  onChange: (assignedDsps: AssignedDsp[]) => void;
  program?: "ddd" | "hha";
}) {
  const review = useRosterReviewSelection(reviewRow);
  const agencyMode = useEffectiveAgencyMode();
  const labels = staffLabels(review.program || program || agencyMode);
  const medication = review.medication;
  const [rejectedStaff, setRejectedStaff] = useState<AssignedDsp | null>(null);
  useEffect(() => {setRejectedStaff(null);}, [review.scopeKey]);
  const [pendingStaff, setPendingStaff] = useState<{employee: Employee; slotId: string; scopeKey: string} | null>(null);
  useEffect(() => {setPendingStaff(null);}, [review.scopeKey, medication?.value.underMedication]);
  // Staff the agency said has medication training: their certificate is verified for this client next.
  const [verifyStaff, setVerifyStaff] = useState<{employee: Employee; scopeKey: string} | null>(null);
  useEffect(() => {setVerifyStaff(null);}, [review.scopeKey, medication?.value.underMedication]);
  const [dspSearchSlotIds, setDspSearchSlotIds] = useState<string[]>([]);

  const addDspFromEmployee = useCallback(
    (emp: Employee) => {
      if (assignedDsps.some((d) => d.id === emp.id)) return;
      setRejectedStaff(null);
      onChange([...assignedDsps, { id: emp.id, name: emp.fullName }]);
      review.select(emp.id);
    },
    [assignedDsps, onChange],
  );

  const confirmMedicationTraining = (trainingRequired: boolean) => {
    if (!pendingStaff || pendingStaff.scopeKey !== review.scopeKey || !medication?.value.underMedication) return;
    medication.onChange({...medication.value, trainingRequired});
    setVerifyStaff(trainingRequired ? {employee: pendingStaff.employee, scopeKey: pendingStaff.scopeKey} : null);
    addDspFromEmployee(pendingStaff.employee);
    removeSearchSlot(pendingStaff.slotId);
    setPendingStaff(null);
  };

  const removeDsp = (id: string) => {
    setRejectedStaff(null);
    setVerifyStaff(current => current?.employee.id === id ? null : current);
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

  const selectedStaff = assignedDsps.find(d => d.id === review.selectedEmployee) || (rejectedStaff?.id === review.selectedEmployee ? rejectedStaff : null);
  const clearBlockedStaff = useCallback(() => {
    const staff = assignedDsps.find(d => d.id === review.selectedEmployee);
    if (!staff || rejectedStaff?.id === staff.id) return;
    setRejectedStaff(staff);
    setPendingStaff(null);
    setDspSearchSlotIds([crypto.randomUUID()]);
    onChange(assignedDsps.filter(d => d.id !== staff.id));
  }, [assignedDsps, review.selectedEmployee, onChange, rejectedStaff]);

  return (
    <div>
      <div className="mb-4">
        <p className="mb-1 text-[14px] font-semibold leading-[1.4] text-[#10141a]">
          Assigned {labels.many}
        </p>
        <p className="text-[13px] text-[#808081]">
          Search for staff to assign to this service. Assignments are not imported from uploaded
          files.
        </p>
      </div>
      {assignedDsps.length === 0 ? (
        <p className="mb-2 text-[13px] text-[#808081]">
          No {labels.lower} assigned yet. Use Add {labels.one} below to search.
        </p>
      ) : (
        <ul className="mb-3 flex w-full max-w-md flex-col gap-2">
          {assignedDsps.map((d) => (
            <li
              key={d.id}
              className="flex min-w-0 items-center justify-between rounded-[12px] border border-[#cccccd] bg-white px-3 py-2"
            >
              {review.available ? <button type="button" onClick={() => review.select(d.id)} aria-pressed={review.selectedEmployee === d.id} className="min-w-0 flex-1 truncate text-left text-[14px] text-[#10141a]" aria-label={`Review assignment for ${d.name}`}>{d.name}</button> : <span className="min-w-0 flex-1 truncate text-[14px] text-[#10141a]">{d.name}</span>}
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
            agencyId={review.agencyId}
            program={review.program}
            assigned={assignedDsps}
            onPick={(emp) => {
              if (medication?.value.underMedication) setPendingStaff({employee: emp, slotId, scopeKey: review.scopeKey});
              else {addDspFromEmployee(emp); removeSearchSlot(slotId);}
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
        Add {labels.one}
      </Button>
      <ConfirmDialog open={!!pendingStaff && pendingStaff.scopeKey === review.scopeKey && medication?.value.underMedication === true} onOpenChange={open => {if (!open) setPendingStaff(null);}}>
        <ConfirmDialogContent className="max-w-md"
          title="Medication Training Required"
          description={`This client requires medication-related support. Does ${pendingStaff?.employee.fullName || 'this staff member'} have the required medication training?`}
          confirmText="Yes"
          confirmVariant="default"
          cancelText="No"
          onConfirm={() => confirmMedicationTraining(true)}
          onCancel={() => confirmMedicationTraining(false)}
        >
          <p className="text-sm text-muted-foreground">Both answers add this staff member. Yes keeps the medication training requirement on and opens verification: choose their accepted medication training certificate so their shifts with this client can be scheduled. No turns the requirement off for this client.</p>
        </ConfirmDialogContent>
      </ConfirmDialog>
      {verifyStaff && verifyStaff.scopeKey === review.scopeKey && <MedicationVerificationStep employee={verifyStaff.employee} clientId={review.clientId} agencyId={review.agencyId} program={review.program} onClose={() => setVerifyStaff(null)} />}
      {selectedStaff && <div className="mt-4">{rejectedStaff?.id === selectedStaff.id && <p className="text-sm text-muted-foreground">Staff selection cleared. You can search for another staff member.</p>}<RosterAssignmentReview key={selectedStaff.id} row={reviewRow} employeeId={selectedStaff.id} employeeName={selectedStaff.name} onBlocked={clearBlockedStaff} selectionCleared={rejectedStaff?.id === selectedStaff.id} /></div>}
    </div>
  );
}

function MedicationVerificationStep({employee, clientId, agencyId, program, onClose}: {employee: Employee; clientId?: string | null; agencyId?: string | null; program?: string | null; onClose: () => void}) {
  const name = employee.fullName || "this staff member";
  const scope = clientId && agencyId && (program === "ddd" || program === "hha") ? {clientId, agencyId, program: program as "ddd" | "hha"} : null;
  return (
    <section aria-label={`Verify medication training for ${name}`} className="mt-4 rounded-[16px] border border-[#dce6e8] bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-[#10141a]">Verify {name}'s medication training</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
      {scope ? <>
        <p className="mt-1 text-muted-foreground">Choose their accepted medication training certificate. Until it's verified, {name} can't be scheduled for this client's shifts. Verification uses the client's saved medication setting, so save the client first if you just turned it on.</p>
        <Suspense fallback={<p role="status" className="mt-2">Loading verification…</p>}>
          <ClientCompetencyPanel {...scope} employeeId={employee.id} employeeName={employee.fullName} only="medication_support" startVerifying />
        </Suspense>
      </> : <p className="mt-1 text-muted-foreground">Save the client first. Then use "Verify medication training" on the shift's assignment check to choose {name}'s accepted medication training certificate.</p>}
    </section>
  );
}

function ServiceAssignedDspsView({ assignedDsps, program }: { assignedDsps: AssignedDsp[]; program?: string | null }) {
  const agencyMode = useEffectiveAgencyMode();
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[12px] font-normal text-[#10141a]">Assigned {staffLabels(program || agencyMode).many}</p>
      <p className="text-[14px] font-semibold text-[#10141a]">
        {assignedDsps.map((d) => d.name).join(", ")}
      </p>
    </div>
  );
}

export function ServiceAssignedDspsSection({
  isEditing,
  reviewRow,
  assignedDsps = [],
  onChange,
  program,
}: ServiceAssignedDspsSectionProps) {
  if (!isEditing) {
    if (!assignedDsps.length) return null;
    return (
      <div className="mt-3 border-t border-[#e5e5e6] pt-3">
        <ServiceAssignedDspsView assignedDsps={assignedDsps} program={program} />
      </div>
    );
  }

  return (
    <div className="col-span-full mt-6 space-y-6 border-t border-[#cccccd]/60 pt-6">
      <ServiceAssignedDspsEditor
        reviewRow={reviewRow}
        assignedDsps={assignedDsps}
        onChange={onChange ?? (() => {})}
        program={program}
      />
    </div>
  );
}
