import { FileText, Sheet, FileType2 } from "lucide-react";

interface DocumentDownloadData {
  url: string;
  fileName: string;
  title: string;
  fileType?: "pdf" | "excel" | "word";
}

const FILE_CONFIG = {
  excel: {
    Icon: Sheet,
    label: "Download Excel",
    accent: "#16a34a",
    hover: "#15803d",
    iconBg: "text-[#16a34a]",
  },
  word: {
    Icon: FileType2,
    label: "Download Word",
    accent: "#2563eb",
    hover: "#1d4ed8",
    iconBg: "text-[#2563eb]",
  },
  pdf: {
    Icon: FileText,
    label: "Download PDF",
    accent: "#00b4b8",
    hover: "#009ea2",
    iconBg: "text-[#00b4b8]",
  },
} as const;

export default function PdfDownloadCard({ data }: { data: unknown }) {
  const d = data as DocumentDownloadData;
  const type = d?.fileType ?? "pdf";
  const config = FILE_CONFIG[type] ?? FILE_CONFIG.pdf;
  const { Icon, label } = config;

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
        <Icon className={`h-4 w-4 shrink-0 ${config.iconBg}`} />
        <span className="text-[13px] font-semibold text-[#10141a] truncate">{d?.title || "Report"}</span>
      </div>
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] text-[#9ca3af] truncate">{d?.fileName || "document"}</p>
        </div>
        <a
          href={d?.url}
          target="_blank"
          rel="noopener noreferrer"
          download={d?.fileName}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors"
          style={{ backgroundColor: config.accent }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = config.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = config.accent)}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </a>
      </div>
    </div>
  );
}
