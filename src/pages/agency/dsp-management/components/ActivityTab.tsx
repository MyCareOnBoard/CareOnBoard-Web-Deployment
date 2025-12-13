import { useState } from "react";
import { EmployeeDocument } from "@/lib/api/employee-documents";
import { ShiftsChart } from "./ShiftsChart";
import { TrainingSection } from "./TrainingSection";
import { DocumentsSection } from "./DocumentsSection";

interface ActivityTabProps {
  dspId: string;
  dspName: string;
  detailsLoading: boolean;
  trainingsLoading: boolean;
  documentsLoading: boolean;
  totalCount: number;
  completedCount: number;
  documents: EmployeeDocument[];
  onRequestDocument: () => void;
  getDocumentStatusColor: (status: string) => string;
  getDocumentActionButton: (status: string) => React.ReactNode;
}

export function ActivityTab({
  dspId,
  dspName,
  detailsLoading,
  trainingsLoading,
  documentsLoading,
  totalCount,
  completedCount,
  documents,
  onRequestDocument,
  getDocumentStatusColor,
  getDocumentActionButton,
}: ActivityTabProps) {
  const [shiftsFilter, setShiftsFilter] = useState<
    "year" | "month" | "week" | "lifetime"
  >("week");

  return (
    <div className="space-y-6">
      {/* Grid Layout: Shifts Chart (Left) and Training (Right) */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column: Shifts Chart */}
        <ShiftsChart
          filter={shiftsFilter}
          onFilterChange={setShiftsFilter}
          isLoading={detailsLoading}
        />

        {/* Right Column*/}
        <div className="flex flex-col gap-4">
          <TrainingSection
            totalCount={totalCount}
            completedCount={completedCount}
            isLoading={trainingsLoading}
          />
          <div className=" bg-[#edf1f2] p-6 rounded-lg aspect"></div>
        </div>
      </div>

      {/* Documents Section - Full Width */}
      <DocumentsSection
        documents={documents}
        isLoading={documentsLoading}
        onRequestDocument={onRequestDocument}
        getDocumentStatusColor={getDocumentStatusColor}
        getDocumentActionButton={getDocumentActionButton}
      />
    </div>
  );
}
