import { useEffect, useRef, useState } from "react";
import { CompanySetupChecklist } from "@/features/payroll/components/CompanySetupChecklist";
import { SignerSetupCard } from "@/features/payroll/components/SignerSetupCard";
import { useGetAgencyPayrollSetupQuery, useLazyGetAgencyPayrollOperationQuery, useLazyGetAgencyPayrollOverviewQuery } from "@/features/payroll/api/agencyPayrollEndpoints";
import { useProjectionFreshness } from "@/features/payroll/hooks/useProjectionFreshness";
import { useRunAgencyPayrollCommandMutation } from "@/features/payroll/api/payrollCommands";
import { PayrollOperationProvider, usePayrollOperations } from "@/features/payroll/operations/PayrollOperationProvider";
import type { PayrollOperation, PayrollScope } from "@/features/payroll/model/types";

function AgencyPayrollSetupContent({ scope }: { scope: PayrollScope }) {
  const { data, isLoading, error, refetch } = useGetAgencyPayrollSetupQuery(scope, { skip: !scope.actorUid || !scope.agencyId });
  const [runCommand] = useRunAgencyPayrollCommandMutation();
  const [getOperation] = useLazyGetAgencyPayrollOperationQuery();
  const [getOverview] = useLazyGetAgencyPayrollOverviewQuery();
  const { watch } = usePayrollOperations();
  const cancelOperation = useRef<(() => void) | null>(null);
  const freshness = useProjectionFreshness(data, refetch);
  const [commandError, setCommandError] = useState<string | null>(null);
  useEffect(() => () => cancelOperation.current?.(), [scope.actorUid, scope.agencyId]);
  if (isLoading) return <div aria-label="Loading payroll setup" className="h-32 animate-pulse rounded-md bg-[#f3f6f6]" />;
  if (error || !data) return <section role="alert" className="rounded-md border border-[#e7c3c3] bg-[#fffafa] p-5 text-sm text-[#7a2929]">Payroll setup is unavailable. <button type="button" onClick={() => void refetch()} className="font-semibold underline">Try again</button></section>;
  const watchOperation = (operation: PayrollOperation) => { cancelOperation.current?.(); cancelOperation.current = watch(scope, operation.operationId, async () => getOperation({ ...scope, operationId: operation.operationId }).unwrap(), () => { void refetch(); void getOverview(scope); }); };
  const signerAction = async (command: "designate_signer" | "clear_signer" | "retry_company_sync" | "refresh_company_reconciliation", authorityAttested?: true) => {
    if (command === "designate_signer" && authorityAttested !== true) {
      setCommandError("Confirm your authority before designating yourself as signer.");
      return;
    }
    if (!await freshness.requireCurrentProjection()) return;
    setCommandError(null);
    try {
      const operation = command === "designate_signer"
        ? await runCommand({ ...scope, command, projectionRevision: data.projectionRevision, designatedSignerUserUid: scope.actorUid, authorityAttested: true }).unwrap()
        : await runCommand({ ...scope, command, projectionRevision: data.projectionRevision }).unwrap();
      watchOperation(operation);
    } catch (requestError: unknown) {
      if (typeof requestError === "object" && requestError !== null && "status" in requestError && (requestError as { status?: number }).status === 409) {
        await refetch();
        void getOverview(scope);
        return;
      }
      setCommandError("The payroll command could not be completed. Review the current setup and try again.");
    }
  };
  return <div className="max-w-3xl divide-y divide-[#e5e7eb] rounded-lg border border-[#e0e5e5] bg-white px-6">{commandError && <p role="alert" className="py-3 text-sm text-[#8b2d2d]">{commandError}</p>}<CompanySetupChecklist projection={data} /><SignerSetupCard projection={data} onAction={(action, attested) => void signerAction(action, attested)} />{data.capabilities.canManage && <div className="py-5 flex gap-3"><button type="button" onClick={() => void signerAction("retry_company_sync")} className="text-sm font-semibold text-[#006f73] underline">Retry company sync</button><button type="button" onClick={() => void signerAction("refresh_company_reconciliation")} className="text-sm font-semibold text-[#006f73] underline">Refresh reconciliation</button></div>}</div>;
}

export default function AgencyPayrollSetupTab({ scope }: { scope: PayrollScope }) {
  return <PayrollOperationProvider><AgencyPayrollSetupContent scope={scope} /></PayrollOperationProvider>;
}
