import { useEffect, useMemo, useState } from "react";
import { FileWarning, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PreviewKind = "image" | "pdf" | "unsupported";

const IMAGE_EXTENSIONS = new Set(["bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"]);
const UNSUPPORTED_EXTENSIONS = new Set([
  "csv",
  "doc",
  "docx",
  "pages",
  "ppt",
  "pptx",
  "rar",
  "rtf",
  "xls",
  "xlsx",
  "zip",
]);

function extensionFrom(value?: string): string | null {
  if (!value) return null;
  const withoutQuery = value.split(/[?#]/, 1)[0];
  const match = withoutQuery.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function previewKind(fileName?: string, url?: string): PreviewKind {
  const extensions = [extensionFrom(fileName), extensionFrom(url)].filter(Boolean) as string[];
  for (const extension of extensions) {
    if (IMAGE_EXTENSIONS.has(extension)) return "image";
    if (extension === "pdf") return "pdf";
    if (UNSUPPORTED_EXTENSIONS.has(extension)) return "unsupported";
  }
  return "pdf";
}

function pdfPreviewUrl(url: string): string {
  const [base, fragment = ""] = url.split("#", 2);
  const viewerOptions = "toolbar=0&navpanes=0";
  return `${base}#${fragment ? `${fragment}&` : ""}${viewerOptions}`;
}

export interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url?: string | null;
  fileName?: string;
  isLoading?: boolean;
  error?: string | null;
}

export function DocumentPreviewModal({
  open,
  onOpenChange,
  title,
  url,
  fileName,
  isLoading = false,
  error,
}: DocumentPreviewModalProps) {
  const [mediaError, setMediaError] = useState(false);
  const kind = useMemo(() => previewKind(fileName, url ?? undefined), [fileName, url]);

  useEffect(() => {
    setMediaError(false);
  }, [open, url]);

  const visibleError = error || (mediaError ? "We couldnâ€™t display this document." : null);
  const canRender = open && Boolean(url) && !isLoading && !visibleError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(88vh,900px)] w-[min(94vw,1100px)] max-w-none flex-col gap-0 overflow-hidden p-0"
        onContextMenu={(event) => event.preventDefault()}
      >
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-[#e2e6e6] px-5 py-4 text-left">
          <div className="min-w-0">
            <DialogTitle className="truncate text-xl leading-7">{title}</DialogTitle>
            <DialogDescription className="sr-only">
              View-only document preview. Download and print actions are not provided.
            </DialogDescription>
          </div>
          <DialogClose
            type="button"
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[#d7dddd] text-[#10141a] transition-colors hover:bg-[#edf1f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </DialogClose>
        </DialogHeader>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#edf1f2] p-3 sm:p-5">
          {isLoading ? (
            <div className="flex items-center gap-3 text-sm font-medium text-[#596065]" role="status">
              <Loader2 className="h-5 w-5 animate-spin text-[#008f92]" aria-hidden="true" />
              Loading document previewâ€¦
            </div>
          ) : visibleError ? (
            <PreviewMessage message={visibleError} />
          ) : canRender && kind === "unsupported" ? (
            <PreviewMessage message="This file type canâ€™t be previewed here." />
          ) : canRender && kind === "image" ? (
            <img
              src={url ?? undefined}
              alt={`${title} preview`}
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              onError={() => setMediaError(true)}
            />
          ) : canRender && url ? (
            <iframe
              src={pdfPreviewUrl(url)}
              title={`${title} preview`}
              className="h-full w-full rounded-lg border-0 bg-white"
              referrerPolicy="no-referrer"
              onError={() => setMediaError(true)}
            />
          ) : (
            <PreviewMessage message="This document isnâ€™t available to preview." />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewMessage({ message }: { message: string }) {
  return (
    <div role="alert" className="flex max-w-sm flex-col items-center gap-3 text-center text-sm text-[#596065]">
      <FileWarning className="h-9 w-9 text-[#808081]" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
