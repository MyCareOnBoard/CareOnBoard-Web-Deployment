import { FileText } from "lucide-react";

interface PdfDownloadData {
  url: string;
  fileName: string;
  title: string;
}

export default function PdfDownloadCard({ data }: { data: unknown }) {
  const d = data as PdfDownloadData;

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
        <FileText className="h-4 w-4 text-[#00b4b8] shrink-0" />
        <span className="text-[13px] font-semibold text-[#10141a] truncate">{d?.title || "Report"}</span>
      </div>
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] text-[#9ca3af] truncate">{d?.fileName || "document.pdf"}</p>
        </div>
        <a
          href={d?.url}
          target="_blank"
          rel="noopener noreferrer"
          download={d?.fileName}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#00b4b8] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#009ea2] transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Download PDF
        </a>
      </div>
    </div>
  );
}
