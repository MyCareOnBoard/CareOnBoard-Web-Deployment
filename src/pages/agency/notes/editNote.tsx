import {Printer, X} from "lucide-react";
import React from "react";
import AgencyCommunityBasedNote from "@/pages/agency/notes/components/commnityBased";
import AgencyActivitiesLogTemplate from "@/pages/agency/notes/components/activitiesLogTemplate";
import AgencyRespiteLog from "@/pages/agency/notes/components/respiteLog";
import AgencySupportedEmploymentIntervention from "@/pages/agency/notes/components/supportedEmploymentIntervention";
import {useGetSubmittedNoteDetailsQuery} from "@/pages/agency/notes/api";
import {useNavigate} from "react-router";
import {Routes} from "@/routes/constants";


export default function AgencyEditNote(
  {isOpen, setIsOpen, submissionId}: {
    isOpen: boolean,
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>,
    submissionId: string | null
  }
) {
  const {data: submittedNote, isLoading} = useGetSubmittedNoteDetailsQuery(submissionId!, {
    skip: !submissionId
  });
  const navigate = useNavigate();

  const handleCancel = () => {
    navigate(Routes.agency.notes, {replace: true});
    setIsOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const renderNoteComponent = () => {
    if (!submittedNote) return null;

    switch (submittedNote.activityType) {
      case 'community-based':
        return (
          <AgencyCommunityBasedNote
            submissionId={submissionId}
            isLoading={isLoading}
            submittedNote={submittedNote}
          />
        );
      case 'community-inclusion':
        return (
          <AgencyActivitiesLogTemplate
            title="Community Inclusion Services – Activities Log (:serviceCode)"
            submissionId={submissionId}
            isLoading={isLoading}
            submittedNote={submittedNote}
          />
        );
      case 'day-habilitation':
        return (
          <AgencyActivitiesLogTemplate
            title="Day Habilitation Services – Activities Log (:serviceCode)"
            submissionId={submissionId}
            isLoading={isLoading}
            submittedNote={submittedNote}
          />
        );
      case 'prevocational-training':
        return (
          <AgencyActivitiesLogTemplate
            title="Prevocational Training Services – Activities Log (:serviceCode)"
            submissionId={submissionId}
            isLoading={isLoading}
            submittedNote={submittedNote}
          />
        );
      case 'supported-employment-pre':
        return (
          <AgencyActivitiesLogTemplate
            title="Supported Employment Services – Pre‐Employment – Activities Log (:serviceCode)"
            submissionId={submissionId}
            isLoading={isLoading}
            submittedNote={submittedNote}
          />
        );
      case 'supported-employment-intervention':
        return (
          <AgencySupportedEmploymentIntervention
            submissionId={submissionId}
            isLoading={isLoading}
            submittedNote={submittedNote}
          />
        );
      case 'respite-log':
        return (
          <AgencyRespiteLog
            submissionId={submissionId}
            isLoading={isLoading}
            submittedNote={submittedNote}
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <p className="text-[#808081]">Unknown note type: {submittedNote.activityType}</p>
          </div>
        );
    }
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
      <div
        className="fixed inset-0 bg-transparent bg-opacity-40 backdrop-blur z-60"
        onClick={() => setIsOpen(false)}
      >
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] relative animate-fadeIn p-6 flex flex-col print:max-w-none print:max-h-none print:shadow-none print:rounded-none print:p-0 print-content"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="flex space-x-3 items-center justify-end mb-3 flex-shrink-0 print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-3 cursor-pointer text-white hover:text-gray-600 transition-colors bg-[#B2B2B3] rounded-full px-4 py-3"
              aria-label="Print"
            >
              <Printer className="w-6 h-6"/>
              <span>Print</span>
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center space-x-3 cursor-pointer text-white hover:text-gray-600 transition-colors bg-[#B2B2B3] rounded-full px-4 py-3"
              aria-label="Close modal"
            >
              <X className="w-6 h-6"/>
              <span>Close</span>
            </button>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto print:overflow-visible">
            {renderNoteComponent()}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}