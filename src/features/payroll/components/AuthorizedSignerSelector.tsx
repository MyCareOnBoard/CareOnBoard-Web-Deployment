import { useEffect, useMemo, useRef, useState } from "react";
import { useGetAgencyPayrollSignerCandidatesQuery, useLazyGetAgencyPayrollSignerCandidatesQuery } from "../api/agencyPayrollEndpoints";
import { newIdempotencyKey, type IdempotencyKey } from "../api/payrollCommands";
import type { PayrollScope, PayrollSignerCandidate } from "../model/types";

export type SignerDesignation = { candidate: PayrollSignerCandidate; authorityAttested: true; idempotencyKey: IdempotencyKey };

type Props = {
  scope: PayrollScope;
  disabled?: boolean;
  initialSelection?: SignerDesignation | null;
  /** Changes after a conflict so a fresh signer decision and attestation are required. */
  resetKey?: number;
  onSelectionChange: (selection: SignerDesignation | null) => void;
};

const sameScope = (args: (PayrollScope & { q?: string }) | undefined, scope: PayrollScope, q: string) => Boolean(args && args.actorUid === scope.actorUid && args.agencyId === scope.agencyId && args.audience === scope.audience && args.q === q);

export function AuthorizedSignerSelector({ scope, disabled = false, initialSelection = null, resetKey = 0, onSelectionChange }: Props) {
  const ownerQuery = useGetAgencyPayrollSignerCandidatesQuery(scope);
  const [search, setSearch] = useState("");
  const [triggerSearch, searchQuery] = useLazyGetAgencyPayrollSignerCandidatesQuery();
  const [selected, setSelected] = useState<PayrollSignerCandidate | null>(initialSelection?.candidate ?? null);
  const [attested, setAttested] = useState(initialSelection?.authorityAttested === true);
  const [idempotencyKey, setIdempotencyKey] = useState<IdempotencyKey | "">(initialSelection?.idempotencyKey ?? "");
  const scopeKey = useMemo(() => `${scope.audience}:${scope.actorUid}:${scope.agencyId}`, [scope.audience, scope.actorUid, scope.agencyId]);
  const initializedFor = useRef({ scopeKey, resetKey });
  const query = search.trim();
  const canSearch = query.length >= 2;
  const currentSearchResponse = canSearch && sameScope(searchQuery.originalArgs, scope, query);
  const candidates = currentSearchResponse ? (searchQuery.currentData?.staffCandidates ?? []) : [];

  useEffect(() => {
    if (initializedFor.current.scopeKey === scopeKey && initializedFor.current.resetKey === resetKey) return;
    initializedFor.current = { scopeKey, resetKey };
    setSearch("");
    setSelected(null);
    setAttested(false);
    setIdempotencyKey("");
  }, [scopeKey, resetKey]);
  useEffect(() => { if (resetKey > 0) void ownerQuery.refetch?.(); }, [resetKey]);
  useEffect(() => {
    onSelectionChange(selected && attested && idempotencyKey ? { candidate: selected, authorityAttested: true, idempotencyKey } : null);
  }, [selected, attested, idempotencyKey, onSelectionChange]);
  useEffect(() => {
    if (!canSearch) return;
    let request: ReturnType<typeof triggerSearch> | undefined;
    const timer = window.setTimeout(() => { request = triggerSearch({ ...scope, q: query }, true); }, 300);
    return () => { window.clearTimeout(timer); request?.abort(); };
  }, [scopeKey, canSearch, query, triggerSearch]);

  if (ownerQuery.isLoading) return <p role="status" className="mt-3 text-sm text-[#5d626b]">Loading signer options…</p>;
  if (ownerQuery.isError || !ownerQuery.data?.ownerCandidate) return <p role="status" className="mt-3 text-sm text-[#5d626b]">Only the active agency owner can choose an authorized payroll signer.</p>;
  const owner = ownerQuery.data.ownerCandidate;
  const choose = (candidate: PayrollSignerCandidate) => { setSelected(candidate); setAttested(false); setIdempotencyKey(newIdempotencyKey()); };
  const selectedIsOwner = selected?.userUid === owner.userUid;
  const selectedInResults = candidates.some((candidate) => candidate.userUid === selected?.userUid);
  return <fieldset className="mt-5 rounded-md border border-[#dce8e8] bg-[#f7fbfb] p-4" disabled={disabled}>
    <legend className="px-1 text-sm font-semibold text-[#10141a]">Authorized signer</legend>
    <p className="text-sm text-[#5d626b]">Choose the verified owner account or an eligible active staff account. Phone and access details are never shown here.</p>
    <div className="mt-3 space-y-2" role="radiogroup" aria-label="Authorized signer">
      <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name={`authorized-signer-${scopeKey}`} checked={selectedIsOwner} onChange={() => choose(owner)} /><span><span className="font-semibold">{owner.fullName}</span><br />{owner.email}<br />{owner.title}</span></label>
      {selected && !selectedIsOwner && !selectedInResults && <label className="flex items-start gap-2 rounded border border-[#a7c9ca] bg-white p-2 text-sm"><input type="radio" name={`authorized-signer-${scopeKey}`} checked readOnly /><span><span className="font-semibold">{selected.fullName}</span><br />{selected.email}<br />{selected.title}<br /><span className="text-xs text-[#5d626b]">Selected signer</span></span></label>}
      {candidates.filter((candidate) => candidate.userUid !== owner.userUid).map((candidate) => <label key={candidate.userUid} className="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name={`authorized-signer-${scopeKey}`} checked={selected?.userUid === candidate.userUid} onChange={() => choose(candidate)} /><span><span className="font-semibold">{candidate.fullName}</span><br />{candidate.email}<br />{candidate.title}</span></label>)}
    </div>
    <label className="mt-4 block text-sm"><span className="block font-medium">Search eligible staff</span><input value={search} type="search" minLength={2} maxLength={64} className="mt-1 min-h-11 w-full rounded-md border border-input px-3" onChange={(event) => setSearch(event.target.value)} aria-describedby="signer-search-help" /></label>
    <p id="signer-search-help" className="mt-1 text-xs text-[#5d626b]">Enter at least two characters to search active staff.</p>
    {canSearch && (!currentSearchResponse || searchQuery.isFetching) && <p role="status" className="mt-2 text-sm text-[#5d626b]">Searching eligible staff…</p>}
    {canSearch && currentSearchResponse && searchQuery.isError && <button type="button" className="mt-2 text-sm font-semibold text-[#006f73] underline" onClick={() => void triggerSearch({ ...scope, q: query }, true)}>Try search again</button>}
    {canSearch && currentSearchResponse && !searchQuery.isFetching && !searchQuery.isError && candidates.length === 0 && <p role="status" className="mt-2 text-sm text-[#5d626b]">No eligible staff signer was found.</p>}
    <label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={attested} disabled={!selected} onChange={(event) => setAttested(event.target.checked)} />I confirm this selected account is authorized to act as the agency's payroll signer.</label>
  </fieldset>;
}
