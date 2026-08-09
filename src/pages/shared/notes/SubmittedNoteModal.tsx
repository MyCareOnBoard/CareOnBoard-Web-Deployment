import { lazy, Suspense } from "react";
import { Printer, X } from "lucide-react";
import { useGetSubmittedNoteDetailsQuery } from "@/pages/agency/notes/api";

const CommunityBasedNote = lazy(() => import("@/pages/agency/notes/components/commnityBased"));
const ActivitiesLogTemplate = lazy(() => import("@/pages/agency/notes/components/activitiesLogTemplate"));
const RespiteLog = lazy(() => import("@/pages/agency/notes/components/respiteLog"));
const SupportedEmploymentIntervention = lazy(() => import("@/pages/agency/notes/components/supportedEmploymentIntervention"));
const PersonalCareNote = lazy(() => import("@/pages/agency/notes/components/personalCareNote"));
const HhaServiceActivityLog = lazy(() => import("@/pages/agency/notes/components/hhaServiceActivityLog"));

interface SubmittedNoteModalProps {
  isOpen: boolean;
  submissionId: string | null;
  readOnly: boolean;
  onClose: () => void;
}

const TemplateLoadingState = () => (
  <div className="flex min-h-[400px] items-center justify-center" aria-label="Loading note template">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent" />
  </div>
);

export default function SubmittedNoteModal({ isOpen, submissionId, readOnly, onClose }: SubmittedNoteModalProps) {
  const { data: submittedNote, isLoading } = useGetSubmittedNoteDetailsQuery(submissionId!, { skip: !submissionId });

  if (!isOpen) return null;

  const template = !submittedNote ? null : (() => {
    const commonProps = { submissionId, isLoading, submittedNote, readOnly };

    switch (submittedNote.activityType) {
      case "community-based":
        return <CommunityBasedNote {...commonProps} />;
      case "community-inclusion":
        return <ActivitiesLogTemplate {...commonProps} title="Community Inclusion Services – Activities Log (:serviceCode)" />;
      case "day-habilitation":
        return <ActivitiesLogTemplate {...commonProps} title="Day Habilitation Services – Activities Log (:serviceCode)" />;
      case "prevocational-training":
        return <ActivitiesLogTemplate {...commonProps} title="Prevocational Training Services – Activities Log (:serviceCode)" />;
      case "supported-employment-pre":
        return <ActivitiesLogTemplate {...commonProps} title="Supported Employment Services – Pre-Employment – Activities Log (:serviceCode)" />;
      case "supported-employment-intervention":
        return <SupportedEmploymentIntervention {...commonProps} />;
      case "respite-log":
        return <RespiteLog {...commonProps} />;
      case "hha-personal-care":
        return <PersonalCareNote {...commonProps} />;
      case "hha-service-log":
        return <HhaServiceActivityLog submissionId={submissionId} isLoading={isLoading} submittedNote={submittedNote} />;
      default:
        return <p className="py-8 text-center text-[#808081]">Unknown note type: {submittedNote.activityType}</p>;
    }
  })();

  return (
    <>
      <style>{`@media print { body * { visibility: hidden; } .print-content, .print-content * { visibility: visible; } .print-content { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="print-content relative flex max-h-[90vh] w-full max-w-7xl flex-col rounded-lg bg-white p-6 shadow-2xl print:max-h-none print:max-w-none print:rounded-none print:p-0 print:shadow-none" onClick={(event) => event.stopPropagation()}>
          <div className="mb-3 flex shrink-0 items-center justify-end space-x-3 print:hidden">
            <button onClick={() => window.print()} className="flex items-center space-x-3 rounded-full bg-[#B2B2B3] px-4 py-3 text-white" aria-label="Print"><Printer className="h-6 w-6" /><span>Print</span></button>
            <button onClick={onClose} className="flex items-center space-x-3 rounded-full bg-[#B2B2B3] px-4 py-3 text-white" aria-label="Close modal"><X className="h-6 w-6" /><span>Close</span></button>
          </div>
          <div className="flex-1 overflow-y-auto print:overflow-visible">
            {isLoading ? <TemplateLoadingState /> : <Suspense fallback={<TemplateLoadingState />}>{template}</Suspense>}
          </div>
        </div>
      </div>
    </>
  );
}
