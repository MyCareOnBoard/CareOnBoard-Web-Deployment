import { useEffect, useState } from "react";
import type { AgencyPayrollSetupProjection } from "../model/types";
import { canUsePayrollAction } from "../model/capabilities";

type SignerAction = "designate_signer" | "clear_signer";

export function SignerSetupCard({ projection, onAction, hideDesignation = false, disabled = false }: {
  projection: AgencyPayrollSetupProjection;
  onAction?: (action: SignerAction, authorityAttested?: true) => Promise<boolean>;
  hideDesignation?: boolean;
  disabled?: boolean;
}) {
  const [attested, setAttested] = useState(false);
  const [pendingAction, setPendingAction] = useState<SignerAction | null>(null);
  const candidate = projection.setup.designatedSignerPresent ? projection.setup.designatedSigner : projection.setup.signerCandidate;
  const canDesignate = !hideDesignation && canUsePayrollAction(projection, "designate_signer");
  const canClear = canUsePayrollAction(projection, "clear_signer");

  useEffect(() => {
    setAttested(false);
  }, [candidate?.userUid, candidate?.designated]);

  const runAction = async (action: SignerAction, authorityAttested?: true) => {
    if (!onAction || disabled || pendingAction) return;
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
  const heading = existingSignerForAnotherAccount
    ? "Existing signer designated"
    : projection.setup.designatedSignerPresent || candidateDesignated
      ? "Signer designated"
      : "Signer not designated";

  return (
    <div className="min-w-0">
      <h4 className="font-semibold text-[#10141a]">{heading}</h4>
      <p className="mt-1 text-sm text-[#5d626b]">Provider signatory link: {projection.setup.signatoryLinked ? "Linked" : "Not linked"}</p>
      {candidate ? (
        <div className="mt-4 rounded-md border border-[#dce8e8] bg-[#f7fbfb] p-4 text-sm text-[#10141a]">
          <p className="font-semibold">{candidateDesignated ? "Designated signer" : "Verified owner candidate"}</p>
          <p className="break-words">{candidate.fullName}</p>
          <p className="break-all">{candidate.email}</p>
          <p className="break-words">{candidate.title}</p>
          {existingSignerForAnotherAccount ? <p className="mt-3 text-[#5d626b]">Another existing signer must be cleared before this account can be designated.</p> : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#5d626b]">A verified agency owner account is required before a payroll signer can be designated.</p>
      )}
      {candidate && canDesignate && !projection.setup.designatedSignerPresent && !candidateDesignated ? (
        <div className="mt-4 space-y-3">
          <label className="flex gap-2 text-sm text-[#5d626b]">
            <input type="checkbox" checked={attested} disabled={disabled || pendingAction !== null} onChange={(event) => setAttested(event.target.checked)} />
            I confirm this verified account is authorized to act as the agency&apos;s payroll signer.
          </label>
          <button type="button" disabled={disabled || !attested || pendingAction !== null} aria-busy={disabled || pendingAction === "designate_signer"} aria-describedby={disabled ? "agency-payroll-command-status" : undefined} onClick={() => void runAction("designate_signer", true)} className="min-h-11 text-sm font-semibold text-[#006f73] underline disabled:opacity-50">
            Designate this account
          </button>
        </div>
      ) : null}
      {canClear ? (
        <button type="button" disabled={disabled || pendingAction !== null} aria-busy={disabled || pendingAction === "clear_signer"} aria-describedby={disabled ? "agency-payroll-command-status" : undefined} onClick={() => void runAction("clear_signer")} className="mt-4 min-h-11 text-sm font-semibold text-[#8b2d2d] underline disabled:opacity-50">
          Clear signer
        </button>
      ) : null}
    </div>
  );
}
