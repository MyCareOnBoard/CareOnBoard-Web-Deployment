import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AddClientFormData } from "@/pages/shared/client-management/types/formData";
import { ArrowLeft } from "lucide-react";

export function Stage7SystemAiAndAudit({
  footer,
  formData,
  setFormData,
  pageTitle = "Add client",
  handleBack,
}: {
  footer: React.ReactNode;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
  pageTitle?: string;
  handleBack?: () => void;
}) {
  const stage7 = formData.stage7;
  const updateStage7 = (patch: Partial<AddClientFormData["stage7"]>) =>
    setFormData((prev) => ({ ...prev, stage7: { ...prev.stage7, ...patch } }));

  const aiToggles = useMemo(
    () => [
      {
        label: "AI Notes Review",
        value: stage7.aiNotesReview,
        set: (v: boolean) => updateStage7({ aiNotesReview: v }),
      },
      {
        label: "AI Plan of Care Builder",
        value: stage7.aiPlanOfCareBuilder,
        set: (v: boolean) => updateStage7({ aiPlanOfCareBuilder: v }),
      },
      {
        label: "AI Goal Tracking",
        value: stage7.aiGoalTracking,
        set: (v: boolean) => updateStage7({ aiGoalTracking: v }),
      },
      {
        label: "Expiring documents reminder",
        value: stage7.expiringDocsReminder,
        set: (v: boolean) => updateStage7({ expiringDocsReminder: v }),
      },
      {
        label: "ISP/PCPT/SDR renewals reminder",
        value: stage7.renewalsReminder,
        set: (v: boolean) => updateStage7({ renewalsReminder: v }),
      },
    ],
    [
      stage7.aiGoalTracking,
      stage7.aiNotesReview,
      stage7.aiPlanOfCareBuilder,
      stage7.expiringDocsReminder,
      stage7.renewalsReminder,
    ]
  );

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="flex items-center gap-4 mb-10">
        <button
          onClick={handleBack}
          className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(255,255,255,0.5)] backdrop-blur-sm border border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.7)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#10141a]" />
        </button>
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          {pageTitle}
        </h1>
      </div>

      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            11. System &amp; AI Settings
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Defines how the platform interacts with the client's data.
          </p>
        </div>

        <div className="space-y-4 max-w-[520px]">
          {aiToggles.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-6">
              <p className="text-[14px] font-normal text-[#10141a]">{row.label}</p>
              <Switch checked={row.value} onCheckedChange={row.set} />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            12. Audit &amp; Monitoring Setup
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Used by compliance and QA teams.
          </p>
        </div>

        <div className="mb-6">
          <p className="text-[14px] font-normal text-[#10141a]">Audit Review Cycle</p>
          <div className="flex flex-wrap gap-3 mt-3">
            <button
              type="button"
              onClick={() => updateStage7({ auditCycle: "monthly" })}
              className={[
                "cursor-pointer rounded-[6px] border px-[10px] py-[6px] text-[14px] font-medium leading-[1.4] capitalize transition-colors",
                stage7.auditCycle === "monthly"
                  ? "bg-[#00b4b8] border-[#00b4b8] text-white"
                  : "border-[#808081] bg-transparent text-[#10141a]",
              ].join(" ")}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => updateStage7({ auditCycle: "quarterly" })}
              className={[
                "cursor-pointer rounded-[6px] border px-[10px] py-[6px] text-[14px] font-medium leading-[1.4] capitalize transition-colors",
                stage7.auditCycle === "quarterly"
                  ? "bg-[#00b4b8] border-[#00b4b8] text-white"
                  : "border-[#808081] bg-transparent text-[#10141a]",
              ].join(" ")}
            >
              Quarterly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Assigned QA Staff
            </label>
            <Input
              value={stage7.assignedQaStaff}
              onChange={(e) => updateStage7({ assignedQaStaff: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Required Visit Documentation
            </label>
            <Input
              value={stage7.requiredVisitDocumentation}
              onChange={(e) => updateStage7({ requiredVisitDocumentation: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Notes Review Rules
            </label>
            <Input
              value={stage7.notesReviewRules}
              onChange={(e) => updateStage7({ notesReviewRules: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Billing Validation Rules
            </label>
            <Input
              value={stage7.billingValidationRules}
              onChange={(e) => updateStage7({ billingValidationRules: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>
        </div>
      </div>

      {footer}
    </div>
  );
}
