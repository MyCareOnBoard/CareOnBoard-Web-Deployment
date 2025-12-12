import React, { useMemo } from "react";
import { FileText } from "lucide-react";

export function DocumentsTab() {
  const documents = useMemo(
    () => [
      {
        id: "photo-id",
        title: "Photo ID (Driver’s License, State ID, Passport)",
        status: "Available" as const,
      },
      { id: "ssn", title: "Social Security Card", status: "Available" as const },
      {
        id: "hep-b-series",
        title: "Hepatitis B vaccination series documents",
        status: "Available" as const,
      },
      {
        id: "hep-b-titer",
        title: "Hepatitis B immunity (titer result)",
        status: "Available" as const,
      },
    ],
    []
  );

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
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="backdrop-blur-[20px] rounded-[20px] flex items-center gap-[16px]"
          >
            <div className="w-[52.5px] h-[60px] rounded-[8px] bg-white flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-[#00b4b8]" />
            </div>

            <div className="flex flex-1 items-center justify-between min-w-0">
              <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a] truncate">
                {doc.title}
              </p>

              <div className="bg-[rgba(14,175,82,0.1)] border border-[#0eaf52] border-[0.5px] rounded-[60px] pl-[6px] pr-[8px] py-[7px] shrink-0">
                <span className="text-[11px] font-semibold leading-[normal] text-[#0eaf52]">
                  {doc.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


