import React, { useMemo } from "react";
import { FileText, Plus } from "lucide-react";
import { Client, ClientDocument } from "@/lib/api/clients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DocumentsTab({
  client,
  onOpenUploadModal,
}: {
  client: Client;
  onOpenUploadModal?: (document?: ClientDocument) => void;
}) {

  const documents = useMemo(() => {
    if (!client.documents || client.documents.length === 0) {
      return [];
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return client.documents.map((doc) => {
      let isExpired = false;
      if (doc.expiryDate) {
        const expiryDate = new Date(doc.expiryDate);
        expiryDate.setHours(0, 0, 0, 0);
        isExpired = expiryDate < today;
      }
      
      // Determine status: expired takes priority, then check if uploaded
      let status: "Expired" | "Available" | "Not uploaded";
      if (isExpired) {
        status = "Expired";
      } else if (doc.url) {
        status = "Available";
      } else {
        status = "Not uploaded";
      }
      
      return {
        id: doc.key,
        title: doc.title || doc.key,
        fileName: doc.fileName,
        status,
        url: doc.url,
        issuedOnDate: doc.issuedOnDate,
        expiryDate: doc.expiryDate,
        isExpired,
        document: doc, // Include the full document object for editing
      };
    });
  }, [client.documents]);

  return (
    <div className="mt-4 backdrop-blur bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] p-[20px] flex flex-col gap-[24px] overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-[4px]">
          <p className="text-[24px] font-medium leading-[normal] text-[#10141a]">
            Documents
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Here are your uploaded documents
          </p>
        </div>
        <Button
          className="h-11 rounded-[60px] bg-[#00b4b8] text-white hover:bg-[#00a0a4] px-6 shrink-0"
          onClick={() => {
            if (onOpenUploadModal) {
              onOpenUploadModal();
            }
          }}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Document
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {documents.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[14px] font-medium text-[#808081]">
              No documents uploaded yet.
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="backdrop-blur-[20px] rounded-[20px] flex items-center gap-[16px]"
            >
              <div className="w-[52.5px] h-[60px] rounded-[8px] bg-white flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-[#00b4b8]" />
              </div>

              <div className="flex flex-1 items-center justify-between min-w-0">
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a] truncate">
                    {doc.title}
                  </p>
                  {doc.fileName && (
                    doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] font-medium leading-[1.4] text-[#808081] truncate hover:text-[#00b4b8] hover:underline transition-colors"
                      >
                        {doc.fileName}
                      </a>
                    ) : (
                      <p className="text-[12px] font-medium leading-[1.4] text-[#808081] truncate">
                        {doc.fileName}
                      </p>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={
                      doc.status === "Expired"
                        ? "expired"
                        : doc.status === "Available"
                        ? "success"
                        : "pending"
                    }
                    className={doc.status === "Expired" ? "cursor-pointer" : ""}
                    onClick={() => {
                      if (doc.status === "Expired") {
                        if (onOpenUploadModal) {
                          onOpenUploadModal(doc.document);
                        }
                      }
                    }}
                    title={doc.status === "Expired" ? "Update Document" : ""}
                  >
                    {doc.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


