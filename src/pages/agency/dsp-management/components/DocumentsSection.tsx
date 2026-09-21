import { complianceLabel, civilDateLabel, type DocumentComplianceResponse } from '@/pages/agency/compliance-alerts/apiTypes';
import {getApplicantDocs} from "@/pages/applicant/application/documentConfig";
import { useState, useEffect, useRef } from "react";
import { FileText, Plus } from "lucide-react";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { Button } from "@/components/ui/button";
import type { EmployeeDocument } from "@/lib/api/employee-documents";

interface DocumentsSectionProps {
  compliance?: DocumentComplianceResponse;
  complianceError?: boolean;
  refreshCompliance?: () => unknown;
  focusDocumentId?: string | null;
  focusDocumentKey?: string | null;
  documents: EmployeeDocument[];
  isLoading: boolean;
  onRequestDocument: () => void;
  getDocumentStatusColor: (status: string) => string;
  getDocumentActionButton: (status: string, doc?: EmployeeDocument) => React.ReactNode;
}

export function DocumentsSection({
  compliance, complianceError, refreshCompliance, focusDocumentId, focusDocumentKey,
  documents,
  isLoading,
  onRequestDocument,
  getDocumentStatusColor,
  getDocumentActionButton,
}: DocumentsSectionProps) {
  const slot=[...getApplicantDocs('dsp'),...getApplicantDocs('hha')].find(row=>row.id===focusDocumentKey);
  const slotRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(slot&&!isLoading){slotRef.current?.focus();slotRef.current?.scrollIntoView?.({block:'nearest'});}},[slot?.id,isLoading]);
  const [preview, setPreview] = useState<EmployeeDocument | null>(null);

  useEffect(() => {
    if (!focusDocumentId) return;
    const row = document.getElementById(`document-${focusDocumentId}`);
    row?.focus(); row?.scrollIntoView?.({block: 'nearest'});
  }, [focusDocumentId, documents, isLoading]);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Documents</h3>
          <p className="text-sm text-gray-600">Here are your uploaded documents</p>
        </div>
        <button 
          onClick={onRequestDocument}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm rounded-full hover:bg-teal-600 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Request new document
        </button>
      </div>

      {slot&&!isLoading&&<div ref={slotRef} tabIndex={-1} className="mb-4 rounded-xl border border-primary/30 bg-background p-4"><p className="font-semibold">Selected requirement: {slot.label}</p><p className="my-2 text-sm text-muted-foreground">Review the matching files below. If the required file is missing, request it from this staff member.</p><Button variant="outline" onClick={onRequestDocument}>Request document</Button></div>}
      {(complianceError || compliance?.syncStatus === 'error') && <p role="alert" className="text-sm text-red-700">We couldn't load document expiry status. Try again. Last checked: {compliance?.evaluatedAt ? new Date(compliance.evaluatedAt).toLocaleString() : 'Not yet checked'}. <button type="button" onClick={refreshCompliance}>Retry</button></p>}
      {focusDocumentId && !isLoading && !documents.some(doc => doc.id === focusDocumentId) && <p role="status">This document is unavailable or you no longer have access. <a href="?">Back to documents</a></p>}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No documents uploaded yet</p>
            </div>
          </div>
        ) : (
          documents.map((doc) => {
            const issue = compliance?.items.find(item => item.documentId === doc.id);
            const pilot = compliance?.pilotEnabled !== false && Boolean(refreshCompliance);
            const status = pilot ? (complianceError || compliance?.syncStatus === 'error' ? 'Expiry status unavailable' : complianceLabel(issue)) : doc.status;
            return (
            <div key={doc.id} id={`document-${doc.id}`} tabIndex={-1} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-teal-50 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <span className="text-sm text-gray-900">{doc.documentName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getDocumentStatusColor(pilot ? issue?.condition ?? 'pending' : doc.status)}`}>
                  {status === 'expiring-soon' ? 'Expiring Soon' : status === 'unavailable' ? 'Unavailable' : status}{pilot && issue?.expiryDateKey ? ` · ${civilDateLabel(issue.expiryDateKey)}` : ''}
                </span>
                {getDocumentActionButton(doc.status, doc)}
                {doc.fileUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreview(doc)}
                  >
                    View
                  </Button>
                ) : null}
              </div>
            </div>
          );})
        )}
      </div>
      <DocumentPreviewModal
        open={preview !== null}
        onOpenChange={(open) => { if (!open) setPreview(null); }}
        title={preview?.documentName ?? "Document preview"}
        url={preview?.fileUrl}
        fileName={preview?.fileName}
      />
    </div>
  );
}
