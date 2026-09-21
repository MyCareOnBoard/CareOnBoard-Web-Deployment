import type { DocumentComplianceResponse } from '@/pages/agency/compliance-alerts/apiTypes';
import { EmployeeDocument } from "@/lib/api/employee-documents";
import { type Shift } from "@/lib/api/shifts";
import { ShiftsChart } from "./ShiftsChart";
import { TrainingSection } from "./TrainingSection";
import { DocumentsSection } from "./DocumentsSection";

interface ActivityTabProps {
  compliance?: DocumentComplianceResponse;
  complianceError?: boolean;
  refreshCompliance?: () => unknown;
  focusDocumentId?: string | null;
  focusDocumentKey?: string | null;
  dspId: string;
  dspName: string;
  shifts: Shift[];
  detailsLoading: boolean;
  trainingsLoading: boolean;
  documentsLoading: boolean;
  totalCount: number;
  completedCount: number;
  automaticAccepted?: number;
  policyAssessmentComplete?: boolean;
  documents: EmployeeDocument[];
  onRequestDocument: () => void;
  getDocumentStatusColor: (status: string) => string;
  getDocumentActionButton: (status: string, doc?: EmployeeDocument) => React.ReactNode;
}

export function ActivityTab({
  compliance, complianceError, refreshCompliance, focusDocumentId, focusDocumentKey,
  dspName: _dspName,
  shifts,
  detailsLoading,
  trainingsLoading,
  documentsLoading,
  totalCount,
  completedCount,
  automaticAccepted, policyAssessmentComplete,
  documents,
  onRequestDocument,
  getDocumentStatusColor,
  getDocumentActionButton,
}: ActivityTabProps) {

  return (
    <div className="space-y-6">
      {/* Grid Layout: Shifts Chart (Left) and Training (Right) */}
      {!focusDocumentId && !focusDocumentKey && <div className="grid grid-cols-2 gap-6">
        {/* Left Column: Shifts Chart */}
        <ShiftsChart
          shifts={shifts}
          isLoading={detailsLoading}
        />

        {/* Right Column*/}
        <div className="flex flex-col gap-4">
          <TrainingSection
            totalCount={totalCount}
            completedCount={completedCount}
            automaticAccepted={automaticAccepted}
            policyAssessmentComplete={policyAssessmentComplete}
            isLoading={trainingsLoading}
          />
          <div className=" bg-[#edf1f2] p-6 rounded-lg aspect"></div>
        </div>
      </div>}

      {/* Documents Section - Full Width */}
      <DocumentsSection
        compliance={compliance}
        complianceError={complianceError}
        refreshCompliance={refreshCompliance}
        focusDocumentId={focusDocumentId}
        focusDocumentKey={focusDocumentKey}
        documents={documents}
        isLoading={documentsLoading}
        onRequestDocument={onRequestDocument}
        getDocumentStatusColor={getDocumentStatusColor}
        getDocumentActionButton={getDocumentActionButton}
      />
    </div>
  );
}
