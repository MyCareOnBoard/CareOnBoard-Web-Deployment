import { Link } from "react-router";
import { useAuth } from "@/utils/auth";
import type { AnalyticsSummaryData } from "@/lib/api/reports";
import {
  getComplianceSources,
  complianceHref,
  sourceSection,
  sourceLabels,
} from "../../compliance-alerts/workspaceScope";
import { Routes } from "@/routes/constants";
import { CURRENT_RECORDS_HELPER } from "../analyticsScope";
export default function CurrentRecordsLinks({
  summary,
  mode,
}: {
  summary: AnalyticsSummaryData;
  mode?: string | null;
}) {
  const { user } = useAuth();
  const sources = getComplianceSources(user, mode).filter((source) =>
    summary.currentRecordSources?.includes(source),
  );
  const overtime =
    summary.complianceInsights?.breakdown.some(
      (item) => item.key === "overtimeRisk",
    ) &&
    summary.riskTrends.some((row) => typeof row.overtime === "number") &&
    (user?.userType === "agency" ||
      user?.profile?.accessList?.some((key) =>
        ["Scheduling", "Shift Management"].includes(key),
      ));
  if (!sources.length && !overtime) return null;
  return (
    <section className="rounded-[32px] border border-[#E8ECEF] bg-[#FFFFFF66] p-6">
      <h3 className="text-[22px] font-semibold text-[#111827]">
        Review current records
      </h3>
      <p className="mt-2 text-sm text-[#6B7280]">{CURRENT_RECORDS_HELPER}</p>
      <div className="mt-4 flex flex-wrap gap-4">
        {sources.map((source) => (
          <Link
            key={source}
            className="text-[#008b8b] underline"
            to={complianceHref({
              section: sourceSection[source],
              source,
              ...(mode === "ddd" || mode === "hha" ? { mode } : {}),
              ...(source === "document_expiry" ? { condition: "expired" } : {}),
            })}
          >
            {sourceLabels[source]}
          </Link>
        ))}
        {overtime && (
          <Link className="text-[#008b8b] underline" to={Routes.agency.shifts}>
            Overtime: review current shifts
          </Link>
        )}
      </div>
    </section>
  );
}
