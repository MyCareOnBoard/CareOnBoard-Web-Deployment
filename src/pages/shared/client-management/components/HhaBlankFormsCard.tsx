import React, { Suspense, lazy, useState } from "react";
import { Download, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AddClientFormData } from "../types/formData";

const PlanOfCareFormModal = lazy(() => import("./PlanOfCareFormModal"));

const BLANK_FORMS = [
  { label: "Plan of Care form", href: "/assets/Plan_of_Care_Form.pdf" },
  { label: "Clinical Assessment form", href: "/assets/Clinical_Assessment_Form.pdf" },
];

/**
 * Download links for the blank HHA intake forms plus a "Create Plan of Care"
 * action that opens an on-screen, touch-friendly form which can be exported to
 * PDF or attached directly as the client's Plan of Care document.
 */
export default function HhaBlankFormsCard({
  formData,
  setFormData,
}: {
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
}) {
  const [pocOpen, setPocOpen] = useState(false);

  return (
    <div className="mb-10 rounded-xl border border-[#e2e4e6] bg-[#f8fafb] p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-[12px] font-semibold text-[#10141a]">Blank forms</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {BLANK_FORMS.map((form) => (
              <a
                key={form.href}
                href={form.href}
                download
                aria-label={`Download blank ${form.label} (PDF)`}
                className="inline-flex items-center gap-2 rounded-[10px] border border-[#00b4b8]/40 bg-white px-3 py-2 text-[12px] font-medium text-[#00b4b8] transition-colors hover:bg-[#e6fafa]"
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden />
                {form.label}
              </a>
            ))}
          </div>
        </div>

        <div className="shrink-0">
          <Button
            type="button"
            className="h-11 min-h-[44px] w-full rounded-[10px] bg-[#00b4b8] hover:bg-[#009ea1] sm:w-auto"
            onClick={() => setPocOpen(true)}
          >
            <FilePlus2 className="mr-2 h-4 w-4 shrink-0" aria-hidden />
            Create Plan of Care
          </Button>
        </div>
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
    </div>
  );
}
