import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportFileRow({ file, detail, disabled, removeLabel, onRemove }: {
  file: File;
  detail?: string;
  disabled?: boolean;
  removeLabel: string;
  onRemove: () => void;
}) {
  const fileType = file.type === "application/pdf" || file.type === "application/x-pdf"
    ? "PDF" : file.name.split(".").pop()?.toUpperCase() || "Document";

  return <li className="flex items-center gap-3 rounded-xl border border-[#dce6e7] bg-white px-3 py-2.5">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf6f6] text-[#087b80]">
      <FileText className="size-5" aria-hidden="true" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-[13px] font-semibold leading-5 text-[#10141a] [overflow-wrap:anywhere]">{file.name}</p>
      <p className="mt-0.5 text-[12px] leading-5 text-[#617579] [overflow-wrap:anywhere]">
        {fileType} · {formatFileSize(file.size)}{detail ? ` · ${detail}` : ""}
      </p>
    </div>
    <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 rounded-xl p-0 text-[#617579] hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-500/30" aria-label={removeLabel} title="Remove file" disabled={disabled} onClick={onRemove}>
      <Trash2 className="size-4" aria-hidden="true" />
    </Button>
  </li>;
}
