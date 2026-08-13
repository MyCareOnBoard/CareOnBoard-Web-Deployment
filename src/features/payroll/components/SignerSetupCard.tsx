import type { AgencyPayrollSetupProjection } from "../model/types";
import { canUsePayrollAction } from "../model/capabilities";
import { useState } from "react";
export function SignerSetupCard({ projection, onAction }: { projection: AgencyPayrollSetupProjection; onAction?: (action: "designate_signer" | "clear_signer", authorityAttested?: true) => void }) {
  const [attested, setAttested] = useState(false);
  const canDesignate = canUsePayrollAction(projection, "designate_signer");
  const canClear = canUsePayrollAction(projection, "clear_signer");
  return <section aria-labelledby="signer-setup-heading" className="border-b border-[#e5e7eb] py-6"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#006f73]">Authorized signer</p><h2 id="signer-setup-heading" className="mt-1 text-xl font-semibold text-[#10141a]">{projection.setup.designatedSignerPresent ? "Signer designated" : "Signer not designated"}</h2>{canDesignate && <div className="mt-4 space-y-3"><label className="flex gap-2 text-sm text-[#5d626b]"><input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} />I am authorized to designate myself as this agency's payroll signer.</label><button type="button" disabled={!attested} onClick={() => onAction?.("designate_signer", true)} className="text-sm font-semibold text-[#006f73] underline disabled:opacity-50">Designate myself</button></div>}{canClear && <button type="button" onClick={() => onAction?.("clear_signer")} className="mt-4 text-sm font-semibold text-[#8b2d2d] underline">Clear signer</button>}</section>;
}
