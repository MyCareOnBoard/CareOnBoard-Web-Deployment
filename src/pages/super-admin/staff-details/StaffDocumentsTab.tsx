import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type SuperAdminStaffDocument, useGetStaffDocumentsQuery, useLazyGetStaffDocumentsQuery, useLazyGetStaffDocumentViewQuery } from "@/lib/api/staff-directory";

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const expirationDay = expiryDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expirationDay)) return false;
  const today = new Date();
  const todayDay = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return expirationDay < todayDay;
}

export function StaffDocumentsTab({ staffId }: { staffId: string }) {
  const documents = useGetStaffDocumentsQuery({ staffId });
  const [loadMore, morePage] = useLazyGetStaffDocumentsQuery();
  const [loadView] = useLazyGetStaffDocumentViewQuery();
  const [additionalRows, setAdditionalRows] = useState<SuperAdminStaffDocument[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    documentId: string;
    title: string;
    url: string | null;
    isLoading: boolean;
    error: string | null;
  } | null>(null);
  const previewRequest = useRef(0);

  useEffect(() => {
    setAdditionalRows([]);
    setNextCursor(documents.data?.pagination.nextCursor ?? null);
  }, [documents.data, staffId]);

  const openDocument = async (document: SuperAdminStaffDocument) => {
    const request = ++previewRequest.current;
    setOpeningId(document.id);
    setPreview({
      documentId: document.id,
      title: document.documentName,
      url: null,
      isLoading: true,
      error: null,
    });
    try {
      const result = await loadView({ staffId, documentId: document.id }).unwrap();
      if (previewRequest.current !== request) return;
      setPreview((current) => current?.documentId === document.id
        ? { ...current, url: result.viewUrl, isLoading: false }
        : current);
    } catch {
      if (previewRequest.current !== request) return;
      setPreview((current) => current?.documentId === document.id
        ? { ...current, isLoading: false, error: "We couldn’t open this document. Please try again." }
        : current);
    } finally {
      if (previewRequest.current === request) setOpeningId(null);
    }
  };

  const handlePreviewOpenChange = (open: boolean) => {
    if (open) return;
    previewRequest.current += 1;
    setOpeningId(null);
    setPreview(null);
  };

  const loadNextPage = async () => {
    if (!nextCursor) return;
    setListError(null);
    try {
      const result = await loadMore({ staffId, cursor: nextCursor }).unwrap();
      setAdditionalRows((current) => [...current, ...result.documents]);
      setNextCursor(result.pagination.nextCursor);
    } catch {
      setListError("We couldn’t load more documents. Please try again.");
    }
  };

  if (documents.isLoading) return <div className="mt-8 space-y-3" aria-label="Loading staff documents"><Skeleton className="h-20 w-full rounded-xl" /><Skeleton className="h-20 w-full rounded-xl" /></div>;
  if (documents.isError) return <p role="alert" className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">We couldn’t load this employee’s documents.</p>;
  const rows = [...(documents.data?.documents ?? []), ...additionalRows];

  return (
    <section className="mt-8 space-y-3" aria-label="Staff documents">
      {listError ? <p role="alert" className="text-sm text-red-600">{listError}</p> : null}
      {rows.length === 0 ? <div className="rounded-xl border border-[#e2e6e6] bg-white p-10 text-center text-sm text-[#808081]">No documents are available for this employee.</div> : rows.map((document) => (
        <div key={document.id} className="flex flex-col gap-4 rounded-xl border border-[#e2e6e6] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#e8f7f7]"><FileText className="h-5 w-5 text-[#008f92]" aria-hidden="true" /></span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#10141a]">{document.documentName}</p><p className="mt-1 text-xs text-[#808081]">{document.expiryDate ? `Expires ${new Date(document.expiryDate).toLocaleDateString()}` : document.documentType || "Document"}</p></div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {isExpired(document.expiryDate) ? <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Expired</Badge> : null}
            {document.canView ? <Button type="button" variant="outline" size="sm" disabled={openingId === document.id} onClick={() => void openDocument(document)}>{openingId === document.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "View"}</Button> : null}
          </div>
        </div>
      ))}
      {nextCursor ? <div className="flex justify-center pt-2"><Button type="button" variant="outline" disabled={morePage.isFetching} onClick={() => void loadNextPage()}>{morePage.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}</Button></div> : null}
      <DocumentPreviewModal
        open={preview !== null}
        onOpenChange={handlePreviewOpenChange}
        title={preview?.title ?? "Document preview"}
        url={preview?.url}
        isLoading={preview?.isLoading}
        error={preview?.error}
      />
    </section>
  );
}
