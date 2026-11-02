import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { getAgencyClientById } from "@/lib/api/clients";
import { clientDocumentUrl } from "@/pages/shared/client-details/components/ClientDocumentChecklist";
import { str } from "./strValue";

/** A client document the card can open. The card never carries the file URL (cards also reach the model). */
interface DocumentRef {
  clientId: string;
  index: number;
  key?: string | null;
  fileName?: string | null;
}

interface GenericDetailField {
  label: string;
  value: string;
  badge?: boolean;
  document?: DocumentRef;
}

type PreviewState = { title: string; url?: string; fileName?: string; loading: boolean; error?: string };

/** Find the referenced file on the freshly loaded client, checking it is still the same document. */
function findClientDocumentUrl(documents: unknown, ref: DocumentRef): { url?: string; fileName?: string } {
  const list = Array.isArray(documents) ? (documents as Array<Record<string, unknown> | null>) : [];
  const same = (doc: Record<string, unknown> | null | undefined) =>
    Boolean(doc) && (!ref.key || doc!.key === ref.key) && (!ref.fileName || doc!.fileName === ref.fileName);
  const doc = same(list[ref.index]) ? list[ref.index] : list.find(same);
  return doc ? { url: clientDocumentUrl(doc.url), fileName: typeof doc.fileName === "string" ? doc.fileName : undefined } : {};
}

function DocumentLink({ field, display }: { field: GenericDetailField; display: string }) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const request = useRef<AbortController | null>(null);
  const ref = field.document!;
  const linkText = ref.fileName || "View document";

  useEffect(() => () => request.current?.abort(), []);

  const open = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPreview({ title: field.label, fileName: ref.fileName ?? undefined, loading: true });
    try {
      const client = await getAgencyClientById(ref.clientId, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const found = findClientDocumentUrl(client?.documents, ref);
      setPreview({
        title: field.label,
        url: found.url,
        fileName: found.fileName ?? ref.fileName ?? undefined,
        loading: false,
        error: found.url ? undefined : "This file is no longer on the client's record.",
      });
    } catch {
      if (!controller.signal.aborted) setPreview({ title: field.label, loading: false, error: "Couldn't load this document. Try again." });
    }
  };

  const close = (next: boolean) => {
    if (next) return;
    request.current?.abort();
    setPreview(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex max-w-full items-start gap-1 text-left text-[12px] text-[#2563eb] underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none break-words"
        aria-label={`Preview ${field.label}: ${linkText}`}
      >
        <FileText className="mt-[2px] h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="min-w-0">{linkText}</span>
      </button>
      {display && <p className="text-[11px] text-[#6b7280] break-words">{display}</p>}
      <DocumentPreviewModal
        open={preview !== null}
        onOpenChange={close}
        title={preview?.title ?? field.label}
        url={preview?.url}
        fileName={preview?.fileName}
        isLoading={preview?.loading}
        error={preview?.error}
      />
    </>
  );
}

interface GenericDetailSection {
  heading?: string;
  fields: GenericDetailField[];
}

interface GenericDetailData {
  title: string;
  icon?: string;
  sections: GenericDetailSection[];
}

function badgeClasses(value: string) {
  const v = (value || "").toLowerCase();
  if (["active", "approved", "completed", "hired", "ready_for_official_hire", "confirmed"].some(k => v.includes(k)))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["pending", "conditional", "in_progress", "under_review"].some(k => v.includes(k)))
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (["inactive", "rejected", "cancelled", "terminated", "suspended"].some(k => v.includes(k)))
    return "bg-red-50 text-red-600 border-red-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

export default function GenericDetailCard({ data }: { data: unknown }) {
  const d = data as GenericDetailData;
  const sections = Array.isArray(d?.sections) ? d.sections : [];

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
        {d?.icon && <span className="text-[14px] leading-none">{d.icon}</span>}
        <span className="text-[13px] font-semibold text-[#10141a]">{d?.title || "Details"}</span>
      </div>

      {sections.map((section, si) => (
        <div key={si} className={si > 0 ? "border-t border-[#f3f4f6]" : ""}>
          {section.heading && (
            <div className="px-4 pt-3 pb-1">
              <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                {section.heading}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3">
            {section.fields.map((field, fi) => {
              const display = str(field.value);
              return (
              <div key={fi} className="min-w-0">
                <p className="text-[11px] text-[#9ca3af] mb-0.5">{field.label}</p>
                {field.document?.clientId ? (
                  <DocumentLink field={field} display={display === "—" ? "" : display} />
                ) : field.badge ? (
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${badgeClasses(display)}`}>
                    {display || "—"}
                  </span>
                ) : (
                  <p className="text-[12px] text-[#374151] break-words">{display || "—"}</p>
                )}
              </div>
            );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
