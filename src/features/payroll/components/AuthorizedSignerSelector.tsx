import { useEffect, useMemo, useState } from "react";
import { useGetAgencyPayrollSignerCandidatesQuery, useLazyGetAgencyPayrollSignerCandidatesQuery } from "../api/agencyPayrollEndpoints";
import { newIdempotencyKey } from "../api/payrollCommands";
import type { PayrollScope, PayrollSignerCandidate } from "../model/types";

export type SignerDesignation = { candidate: PayrollSignerCandidate; authorityAttested: true; idempotencyKey: string };

type Props = {
  scope: PayrollScope;
  disabled?: boolean;
  initialSelection?: SignerDesignation | null;
  onSelectionChange: (selection: SignerDesignation | null) => void;
};

export function AuthorizedSignerSelector({ scope, disabled = false, initialSelection = null, onSelectionChange }: Props) {
  const ownerQuery = useGetAgencyPayrollSignerCandidatesQuery(scope);
  const [search, setSearch] = useState("");
  const [triggerSearch, searchQuery] = useLazyGetAgencyPayrollSignerCandidatesQuery();
  const [selected, setSelected] = useState<PayrollSignerCandidate | null>(initialSelection?.candidate ?? null);
  const [attested, setAttested] = useState(initialSelection?.authorityAttested === true);
  const [idempotencyKey, setIdempotencyKey] = useState(initialSelection?.idempotencyKey ?? "");
  const scopeKey = useMemo(() => `${scope.actorUid}:${scope.agencyId}`, [scope.actorUid, scope.agencyId]);
  const initialSelectionKey = initialSelection?.idempotencyKey ?? "";

  useEffect(() => {
    setSearch(""); setSelected(initialSelection?.candidate ?? null); setAttested(initialSelection?.authorityAttested === true); setIdempotencyKey(initialSelection?.idempotencyKey ?? "");
  }, [scopeKey, initialSelectionKey]);
  useEffect(() => { onSelectionChange(selected && attested && idempotencyKey ? { candidate: selected, authorityAttested: true, idempotencyKey } : null); }, [selected, attested, idempotencyKey, onSelectionChange]);
  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) return;
    let request: ReturnType<typeof triggerSearch> | undefined;
    const timer = window.setTimeout(() => { request = triggerSearch({ ...scope, q: query }, true); }, 300);
    return () => { window.clearTimeout(timer); request?.abort(); };
  }, [scopeKey, search, triggerSearch]);

  if (ownerQuery.isLoading) return <p role="status" className="mt-3 text-sm text-[#5d626b]">Loading signer options…</p>;
  if (ownerQuery.isError || !ownerQuery.data?.ownerCandidate) return <p role="status" className="mt-3 text-sm text-[#5d626b]">Only the active agency owner can choose an authorized payroll signer.</p>;
  const owner = ownerQuery.data.ownerCandidate;
  const candidates = search.trim().length >= 2 ? (searchQuery.data?.staffCandidates ?? []) : [];
  const choose = (candidate: PayrollSignerCandidate) => { setSelected(candidate); setAttested(false); setIdempotencyKey(newIdempotencyKey()); };
  return <fieldset className="mt-5 rounded-md border border-[#dce8e8] bg-[#f7fbfb] p-4" disabled={disabled}>
    <legend className="px-1 text-sm font-semibold text-[#10141a]">Authorized signer</legend>
    <p className="text-sm text-[#5d626b]">Choose the verified owner account or an eligible active staff account. Phone and access details are never shown here.</p>
    <div className="mt-3 space-y-2" role="radiogroup" aria-label="Authorized signer">
      <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name={`authorized-signer-${scopeKey}`} checked={selected?.userUid === owner.userUid} onChange={() => choose(owner)} /><span><span className="font-semibold">{owner.fullName}</span><br />{owner.email}<br />{owner.title}</span></label>
      {candidates.map((candidate) => <label key={candidate.userUid} className="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name={`authorized-signer-${scopeKey}`} checked={selected?.userUid === candidate.userUid} onChange={() => choose(candidate)} /><span><span className="font-semibold">{candidate.fullName}</span><br />{candidate.email}<br />{candidate.title}</span></label>)}
    </div>
    <label className="mt-4 block text-sm"><span className="block font-medium">Search eligible staff</span><input value={search} type="search" minLength={2} maxLength={64} className="mt-1 min-h-11 w-full rounded-md border border-input px-3" onChange={(event) => setSearch(event.target.value)} aria-describedby="signer-search-help" /></label>
    <p id="signer-search-help" className="mt-1 text-xs text-[#5d626b]">Enter at least two characters to search active staff.</p>
    {search.trim().length >= 2 && searchQuery.isFetching && <p role="status" className="mt-2 text-sm text-[#5d626b]">Searching eligible staff…</p>}
    {search.trim().length >= 2 && searchQuery.isError && <button type="button" className="mt-2 text-sm font-semibold text-[#006f73] underline" onClick={() => void triggerSearch({ ...scope, q: search.trim() }, true)}>Try search again</button>}
    {search.trim().length >= 2 && !searchQuery.isFetching && !searchQuery.isError && searchQuery.data?.staffCandidates.length === 0 && <p role="status" className="mt-2 text-sm text-[#5d626b]">No eligible staff signer was found.</p>}
    <label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={attested} disabled={!selected} onChange={(event) => setAttested(event.target.checked)} />I confirm this selected account is authorized to act as the agency's payroll signer.</label>
  </fieldset>;
}
