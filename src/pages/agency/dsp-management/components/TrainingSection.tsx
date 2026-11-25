import { GraduationCap } from "lucide-react";
import { AgencyPanel } from "@/components/agency/AgencyShell";

interface TrainingSectionProps {
  totalCount: number;
  completedCount: number;
  automaticAccepted?: number;
  policyAssessmentComplete?: boolean;
  isLoading: boolean;
}

function Bar({ label, value, share, tone }: { label: string; value: number; share: number; tone: string }) {
  const width = Math.max(0, Math.min(100, Number.isFinite(share) ? share : 0));
  return (
    <div>
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-[#4b535b] dark:text-[#9aa4a8]">{label}</span>
        <span className="font-medium tabular-nums text-[#10141a] dark:text-[#f4f6f7]">{value}</span>
      </div>
      <div aria-hidden="true" className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#e2e5e8] dark:bg-white/10">
        <div className={`h-full rounded-full ${tone} transition-[width] duration-500`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function TrainingSection({ totalCount, completedCount, automaticAccepted = 0, policyAssessmentComplete = false, isLoading }: TrainingSectionProps) {
  const assigned = totalCount || 0;
  const completed = completedCount || 0;
  return (
    <AgencyPanel
      icon={GraduationCap}
      title="Training"
      busy={isLoading}
      action={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#4b535b] dark:text-[#9aa4a8]">
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#0f7e7d]" />Assigned · {assigned}</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#12b5b0]" />Manual completed · {completed}</span>
        </div>
      }
    >
      <p className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Automatic evidence accepted · {automaticAccepted}. Check Trainings for current CPR validity.</p>
      {!isLoading && !policyAssessmentComplete && <p className="mt-1 text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Some automatic requirements are not assessed yet. Open Trainings for details.</p>}
      {isLoading ? (
        <div aria-hidden="true" className="mt-4 space-y-4">
          <div className="h-9 animate-pulse rounded-[8px] bg-[#f4f5f6] dark:bg-white/5" />
          <div className="h-9 animate-pulse rounded-[8px] bg-[#f4f5f6] dark:bg-white/5" />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <Bar label="Assigned" value={assigned} share={assigned ? 100 : 0} tone="bg-[#0f7e7d]" />
          <Bar label="Manual completed" value={completed} share={assigned ? (completed / assigned) * 100 : 0} tone="bg-[#12b5b0]" />
        </div>
      )}
    </AgencyPanel>
  );
}
