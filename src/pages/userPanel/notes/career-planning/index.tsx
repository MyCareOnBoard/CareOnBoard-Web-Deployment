import { useEffect, useRef, useState } from 'react';
import { useBlocker, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { useNoteOperation } from '@/lib/notes/useNoteOperation';
import { careerError, careerUncertain, type CareerRow, type CareerPreview } from '@/lib/api/career-planning';
import { CareerPlanningNote, CareerSignatureHistory } from '@/pages/shared/notes/CareerPlanningNote';
import { NoteFieldErrors, focusNoteError } from '@/pages/shared/notes/NoteFieldErrors';
import type { GetActivityLogResponse, NoteFieldError } from '../apiTypes';
import {
  useGetSingleActivityLogQuery,
  useGetCareerContextQuery,
  useSelectCareerRevisionMutation,
  useSaveCareerRowMutation,
  usePreviewCareerNotesMutation,
  useSubmitActivityLogNotesMutation,
} from '../api';

function rowsFromLog(data: GetActivityLogResponse): CareerRow[] {
  return [
    ...data.notes,
    ...(data.submittedNotes ?? []).map((r) => ({ ...r, status: 'submitted' as const })),
    ...(data.approvedNotes ?? []).map((r) => ({ ...r, status: 'approved' as const })),
  ].map((r) => ({
    ...r,
    startDate: r.startDate ?? '',
    endDate: r.endDate ?? '',
    metadata: r.metadata ?? {},
    contentVersion: r.contentVersion ?? 0,
  })) as CareerRow[];
}

export default function CareerPlanningPage() {
  const id = new URLSearchParams(useLocation().search).get('id');
  return id ? (
    <CareerPlanningForm key={id} activityLogId={id} />
  ) : (
    <p>Open Career Planning from your assigned shift.</p>
  );
}
export function CareerPlanningForm({ activityLogId }: { activityLogId: string }) {
  const log = useGetSingleActivityLogQuery(activityLogId);
  const context = useGetCareerContextQuery({ activityLogId });
  const [choicesOpen, setChoicesOpen] = useState(false);
  const [cursor, setCursor] = useState<string>();
  const choices = useGetCareerContextQuery(
    { activityLogId, revisionChoices: true, cursor },
    { skip: !choicesOpen },
  );
  const [save] = useSaveCareerRowMutation();
  const [getPreview] = usePreviewCareerNotesMutation();
  const [submit] = useSubmitActivityLogNotesMutation();
  const [selectRevision] = useSelectCareerRevisionMutation();
  const operation = useNoteOperation();
  const [rows, setRows] = useState<CareerRow[]>([]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const persisted = useRef(new Map<string, string>());
  const loaded = useRef(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<CareerPreview | null>(null);
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const [saveUncertain, setSaveUncertain] = useState(false);
  const [statusRefreshFailed, setStatusRefreshFailed] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<NoteFieldError[]>([]);
  const pendingSave = useRef<{
    id: string;
    expectedContentVersion: number;
    startDate: string;
    endDate: string;
    metadata: CareerRow['metadata'];
  } | null>(null);
  const dirty = rows.some(
    (row) =>
      row.status !== 'submitted' &&
      row.status !== 'approved' &&
      persisted.current.get(row.id) !== JSON.stringify(row),
  );
  const frozen = busy || operation.pending || uncertain || saveUncertain || statusRefreshFailed;
  const blocker = useBlocker(() => dirty || frozen);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (
        window.confirm(
          uncertain
            ? 'Submission status is unknown. Leave this note and check it when you return?'
            : 'Leave this note? Unsaved changes will be lost.',
        )
      )
        blocker.proceed();
      else blocker.reset();
    }
  }, [blocker, uncertain]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || frozen) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, frozen]);
  useEffect(() => {
    if (!loaded.current && log.currentData) {
      loaded.current = true;
      const current = rowsFromLog(log.currentData);
      persisted.current = new Map(current.map((r) => [r.id, JSON.stringify(r)]));
      setRows(current);
      setSelected(
        current.filter((r) => r.status !== 'submitted' && r.status !== 'approved').map((r) => r.id),
      );
    }
  }, [log.currentData]);
  function edit(next: CareerRow[]) {
    if (frozen) return;
    setRows(next);
    setPreview(null);
    setAttested(false);
    setMessage('');
  }
  function showError(error: unknown) {
    const detail = careerError(error);
    if (detail.status === 409) setConflict(true);
    setMessage(
      detail.status === 413
        ? detail.fieldErrors?.some((e) => e.path?.startsWith('rows.'))
          ? 'This entry is too long to save. Shorten it or split the support into separate entries. Your text is still here.'
          : 'These entries are too large to submit together. Select fewer entries and try again.'
        : detail.status === 409
          ? 'The note changed before it could be signed. Review the updated entries and sign again.'
          : detail.message,
    );
    const errors = (detail.fieldErrors ?? []).map((e) => {
      const path = /^rows\.([^.]+)(?:\.(.+))?$/.exec(e.path ?? '');
      return {
        noteId: e.noteId ?? path?.[1] ?? '',
        field: e.field ?? path?.[2] ?? e.path ?? '',
        code: e.code ?? 'invalid',
      };
    });
    setFieldErrors(errors);
    focusNoteError(errors);
  }
  async function flush() {
    for (const row of rowsRef.current) {
      if (
        row.status === 'submitted' ||
        row.status === 'approved' ||
        persisted.current.get(row.id) === JSON.stringify(row)
      )
        continue;
      const payload = pendingSave.current ?? {
        id: row.id,
        expectedContentVersion: row.contentVersion,
        startDate: row.startDate,
        endDate: row.endDate,
        metadata: row.metadata,
      };
      pendingSave.current = structuredClone(payload);
      try {
        const saved = await save({ activityLogId, data: payload }).unwrap();
        const updated = {
          ...row,
          ...saved,
          metadata: saved.metadata ?? row.metadata,
          startDate: saved.startDate ?? '',
          endDate: saved.endDate ?? '',
        };
        persisted.current.set(row.id, JSON.stringify(updated));
        rowsRef.current = rowsRef.current.map((r) => (r.id === row.id ? updated : r));
        setRows(rowsRef.current);
        pendingSave.current = null;
        setSaveUncertain(false);
      } catch (error) {
        setSaveUncertain(careerUncertain(error));
        if (!careerUncertain(error)) pendingSave.current = null;
        throw error;
      }
    }
  }
  async function prepare(signing: boolean) {
    if (running.current || uncertain || statusRefreshFailed) return;
    running.current = true;
    setBusy(true);
    setMessage('');
    setFieldErrors([]);
    setPreview(null);
    setAttested(false);
    try {
      await flush();
      if (signing) {
        const result = await getPreview({ activityLogId, logNoteIds: selected }).unwrap();
        setPreview(result);
      } else setMessage('Draft saved');
    } catch (error) {
      showError(error);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function refreshSubmittedStatus() {
    try {
      const latest = await log.refetch();
      if (latest.error || !latest.data) throw latest.error ?? new Error('Current status unavailable');
      const current = rowsFromLog(latest.data);
      const activeIds = new Set(
        current.filter((row) => row.status !== 'submitted' && row.status !== 'approved').map((row) => row.id),
      );
      persisted.current = new Map(current.map((row) => [row.id, JSON.stringify(row)]));
      rowsRef.current = current;
      setRows(current);
      setSelected((ids) => ids.filter((id) => activeIds.has(id)));
      setStatusRefreshFailed(false);
      setMessage('Submission confirmed. Review the current entries below.');
    } catch {
      setStatusRefreshFailed(true);
      setMessage(
        'Submission confirmed, but current status could not be refreshed. Refresh current status before making changes. Your saved text is still here.',
      );
    }
  }
  async function sign() {
    if (!preview || !attested || running.current) return;
    running.current = true;
    setBusy(true);
    setMessage('');
    const ids = preview.content.rows.map((r) => r.id);
    try {
      await operation.run(
        { action: 'submit', resourceId: activityLogId, noteIds: ids, contentKey: preview.previewHash },
        (operationId) =>
          submit({
            activityLog: activityLogId,
            logNoteIds: ids,
            operationId,
            careerSignIntent: {
              previewHash: preview.previewHash,
              rowVersions: preview.rowVersions,
              planSelectionVersion: preview.planSelectionVersion,
              attestationVersion: 1,
              attested: true,
            },
          }).unwrap(),
      );
      setUncertain(false);
      setPreview(null);
      setAttested(false);
      await refreshSubmittedStatus();
      void context.refetch();
    } catch (error) {
      if (careerUncertain(error)) {
        setUncertain(true);
        setMessage(
          'We could not confirm whether your note was submitted. Check its status before making changes.',
        );
      } else {
        setUncertain(false);
        setPreview(null);
        setAttested(false);
        showError(error);
        void context.refetch();
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function choose(revisionId: string) {
    if (!revisionId || frozen) return;
    setBusy(true);
    setPreview(null);
    setAttested(false);
    try {
      await flush();
      await selectRevision({
        activityLogId,
        careerPlanRevisionId: revisionId,
        expectedPlanSelectionVersion: context.currentData?.selection?.planSelectionVersion ?? 0,
      }).unwrap();
      await context.refetch();
      const result = await log.refetch();
      if (result.data) {
        const versions = new Map(result.data.notes.map((r) => [r.id, r]));
        setRows((current) =>
          current.map((row) => {
            const saved = versions.get(row.id);
            if (!saved) return row;
            const next = {
              ...row,
              contentVersion: saved.contentVersion ?? row.contentVersion,
              metadata: { ...row.metadata, goalIds: saved.metadata?.goalIds ?? [] },
            };
            persisted.current.set(row.id, JSON.stringify(next));
            return next;
          }),
        );
      }
      setMessage('Plan selected. Review the goals for every entry before signing.');
      setChoicesOpen(false);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
  if (log.isLoading || context.isLoading) return <p role="status">Loading Career Planning…</p>;
  if ((log.isError || context.isError) && !statusRefreshFailed)
    return <p role="alert">Unable to load this note. Check your current shift access and try again.</p>;
  const plan = context.currentData;
  const revision = plan?.revision;
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">Career Planning</h1>
      <NoteFieldErrors errors={fieldErrors} />
      {(!revision || Boolean(plan?.reasonCode)) && (
        <p>
          {plan?.reasonCode === 'career_plan_selection_required' || plan?.suggestedRevisionId
            ? 'Select a published plan to link these entries to its goals.'
            : plan?.reasonCode === 'career_plan_dates'
              ? 'No published plan covers these service dates. Ask your agency to review the plan.'
              : 'Your agency needs to publish a Career Planning plan for this service. You can save a draft.'}
        </p>
      )}
      {plan?.canChangeRevision && (
        <Button variant="outline" disabled={frozen} onClick={() => setChoicesOpen(!choicesOpen)}>
          Select published plan
        </Button>
      )}
      {choicesOpen && (
        <section aria-label="Published plans" className="space-y-3">
          {choices.isError && <p role="alert">Unable to load published plans.</p>}
          {choices.currentData?.revisionChoices?.items.map((r) => (
            <Button key={r.id} variant="outline" disabled={frozen} onClick={() => void choose(r.id)}>
              Revision {r.revisionNumber} · {r.periodStart} – {r.periodEnd}
            </Button>
          ))}
          {choices.currentData?.revisionChoices?.nextCursor && (
            <Button
              variant="outline"
              onClick={() => setCursor(choices.currentData!.revisionChoices!.nextCursor!)}
            >
              Next revisions
            </Button>
          )}
          {cursor && (
            <Button variant="outline" onClick={() => setCursor(undefined)}>
              First revisions
            </Button>
          )}
        </section>
      )}
      <fieldset disabled={frozen} className="space-y-3">
        {rows
          .filter((r) => r.status !== 'submitted' && r.status !== 'approved')
          .map((row, index) => (
            <label key={row.id} className="mr-4 inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(row.id)}
                onChange={(e) => {
                  setSelected((ids) =>
                    e.target.checked ? [...ids, row.id] : ids.filter((id) => id !== row.id),
                  );
                  setPreview(null);
                  setAttested(false);
                }}
              />
              Select entry {index + 1}
            </label>
          ))}
        <CareerPlanningNote
          rows={rows.filter((row) => row.status !== 'submitted' && row.status !== 'approved')}
          revision={revision}
          timezone={plan?.timezone ?? log.currentData?.timezone ?? undefined}
          readOnly={false}
          showTotal={false}
          onChange={(next) => edit(rows.map((row) => next.find((item) => item.id === row.id) ?? row))}
        />
      </fieldset>
      <p className="font-semibold">
        Recorded units (all entries): {rows.reduce((sum, row) => sum + (row.metadata.recordedUnits ?? 0), 0)}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={frozen || rows.length >= 200}
          onClick={() => {
            const row: CareerRow = {
              id: crypto.randomUUID(),
              contentVersion: 0,
              startDate: '',
              endDate: '',
              metadata: { serviceDate: plan?.serviceDates?.[0] ?? '', goalIds: [] },
              status: 'active',
            };
            edit([...rows, row]);
            setSelected((ids) => [...ids, row.id]);
          }}
        >
          Add entry
        </Button>
        <Button
          disabled={busy || operation.pending || uncertain || conflict || statusRefreshFailed}
          onClick={() => void prepare(false)}
        >
          {saveUncertain ? 'Check draft save' : 'Save draft'}
        </Button>
        <Button
          disabled={frozen || conflict || !selected.length || !revision || Boolean(plan?.reasonCode)}
          onClick={() => void prepare(true)}
        >
          Review entries
        </Button>
      </div>
      {message && <p role="status">{message}</p>}
      {statusRefreshFailed && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            if (running.current) return;
            running.current = true;
            setBusy(true);
            try {
              await refreshSubmittedStatus();
            } finally {
              running.current = false;
              setBusy(false);
            }
          }}
        >
          Refresh current status
        </Button>
      )}
      {conflict && (
        <div>
          <p>Your local text is retained. Copy it before reloading the current entries.</p>
          <Button
            variant="outline"
            onClick={async () => {
              if (!window.confirm('Reload current entries? Copy your unsaved text first.')) return;
              const latest = await log.refetch();
              if (latest.data) {
                const current = rowsFromLog(latest.data);
                persisted.current = new Map(current.map((r) => [r.id, JSON.stringify(r)]));
                setRows(current);
                setSelected(
                  current.filter((r) => r.status !== 'submitted' && r.status !== 'approved').map((r) => r.id),
                );
                setConflict(false);
                setPreview(null);
                setAttested(false);
              }
            }}
          >
            Reload current entries
          </Button>
        </div>
      )}
      {saveUncertain && (
        <p role="alert">We could not confirm this draft save. Check draft save before editing.</p>
      )}
      {preview && (
        <section aria-label="Signing preview" className="space-y-4 rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">Review entries</h2>
          <p>{preview.content.context.clientName}</p>
          <p>{preview.content.context.employeeName}</p>
          <p>{preview.content.context.serviceCode}</p>
          <CareerPlanningNote rows={preview.content.rows} revision={preview.revision} readOnly />
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={attested}
              disabled={uncertain || operation.pending}
              onChange={(e) => setAttested(e.target.checked)}
            />
            {preview.attestation}
          </label>
          <Button disabled={!attested || operation.pending} onClick={() => void sign()}>
            {uncertain ? 'Check submission' : 'Sign and submit'}
          </Button>
        </section>
      )}
      {rows.some((row) => row.status === 'submitted' || row.status === 'approved') && (
        <p>Submitted and approved entries are locked. Open Signature history to view the signed record.</p>
      )}
      <CareerSignatureHistory activityLogId={activityLogId} />
    </div>
  );
}
