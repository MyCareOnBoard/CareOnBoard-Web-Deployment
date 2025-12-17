import React, { useMemo } from "react";
import { FileText } from "lucide-react";
import { Client } from "@/lib/api/clients";

export function DocumentsTab({ client }: { client: Client }) {
  const documents = useMemo(() => {
    if (!client.documents || client.documents.length === 0) {
      return [];
    }
    
    return client.documents.map((doc) => ({
      id: doc.key,
      title: doc.title || doc.key,
      fileName: doc.fileName,
      status: doc.url ? ("Available" as const) : ("Not uploaded" as const),
      url: doc.url,
      issuedOnDate: doc.issuedOnDate,
      expiryDate: doc.expiryDate,
    }));
  }, [client.documents]);

  return (
    <div className="mt-4 backdrop-blur bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] p-[20px] flex flex-col gap-[24px] overflow-hidden">
      <div className="flex flex-col gap-[4px]">
        <p className="text-[24px] font-medium leading-[normal] text-[#10141a]">
          Documents
        </p>
        <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
          Here are your uploaded documents
        </p>
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
                    <p className="text-[12px] font-medium leading-[1.4] text-[#808081] truncate">
                      {doc.fileName}
                    </p>
                  )}
                </div>

                <div
                  className={[
                    "border rounded-[60px] pl-[6px] pr-[8px] py-[7px] shrink-0",
                    doc.status === "Available"
                      ? "bg-[rgba(14,175,82,0.1)] border-[#0eaf52]"
                      : "bg-[rgba(181,181,181,0.1)] border-[#b5b5b5]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "text-[11px] font-semibold leading-[normal]",
                      doc.status === "Available"
                        ? "text-[#0eaf52]"
                        : "text-[#b5b5b5]",
                    ].join(" ")}
                  >
                    {doc.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


