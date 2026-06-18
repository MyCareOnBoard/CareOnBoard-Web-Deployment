import React, { Suspense, lazy, useEffect, useState } from "react";
import { FilePlus2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AddClientFormData, DocKey } from "../types/formData";

const PlanOfCareFormModal = lazy(() => import("./PlanOfCareFormModal"));
const ClinicalAssessmentFormModal = lazy(() => import("./ClinicalAssessmentFormModal"));

/** Doc slots whose generated/uploaded file is offered as a "View" link in this card. */
const VIEWABLE_DOC_SLOTS: Array<{ key: DocKey; label: string }> = [
  { key: "poc", label: "Plan of Care" },
  { key: "clinicalAssessment", label: "Clinical Assessment" },
];

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

  // Offer "View" links for the POC / Clinical Assessment slots once a file has been
  // generated, attached, or uploaded. A File needs a temporary object URL (revoked
  // when the doc changes or the card unmounts); an already-uploaded doc uses its url.
  const docs = formData.stage3.docs;
  const [viewableDocs, setViewableDocs] = useState<
    Array<{ key: DocKey; label: string; fileName: string; href: string }>
  >([]);

  useEffect(() => {
    const created: string[] = [];
    const next = VIEWABLE_DOC_SLOTS.flatMap(({ key, label }) => {
      const doc = docs.find((d) => d.key === key);
      if (!doc) return [];
      const file = doc.file ?? doc.files?.[0];
      if (file) {
        const href = URL.createObjectURL(file);
        created.push(href);
        return [{ key, label, fileName: file.name, href }];
      }
      if (doc.url) {
        return [{ key, label, fileName: doc.fileName ?? `${label}.pdf`, href: doc.url }];
      }
      return [];
    });
    setViewableDocs(next);
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [docs]);

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

      {viewableDocs.length > 0 ? (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-[#e2e4e6] pt-3">
          {viewableDocs.map((doc) => (
            <a
              key={doc.key}
              href={doc.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-[12px] font-medium text-[#00b4b8] hover:underline"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              View {doc.label}
              <span className="font-normal text-[#808081]">({doc.fileName})</span>
            </a>
          ))}
        </div>
      ) : null}

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
