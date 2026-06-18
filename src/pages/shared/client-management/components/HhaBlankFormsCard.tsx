import React, { Suspense, lazy, useState } from "react";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AddClientFormData } from "../types/formData";

const PlanOfCareFormModal = lazy(() => import("./PlanOfCareFormModal"));
const ClinicalAssessmentFormModal = lazy(() => import("./ClinicalAssessmentFormModal"));

/**
 * Entry points for the on-screen HHA intake forms — "Create Plan of Care" and
 * "Create Clinical Assessment" — each opening a touch-friendly form that can be
 * exported to PDF or attached directly as the client's document. In-progress
 * entries are kept while the wizard is open.
 */
export default function HhaBlankFormsCard({
  formData,
  setFormData,
}: {
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
}) {
  const [pocOpen, setPocOpen] = useState(false);
  const [caOpen, setCaOpen] = useState(false);

  return (
    <div className="mb-10 rounded-xl border border-[#e2e4e6] bg-[#f8fafb] p-3">
      <p className="mb-1 text-[12px] font-semibold text-[#10141a]">
        Plan of Care &amp; Clinical Assessment forms
      </p>
      <p className="mb-3 text-[12px] text-[#5c6368]">
        Fill one out, then download it as a PDF or save it to this client&apos;s documents.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          className="h-11 min-h-[44px] w-full rounded-[10px] bg-[#00b4b8] hover:bg-[#009ea1] sm:w-auto"
          onClick={() => setPocOpen(true)}
        >
          <FilePlus2 className="mr-2 h-4 w-4 shrink-0" aria-hidden />
          Create Plan of Care
        </Button>
        <Button
          type="button"
          className="h-11 min-h-[44px] w-full rounded-[10px] bg-[#00b4b8] hover:bg-[#009ea1] sm:w-auto"
          onClick={() => setCaOpen(true)}
        >
          <FilePlus2 className="mr-2 h-4 w-4 shrink-0" aria-hidden />
          Create Clinical Assessment
        </Button>
      </div>

      {pocOpen ? (
        <Suspense fallback={null}>
          <PlanOfCareFormModal
            open={pocOpen}
            onOpenChange={setPocOpen}
            formData={formData}
            setFormData={setFormData}
          />
        </Suspense>
      ) : null}

      {caOpen ? (
        <Suspense fallback={null}>
          <ClinicalAssessmentFormModal
            open={caOpen}
            onOpenChange={setCaOpen}
            formData={formData}
            setFormData={setFormData}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
