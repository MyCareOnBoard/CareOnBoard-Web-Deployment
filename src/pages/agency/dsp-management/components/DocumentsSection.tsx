import { FileText, Plus } from "lucide-react";
import { EmployeeDocument } from "@/lib/api/employee-documents";

interface DocumentsSectionProps {
  documents: EmployeeDocument[];
  isLoading: boolean;
  onRequestDocument: () => void;
  getDocumentStatusColor: (status: string) => string;
  getDocumentActionButton: (status: string) => React.ReactNode;
}

export function DocumentsSection({
  documents,
  isLoading,
  onRequestDocument,
  getDocumentStatusColor,
  getDocumentActionButton,
}: DocumentsSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Documents</h3>
          <p className="text-sm text-gray-600">Here are your uploaded documents</p>
        </div>
        <button 
          onClick={onRequestDocument}
          className="flex items-center gap-2 px-4 py-2 bg-[#00B4B8] text-white text-sm rounded-full hover:bg-[#00A0A4] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Request new document
        </button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00B4B8]"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No documents uploaded yet</p>
            </div>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <span className="text-sm text-gray-900">{doc.documentName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getDocumentStatusColor(doc.status)}`}>
                  {doc.status === 'expiring-soon' ? 'Expiring Soon' : doc.status}
                </span>
                {getDocumentActionButton(doc.status)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
