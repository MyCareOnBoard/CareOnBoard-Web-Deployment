import {CareerPlanDate} from './CareerPlanDate';
export {CareerPlanDate} from './CareerPlanDate';
import {canReviewCareer} from '@/lib/api/career-reconciliation';
import { useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/utils/auth';
import { useEffectiveAgencyMode } from '@/hooks/useEffectiveAgencyMode';
import { searchClients, type Client } from '@/lib/api/clients';
import { Routes } from '@/routes/constants';
import {
  careerError,
  careerUncertain,
  type CareerPlanDraft,
  type CareerPlanDetail,
  type CareerRevision,
  type CareerSource,
} from '@/lib/api/career-planning';
import {
  useGetCareerPlansQuery,
  useGetCareerPlanQuery,
  useLazyGetCareerPlanQuery,
  useSaveCareerPlanMutation,
  usePublishCareerPlanMutation,
  useGetCareerRevisionsQuery,
  useGetCareerRevisionQuery,
} from './api';

export function CareerPlanReadOnly({ revision }: { revision: CareerRevision }) {
  const c = revision.content;
  return (
    <section className="space-y-4 rounded-2xl border p-5" aria-label="Published plan">
      <h2 className="text-xl font-semibold">Revision {revision.revisionNumber}</h2>
      <p>
        Plan period: {c.periodStart} – {c.periodEnd}
      </p>
      <p>Published: {revision.publishedAt}</p>
      {revision.changeReason && <p>Change reason: {revision.changeReason}</p>}
      {[
        ['Interests and preferences', c.interests],
        ['Strengths and support needs', c.strengthsAndSupportNeeds],
        ['Individual involvement', c.individualInvolvement],
      ].map(([label, value]) => (
        <div key={label}>
          <h3 className="font-semibold">{label}</h3>
          <p className="whitespace-pre-wrap break-words">{value}</p>
        </div>
      ))}
      {c.goals.map((g) => (
        <div key={g.id} className="space-y-1 rounded-xl border p-4">
          <h3 className="font-semibold">{g.statement}</h3>
          <p>Steps: {g.steps}</p>
          <p>Staff support: {g.staffSupport}</p>
          <p>Progress: {g.progressDescription}</p>
        </div>
      ))}
      <p>Contributors: {c.contributors.map((p) => `${p.name} (${p.role})`).join(', ')}</p>
      {revision.sources?.length ? (
        revision.sources.map((source) => (
          <p key={source.reference}>
            {source.label}
            {source.available === false ? ' · Source document changed or unavailable' : ''}
          </p>
        ))
      ) : (
        <p>Source document not linked</p>
      )}
    </section>
  );
}

type EditorProps = {
  draft: CareerPlanDraft;
  version: number;
  hasPublished: boolean;
  onSave: (draft: CareerPlanDraft, expectedVersion: number) => Promise<unknown>;
  onPublish: (expectedVersion: number, operationId: string, changeReason: string) => Promise<unknown>;
  sourceChoices?: CareerSource[];
  outcomeChoices?: Array<{ id: string; label: string }>;
  onDirtyChange?: (dirty: boolean) => void;
  onConflict?: () => void;
  hasSavedDraft?: boolean;
};
export function CareerPlanEditor({
  draft,
  version,
  hasPublished,
  onSave,
  onPublish,
  sourceChoices = [],
  outcomeChoices = [],
  onDirtyChange,
  onConflict,
  hasSavedDraft = true,
}: EditorProps) {
  const [local, setLocal] = useState(draft);
  const [saved, setSaved] = useState(JSON.stringify(draft));
  const [savedVersion, setSavedVersion] = useState(version);
  const [savedAvailable, setSavedAvailable] = useState(hasSavedDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [conflict, setConflict] = useState(false);
  const pending = useRef<
    | { kind: 'save'; draft: CareerPlanDraft; version: number }
    | { kind: 'publish'; version: number; id: string; reason: string }
    | null
  >(null);
  const [uncertain, setUncertain] = useState(false);
  const running = useRef(false);
  const dirty = JSON.stringify(local) !== saved;
  useEffect(() => {
    onDirtyChange?.(dirty || uncertain || busy);
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || uncertain || busy) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, uncertain, busy, onDirtyChange]);
  function change(patch: Partial<CareerPlanDraft>) {
    setLocal((current) => ({ ...current, ...patch }));
    setMessage('');
  }
  async function perform(kind: 'save' | 'publish') {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setMessage('');
    const request =
      pending.current ??
      (kind === 'save'
        ? { kind, draft: structuredClone(local), version: savedVersion }
        : { kind, version: savedVersion, id: crypto.randomUUID(), reason });
    pending.current = request;
    try {
      if (request.kind === 'save') {
        const result = await onSave(request.draft, request.version);
        setSaved(JSON.stringify(request.draft));
        setSavedVersion((result as { version?: number })?.version ?? request.version + 1);
        setSavedAvailable(true);
        setMessage('Draft saved');
      } else {
        await onPublish(request.version, request.id, request.reason);
        setMessage('Plan published');
      }
      pending.current = null;
      setUncertain(false);
    } catch (error) {
      const detail = careerError(error);
      if (careerUncertain(error)) {
        setUncertain(true);
        setMessage(
          request.kind === 'publish'
            ? 'We could not confirm publication. Check publication before making changes.'
            : 'We could not confirm the save. Check draft save before making changes.',
        );
      } else {
        pending.current = null;
        setUncertain(false);
        setConflict(detail.status === 409);
        setMessage(
          detail.status === 409
            ? 'This plan changed while you were editing. Your unsaved text is still here.'
            : detail.message,
        );
        if (detail.status === 409) onConflict?.();
        const path = detail.fieldErrors?.[0]?.path;
        if (path) document.getElementById(`career-${path.replace(/^draft\./, '')}`)?.focus();
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  const narrative = (
    key: 'interests' | 'strengthsAndSupportNeeds' | 'individualInvolvement',
    label: string,
  ) => (
    <label className="block space-y-1">
      {label}
      <Textarea
        id={`career-${key}`}
        value={local[key] ?? ''}
        maxLength={10000}
        onChange={(e) => change({ [key]: e.target.value })}
      />
    </label>
  );
  return (
    <section aria-label="Plan draft" className="space-y-4 rounded-2xl border bg-card/50 p-5">
      <h2 className="text-xl font-semibold">{hasPublished ? 'Published · Draft changes' : 'Draft plan'}</h2>
      {hasPublished && <p>Staff still see the published version.</p>}
      <fieldset disabled={busy || uncertain} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <CareerPlanDate
            label="Plan period start"
            value={local.periodStart}
            onChange={(periodStart) => change({ periodStart })}
          />
          <CareerPlanDate
            label="Plan period end"
            value={local.periodEnd}
            onChange={(periodEnd) => change({ periodEnd })}
          />
        </div>
        {narrative('interests', 'Interests and preferences')}
        {narrative('strengthsAndSupportNeeds', 'Strengths and support needs')}
        {(local.goals ?? []).map((goal, index) => (
          <fieldset key={goal.id} className="space-y-3 rounded-xl border p-4">
            <legend>Goal {index + 1}</legend>
            {(
              [
                ['statement', 'Goal'],
                ['steps', 'Practical steps'],
                ['staffSupport', 'Staff support'],
                ['progressDescription', 'How progress will be described'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                {label}
                <Textarea
                  id={`career-goals.${index}.${key}`}
                  value={goal[key] ?? ''}
                  maxLength={10000}
                  onChange={(e) =>
                    change({
                      goals: local.goals?.map((g) =>
                        g.id === goal.id ? { ...g, [key]: e.target.value } : g,
                      ),
                    })
                  }
                />
              </label>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => change({ goals: local.goals?.filter((g) => g.id !== goal.id) })}
            >
              Remove goal {index + 1}
            </Button>
          </fieldset>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={(local.goals?.length ?? 0) >= 20}
          onClick={() =>
            change({
              goals: [
                ...(local.goals ?? []),
                {
                  id: crypto.randomUUID(),
                  statement: '',
                  steps: '',
                  staffSupport: '',
                  progressDescription: '',
                },
              ],
            })
          }
        >
          Add goal
        </Button>
        <h3 className="font-semibold">Contributors</h3>
        {(local.contributors ?? []).map((person, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-3">
            {(['name', 'role'] as const).map((key) => (
              <label key={key}>
                Contributor {index + 1} {key}
                <Input
                  value={person[key] ?? ''}
                  maxLength={10000}
                  onChange={(e) =>
                    change({
                      contributors: local.contributors?.map((p, i) =>
                        i === index ? { ...p, [key]: e.target.value } : p,
                      ),
                    })
                  }
                />
              </label>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => change({ contributors: local.contributors?.filter((_, i) => i !== index) })}
            >
              Remove contributor {index + 1}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={(local.contributors?.length ?? 0) >= 20}
          onClick={() => change({ contributors: [...(local.contributors ?? []), { name: '', role: '' }] })}
        >
          Add contributor
        </Button>
        {narrative('individualInvolvement', 'Individual involvement')}
        <p className="text-sm text-muted-foreground">
          Describe how the individual participated, or how their preferences were obtained.
        </p>
        {(['isp', 'pcpt'] as const).map((kind) => (
          <label key={kind} className="block">
            {kind.toUpperCase()} source
            <select
              className="ml-2 rounded-lg border bg-background p-2"
              value={local.sourceReferences?.find((s) => s.kind === kind)?.reference ?? ''}
              onChange={(e) =>
                change({
                  sourceReferences: [
                    ...(local.sourceReferences ?? []).filter((s) => s.kind !== kind),
                    ...(e.target.value ? [{ kind, reference: e.target.value }] : []),
                  ],
                })
              }
            >
              <option value="">Source document not linked</option>
              {sourceChoices
                .filter((s) => s.kind === kind)
                .map((s) => (
                  <option key={s.reference} value={s.reference}>
                    {s.label}
                  </option>
                ))}
            </select>
            {local.sourceReferences?.some(
              (s) => s.kind === kind && !sourceChoices.some((c) => c.reference === s.reference),
            ) && <p role="alert">Source document changed or unavailable</p>}
          </label>
        ))}
        <label className="block">
          Outcome
          <select
            className="ml-2 rounded-lg border bg-background p-2"
            value={local.outcomeId ?? ''}
            onChange={(e) => change({ outcomeId: e.target.value || null })}
          >
            <option value="">No linked outcome</option>
            {outcomeChoices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {hasPublished && (
          <label className="block">
            Change reason
            <Input value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
          </label>
        )}
      </fieldset>
      {message && <p role={conflict ? 'alert' : 'status'}>{message}</p>}
      {conflict && (
        <Button variant="outline" onClick={onConflict}>
          View latest version
        </Button>
      )}
      {dirty && <p>Save your changes before publishing.</p>}
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={busy || conflict || (uncertain && pending.current?.kind !== 'save')}
          onClick={() => void perform('save')}
        >
          {uncertain && pending.current?.kind === 'save' ? 'Check draft save' : 'Save draft'}
        </Button>
        <Button
          disabled={
            busy ||
            conflict ||
            dirty ||
            !savedAvailable ||
            savedVersion === 0 ||
            (hasPublished && !reason.trim()) ||
            (uncertain && pending.current?.kind !== 'publish')
          }
          onClick={() => void perform('publish')}
        >
          {uncertain && pending.current?.kind === 'publish' ? 'Check publication' : 'Publish plan'}
        </Button>
      </div>
    </section>
  );
}

function RevisionHistory({ planId }: { planId: string }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<string>();
  const [revisionId, setRevisionId] = useState('');
  const list = useGetCareerRevisionsQuery({ planId, cursor }, { skip: !open });
  const detail = useGetCareerRevisionQuery({ planId, revisionId }, { skip: !revisionId });
  return (
    <section className="space-y-3">
      <Button variant="outline" onClick={() => setOpen(!open)}>
        Revision history
      </Button>
      {open && (
        <>
          {list.isError ? (
            <p role="alert">Unable to load revision history.</p>
          ) : (
            list.data?.items.map((r) => (
              <div key={r.id}>
                <Button variant="ghost" onClick={() => setRevisionId(r.id)}>
                  Revision {r.revisionNumber} · {r.periodStart} – {r.periodEnd} · Published {r.publishedAt}
                </Button>
              </div>
            ))
          )}
          {cursor && (
            <Button variant="outline" onClick={() => setCursor(undefined)}>
              First page
            </Button>
          )}
          {list.data?.nextCursor && (
            <Button variant="outline" onClick={() => setCursor(list.data!.nextCursor!)}>
              Next page
            </Button>
          )}
          {detail.isError && <p role="alert">This revision is unavailable. Try again.</p>}
          {detail.currentData && <CareerPlanReadOnly revision={detail.currentData} />}
        </>
      )}
    </section>
  );
}
export default function CareerPlanningPage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const effectiveMode = useEffectiveAgencyMode();
  const isSuperAdmin = user?.userType === 'super_admin';
  const mode = isSuperAdmin ? 'ddd' : effectiveMode;
  const agencyId = isSuperAdmin ? (params.get('agencyId') ?? undefined) : user?.agencyId;
  const [clientId, setClientId] = useState(params.get('clientId') ?? '');
  const [authorizationId, setAuthorizationId] = useState(params.get('serviceAuthorizationId') ?? '');
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [searchError, setSearchError] = useState('');
  const [cursor, setCursor] = useState<string>();
  const [editing, setEditing] = useState(false);
  const dirty = useRef(false);
  const [generation, setGeneration] = useState(0);
  const [pageNotice, setPageNotice] = useState('');
  const scope = useRef('');
  scope.current = `${agencyId}:${clientId}:${authorizationId}`;
  const blocker = useBlocker(() => dirty.current);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('Leave this plan? Unsaved changes will be lost.')) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (search.trim().length < 2) {
        setClients([]);
        return;
      }
      void searchClients(search, agencyId, 'ddd').then(
        (result) => {
          if (active) {
            setClients(result);
            setSearchError('');
          }
        },
        () => {
          if (active) setSearchError('Unable to search clients. Please try again.');
        },
      );
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, agencyId]);
  const list = useGetCareerPlansQuery(
    {
      agencyId,
      clientId: clientId || undefined,
      serviceAuthorizationId: authorizationId || undefined,
      cursor,
    },
    { skip: mode !== 'ddd' },
  );
  const selected = list.currentData?.items.find(
    (p) => p.serviceAuthorizationId === authorizationId && p.clientId === clientId,
  );
  const [savedPlan, setSavedPlan] = useState<CareerPlanDetail>();
  const planId = selected?.id ?? savedPlan?.id ?? '';
  const detail = useGetCareerPlanQuery(planId, { skip: !planId });
  const plan = detail.currentData ?? savedPlan;
  const [save] = useSaveCareerPlanMutation();
  const [publish] = usePublishCareerPlanMutation();
  const [loadLatest, { data: latest }] = useLazyGetCareerPlanQuery();
  const mayManage =
    user?.userType === 'agency' ||
    (user?.userType === 'agency_staff' &&
      ['Goals & Documents', 'Client Management'].every((p) => user.profile?.accessList?.includes(p)));
  const canManage = mayManage && plan?.canManage !== false;
  function choose(client: string, authorization = '') {
    if (dirty.current && !window.confirm('Leave this plan? Unsaved changes will be lost.')) return;
    dirty.current = false;
    setClientId(client);
    setAuthorizationId(authorization);
    setSavedPlan(undefined);
    setEditing(false);
    setCursor(undefined);
  }
  if (mode !== 'ddd') return <p>Career Planning is available for DDD clients.</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Career Planning</h1>
      {clientId && canReviewCareer(user) && <Button variant="outline" asChild><Link to={(user?.userType==='super_admin'?Routes.superAdmin.careerReconciliation:Routes.agency.careerReconciliation)+'?'+new URLSearchParams({clientId,...(agencyId?{agencyId}:{})})}>Usage &amp; reconciliation</Link></Button>}
      {pageNotice && <p role="status">{pageNotice}</p>}
      <label className="block">
        Find client
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client name..."
        />
      </label>
      {searchError && <p role="alert">{searchError}</p>}
      {clients.map((client) => (
        <Button key={client.id} variant="outline" onClick={() => choose(client.id)}>
          {client.firstName} {client.lastName}
        </Button>
      ))}
      {list.isError && (
        <p role="alert">Unable to load Career Planning records. Check client access and try again.</p>
      )}
      {list.isFetching && <p role="status">Loading plans…</p>}
      {clientId && (
        <>
          {selected?.clientName && <p className="font-semibold">Client: {selected.clientName}</p>}
          <label className="block">
            Service authorization
            <select
              className="ml-2 rounded-lg border bg-background p-2"
              value={authorizationId}
              onChange={(e) => choose(clientId, e.target.value)}
            >
              <option value="">Select authorization</option>
              {list.currentData?.authorizationChoices?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} · {a.startDate ?? 'Start not recorded'} – {a.endDate ?? 'End not recorded'}
                </option>
              ))}
            </select>
          </label>
          <Link
            className="text-primary underline"
            to={`${(isSuperAdmin ? Routes.superAdmin.clientDetails : Routes.agency.clientDetails).replace(':clientId', encodeURIComponent(clientId))}?tab=documents`}
          >
            Open client documents
          </Link>
        </>
      )}
      {!authorizationId &&
        list.currentData?.items.map((p) => (
          <Button key={p.id} variant="outline" onClick={() => choose(p.clientId, p.serviceAuthorizationId)}>
            {p.clientName ?? 'Career Planning'} · {p.publishedSummary?.periodStart ?? 'Draft'} ·{' '}
            {p.hasDraft && p.publishedRevisionId
              ? 'Published · Draft changes'
              : p.publishedRevisionId
                ? 'Published'
                : 'Draft'}
          </Button>
        ))}
      {list.currentData?.nextCursor && (
        <Button variant="outline" onClick={() => setCursor(list.currentData!.nextCursor!)}>
          Next plans
        </Button>
      )}
      {cursor && (
        <Button variant="outline" onClick={() => setCursor(undefined)}>
          First plans
        </Button>
      )}
      {authorizationId &&
        !list.isLoading &&
        (!list.isError || Boolean(plan) || editing) &&
        (!detail.isLoading || Boolean(savedPlan)) && (
          <>
            {detail.isError && !plan ? (
              <p role="alert">Unable to load this plan. Your access may have changed.</p>
            ) : (
              <>
                {!plan && <p>No Career Planning plan yet.</p>}
                {plan?.publishedRevision && (
                  <CareerPlanReadOnly
                    revision={{
                      ...plan.publishedRevision,
                      sources: plan.publishedRevision.sources?.map((source) => ({
                        ...source,
                        available:
                          list.currentData?.sourceChoices?.some(
                            (current) => current.reference === source.reference,
                          ) ?? true,
                      })),
                    }}
                  />
                )}{' '}
                {canManage && (plan?.hasDraft || editing) ? (
                  <CareerPlanEditor
                    key={`${clientId}:${authorizationId}:${generation}`}
                    draft={plan?.draft ?? plan?.publishedRevision?.content ?? {}}
                    version={plan?.version ?? 0}
                    hasPublished={Boolean(plan?.publishedRevisionId)}
                    hasSavedDraft={plan?.hasDraft ?? false}
                    sourceChoices={list.currentData?.sourceChoices}
                    outcomeChoices={list.currentData?.outcomeChoices}
                    onDirtyChange={(value) => {
                      dirty.current = value;
                    }}
                    onConflict={() => {
                      if (planId) void loadLatest(planId);
                    }}
                    onSave={async (draft, expectedVersion) => {
                      const captured = scope.current;
                      const result = await save({
                        agencyId,
                        clientId,
                        serviceAuthorizationId: authorizationId,
                        draft,
                        expectedVersion,
                      }).unwrap();
                      if (scope.current === captured) setSavedPlan(result);
                      return result;
                    }}
                    onPublish={async (expectedVersion, operationId, changeReason) => {
                      const captured = scope.current;
                      const result = await publish({
                        planId,
                        expectedVersion,
                        operationId,
                        changeReason,
                      }).unwrap();
                      if (scope.current === captured) {
                        dirty.current = false;
                        setEditing(false);
                        setSavedPlan(undefined);
                        setPageNotice('Plan published');
                        void list.refetch();
                      }
                      return result;
                    }}
                  />
                ) : (
                  canManage && (
                    <Button onClick={() => setEditing(true)}>{plan ? 'Edit plan' : 'Create plan'}</Button>
                  )
                )}
                {latest && latest.id === planId && (
                  <section aria-label="Latest server version" className="space-y-3">
                    <h2>Latest server version (read only)</h2>
                    {latest.publishedRevision && <CareerPlanReadOnly revision={latest.publishedRevision} />}
                    {latest.draft && (
                      <div className="space-y-2">
                        <p>Interests and preferences: {latest.draft.interests}</p>
                        <p>Strengths and support needs: {latest.draft.strengthsAndSupportNeeds}</p>
                        <p>Individual involvement: {latest.draft.individualInvolvement}</p>
                        {latest.draft.goals?.map((goal) => (
                          <div key={goal.id}>
                            <p>Goal: {goal.statement}</p>
                            <p>Steps: {goal.steps}</p>
                            <p>Staff support: {goal.staffSupport}</p>
                            <p>Progress: {goal.progressDescription}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (window.confirm('Reopen the latest version? Copy your local changes first.')) {
                          dirty.current = false;
                          setGeneration((value) => value + 1);
                        }
                      }}
                    >
                      Reopen latest version
                    </Button>
                    <p>Copy your local changes before reopening the latest version.</p>
                  </section>
                )}
                {planId && <RevisionHistory key={planId} planId={planId} />}
              </>
            )}
          </>
        )}
    </div>
  );
}
