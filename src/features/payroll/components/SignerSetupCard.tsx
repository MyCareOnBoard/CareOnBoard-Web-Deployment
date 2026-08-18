import type { AgencyPayrollSetupProjection } from "../model/types";
import { canUsePayrollAction } from "../model/capabilities";
import { useEffect, useState } from "react";

export function SignerSetupCard({ projection, onAction, hideDesignation = false }: { projection: AgencyPayrollSetupProjection; onAction?: (action: "designate_signer" | "clear_signer", authorityAttested?: true) => Promise<boolean>; hideDesignation?: boolean }) {
  const [attested, setAttested] = useState(false);
  const [pendingAction, setPendingAction] = useState<"designate_signer" | "clear_signer" | null>(null);
  const candidate = projection.setup.designatedSignerPresent ? projection.setup.designatedSigner : projection.setup.signerCandidate;
  const canDesignate = !hideDesignation && canUsePayrollAction(projection, "designate_signer");
  const canClear = canUsePayrollAction(projection, "clear_signer");
  useEffect(() => {
    setAttested(false);
  }, [candidate?.userUid, candidate?.designated]);
  const runAction = async (action: "designate_signer" | "clear_signer", authorityAttested?: true) => {
    if (!onAction || pendingAction) return;
    setPendingAction(action);
    try {
      const succeeded = await onAction(action, authorityAttested);
      if (action === "designate_signer" && succeeded) setAttested(false);
    } finally {
      setPendingAction(null);
    }
  };
  const candidateDesignated = candidate?.designated === true;
  const existingSignerForAnotherAccount = projection.setup.designatedSignerPresent && Boolean(candidate) && !candidateDesignated;
  const heading = existingSignerForAnotherAccount ? "Existing signer designated" : (projection.setup.designatedSignerPresent || candidateDesignated ? "Signer designated" : "Signer not designated");
  return <section aria-labelledby="signer-setup-heading" className="border-b border-[#e5e7eb] py-6"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#006f73]">Authorized signer</p><h2 id="signer-setup-heading" className="mt-1 text-xl font-semibold text-[#10141a]">{heading}</h2><p className="mt-2 text-sm text-[#5d626b]">Provider signatory link: {projection.setup.signatoryLinked ? "Linked" : "Not linked"}</p>{candidate ? <div className="mt-4 rounded-md border border-[#dce8e8] bg-[#f7fbfb] p-4 text-sm text-[#10141a]"><p className="font-semibold">{candidateDesignated ? "Designated signer" : "Verified owner candidate"}</p><p>{candidate.fullName}</p><p>{candidate.email}</p><p>{candidate.title}</p>{existingSignerForAnotherAccount && <p className="mt-3 text-[#5d626b]">Another existing signer must be cleared before this account can be designated.</p>}</div> : <p className="mt-3 text-sm text-[#5d626b]">A verified agency owner account is required before a payroll signer can be designated.</p>}{candidate && canDesignate && !projection.setup.designatedSignerPresent && !candidateDesignated && <div className="mt-4 space-y-3"><label className="flex gap-2 text-sm text-[#5d626b]"><input type="checkbox" checked={attested} disabled={pendingAction !== null} onChange={(event) => setAttested(event.target.checked)} />I confirm this verified account is authorized to act as the agency's payroll signer.</label><button type="button" disabled={!attested || pendingAction !== null} aria-busy={pendingAction === "designate_signer"} onClick={() => void runAction("designate_signer", true)} className="text-sm font-semibold text-[#006f73] underline disabled:opacity-50">Designate this account</button></div>}{canClear && <button type="button" disabled={pendingAction !== null} aria-busy={pendingAction === "clear_signer"} onClick={() => void runAction("clear_signer")} className="mt-4 text-sm font-semibold text-[#8b2d2d] underline disabled:opacity-50">Clear signer</button>}</section>;
}
