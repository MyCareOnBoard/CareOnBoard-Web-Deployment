import { useState } from "react";
import { Sheet, FileText, Loader2, AlertCircle } from "lucide-react";
import axiosClient from "@/lib/axios";

interface ReportDownloadData {
  artifactId: string;
  downloadPath: string;
  fileName: string;
  title: string;
  format?: "xlsx" | "csv";
  sizeBytes?: number;
  rowCount?: number;
  expiresAt?: string;
}

/**
 * Download card for a generated report.
 *
 * Unlike PdfDownloadCard this is NOT a plain `<a href>`. A report carries client
 * names, dates of birth, DDD ids and addresses, so the file is private in Cloud
 * Storage and there is no URL that works on its own — it is fetched with the
 * viewer's own credentials through the audited endpoint, then handed to the browser
 * as a blob.
 *
 * Mirrors `downloadMedicalDocument` in CareConnectFrontend's clinicalService.
 */
export default function ReportDownloadCard({ data }: { data: unknown }) {
  const d = data as ReportDownloadData;
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const isCsv = d?.format === "csv";
  const Icon = isCsv ? FileText : Sheet;
  const accent = isCsv ? "#2563eb" : "#16a34a";

  const handleDownload = async () => {
    if (status === "loading") return;
    setStatus("loading");
    setMessage(null);

    try {
      const { data: blob } = await axiosClient.get(
        `/reportEngine${d.downloadPath}?download=1`,
        { responseType: "blob" },
      );

      const url = URL.createObjectURL(blob as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = d.fileName || "report";
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoked on the next tick so the click has already been handled.
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setStatus("idle");
    } catch (error: unknown) {
      const httpStatus = (error as { response?: { status?: number } })?.response?.status;
      setStatus("error");
      setMessage(
        httpStatus === 410
          ? "This report has expired. Ask for it again to generate a fresh copy."
          : httpStatus === 404
            ? "This report is no longer available."
            : "Download failed. Please try again.",
      );
    }
  };

  const meta = [
    typeof d?.rowCount === "number" ? `${d.rowCount.toLocaleString()} rows` : null,
    typeof d?.sizeBytes === "number" ? formatBytes(d.sizeBytes) : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
        <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} />
        <span className="text-[13px] font-semibold text-[#10141a] truncate">
          {d?.title || "Report"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] text-[#9ca3af] truncate">{d?.fileName || "report"}</p>
          {meta && <p className="text-[11px] text-[#9ca3af] mt-0.5">{meta}</p>}
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={status === "loading"}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: accent }}
        >
          {status === "loading"
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Icon className="h-3.5 w-3.5" />}
          {status === "loading" ? "Preparing…" : `Download ${isCsv ? "CSV" : "Excel"}`}
        </button>
      </div>

      {message && (
        <div className="flex items-start gap-2 px-4 pb-3 -mt-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#dc2626]" />
          <p className="text-[11px] text-[#dc2626]">{message}</p>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
