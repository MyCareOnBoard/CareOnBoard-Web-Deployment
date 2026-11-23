import { useState } from "react";
import { toast } from "sonner";
import { DocumentType, type GoalDocument } from "@/lib/api/goals-and-documents";
import { ciApi, apiErrorMessage } from "@/lib/api/ci-tracker";

const TRACKED = new Set<string>([DocumentType.COMMUNITY_INCLUSION_INDIVIDUALIZED_GOALS, DocumentType.DAY_HABILITATION_INDIVIDUALIZED_GOALS]);

/**
 * Approval bar for a submitted community inclusion / day program goals document.
 * Approved goals are the ones staff can link log rows to.
 */
export function CiGoalApproval({ document, onApproved }: { document: GoalDocument; onApproved: () => void }) {
  const [busy, setBusy] = useState(false);
  if (!TRACKED.has(document.documentType)) return null;
  const approved = document.approval?.status === "approved";

  async function approve() {
    setBusy(true);
    try {
      const result = await ciApi.approveGoals(document.id);
      toast.success(`Goals approved (version ${result.version}). Staff can now link log rows to them.`);
      onApproved();
    } catch (error) {
      toast.error(apiErrorMessage(error, "The goals could not be approved."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="status" className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-[14px] print:hidden ${approved ? "bg-[#e3f6ec] text-[#0f7a43]" : "bg-[#fff4d6] text-[#8a5a00]"}`}>
      <span>
        {approved
          ? `Approved goals, version ${document.approval?.version}. New activity log rows link to these goals.`
          : "Needs approval. Staff can't link activity log rows to these goals until they're approved."}
      </span>
      {!approved && (
        <button type="button" onClick={() => void approve()} disabled={busy} className="cursor-pointer rounded-full bg-[#00b4b8] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#009da1] disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Approving…" : "Review done, approve goals"}
        </button>
      )}
    </div>
  );
}

export default CiGoalApproval;
