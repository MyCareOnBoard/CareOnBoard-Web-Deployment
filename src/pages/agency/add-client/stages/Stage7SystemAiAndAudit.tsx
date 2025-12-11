import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { StageFooter } from "@/pages/agency/add-client/components/StageFooter";

type AuditCycle = "monthly" | "quarterly";

export function Stage7SystemAiAndAudit({
  onCancel,
  onNext,
}: {
  onCancel: () => void;
  onNext: () => void;
}) {
  const [declared, setDeclared] = useState(false);

  // 11. System & AI Settings
  const [aiNotesReview, setAiNotesReview] = useState(true);
  const [aiPlanOfCareBuilder, setAiPlanOfCareBuilder] = useState(true);
  const [aiGoalTracking, setAiGoalTracking] = useState(true);
  const [expiringDocsReminder, setExpiringDocsReminder] = useState(true);
  const [renewalsReminder, setRenewalsReminder] = useState(true);

  // 12. Audit & Monitoring Setup
  const [auditCycle, setAuditCycle] = useState<AuditCycle>("monthly");
  const [assignedQaStaff, setAssignedQaStaff] = useState("");
  const [requiredVisitDocumentation, setRequiredVisitDocumentation] = useState("");
  const [notesReviewRules, setNotesReviewRules] = useState("");
  const [billingValidationRules, setBillingValidationRules] = useState("");

  const aiToggles = useMemo(
    () => [
      { label: "AI Notes Review", value: aiNotesReview, set: setAiNotesReview },
      {
        label: "AI Plan of Care Builder",
        value: aiPlanOfCareBuilder,
        set: setAiPlanOfCareBuilder,
      },
      { label: "AI Goal Tracking", value: aiGoalTracking, set: setAiGoalTracking },
      {
        label: "Expiring documents reminder",
        value: expiringDocsReminder,
        set: setExpiringDocsReminder,
      },
      {
        label: "ISP/PCPT/SDR renewals reminder",
        value: renewalsReminder,
        set: setRenewalsReminder,
      },
    ],
    [aiGoalTracking, aiNotesReview, aiPlanOfCareBuilder, expiringDocsReminder, renewalsReminder]
  );

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          Add client
        </h1>
      </div>

      {/* 11. System & AI Settings */}
      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            11. System &amp; AI Settings
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Defines how the platform interacts with the client’s data.
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

      {/* 12. Audit & Monitoring Setup */}
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
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setAuditCycle("monthly")}
              className={[
                "cursor-pointer rounded-[6px] border px-[10px] py-[6px] text-[14px] font-medium leading-[1.4] capitalize transition-colors",
                auditCycle === "monthly"
                  ? "bg-[#00b4b8] border-[#00b4b8] text-white"
                  : "border-[#808081] bg-transparent text-[#10141a]",
              ].join(" ")}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAuditCycle("quarterly")}
              className={[
                "cursor-pointer rounded-[6px] border px-[10px] py-[6px] text-[14px] font-medium leading-[1.4] capitalize transition-colors",
                auditCycle === "quarterly"
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
              value={assignedQaStaff}
              onChange={(e) => setAssignedQaStaff(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Required Visit Documentation
            </label>
            <Input
              value={requiredVisitDocumentation}
              onChange={(e) => setRequiredVisitDocumentation(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Notes Review Rules
            </label>
            <Input
              value={notesReviewRules}
              onChange={(e) => setNotesReviewRules(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Billing Validation Rules
            </label>
            <Input
              value={billingValidationRules}
              onChange={(e) => setBillingValidationRules(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>
        </div>
      </div>

      <StageFooter
        declared={declared}
        setDeclared={setDeclared}
        onCancel={onCancel}
        onNext={onNext}
        requireDeclaration={true}
        nextLabel="Next"
      />
    </div>
  );
}


