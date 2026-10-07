import { useEffect, useRef, useState } from "react";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { agencyCareApi } from "@/lib/api/agencyCare";
import { useCareDialogFocus } from "./ui";

export type CarePreview = { title: string; fileName: string } & (
  | { submissionId: string; versionId: string }
  | { clientId: string; publicationId: string }
);
export function useProtectedDocument(
  scope: string,
  item: CarePreview | null,
  agencyKey?: string,
) {
  const selection = useRef({ scope, item });
  if (selection.current.item !== item) selection.current = { scope, item };
  const allowed = selection.current.scope === scope && item !== null;
  const [state, setState] = useState<{
    scope: string;
    item: CarePreview | null;
    url: string | null;
    loading: boolean;
    error?: string;
  }>({ scope, item, url: null, loading: false });
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setState({ scope, item, url: null, loading: allowed });
    if (item && allowed) {
      const options = { agencyKey, signal: controller.signal };
      const request =
        "publicationId" in item
          ? agencyCareApi.publicationContent(
              item.clientId,
              item.publicationId,
              options,
            )
          : agencyCareApi.versionContent(
              item.submissionId,
              item.versionId,
              options,
            );
      request
        .then((blob) => {
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(blob);
          setState({ scope, item, url: objectUrl, loading: false });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setState({
              scope,
              item,
              url: null,
              loading: false,
              error:
                "This exact document version is unavailable with your current access.",
            });
        });
    }
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [scope, item, agencyKey, allowed]);
  const current = allowed && state.scope === scope && state.item === item;
  return {
    url: current ? state.url : null,
    loading: allowed && (!current || state.loading),
    error: current ? state.error : undefined,
  };
}
export function ProtectedDocumentPreview({
  scope,
  item,
  agencyKey,
  onClose,
}: {
  scope: string;
  item: CarePreview | null;
  agencyKey?: string;
  onClose: () => void;
}) {
  const preview = useProtectedDocument(scope, item, agencyKey);
  const restoreFocus = useCareDialogFocus(Boolean(item));
  return (
    <DocumentPreviewModal
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          restoreFocus();
        }
      }}
      title={item?.title ?? "Document preview"}
      fileName={item?.fileName}
      url={preview.url}
      isLoading={preview.loading}
      error={preview.error}
    />
  );
}
