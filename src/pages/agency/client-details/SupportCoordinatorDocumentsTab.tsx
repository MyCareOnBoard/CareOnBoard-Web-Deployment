import { useState } from "react";
import { format } from "date-fns";
import { Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerField } from "@/pages/shared/client-management/components/forms/formControls";
import { updateClient, uploadClientDocument, type Client, type ClientDocument } from "@/lib/api/clients";
import { clientDocumentUrl } from "@/pages/shared/client-details/components/ClientDocumentChecklist";
import { useToast } from "@/hooks/use-toast";

type Document = {
  name: string;
  type: string;
  version: string;
  status: string;
  effective: string;
  expires: string;
  source: string;
  provider?: string;
  url?: string;
  fileName?: string;
};

const sampleDocuments: Document[] = [
  { name: "NJ ISP — Plan 10.04", type: "ISP", version: "10.04", status: "Current", effective: "03/24/2026", expires: "03/23/2027", source: "iRecord" },
  { name: "NJCAT Assessment", type: "Assessment", version: "1", status: "Current", effective: "02/23/2026", expires: "—", source: "DDD / State record" },
  { name: "Tier Letter — Tier D", type: "Tier", version: "1", status: "Current", effective: "03/10/2026", expires: "—", source: "DDD / iRecord" },
  { name: "SDR — Community Inclusion", type: "SDR", version: "1", status: "Current", effective: "03/24/2026", expires: "03/23/2027", source: "DDD / iRecord", provider: "Morning Star" },
  { name: "PA — Community Inclusion (Aug 10–16)", type: "PA", version: "—", status: "Received", effective: "Aug 10", expires: "Aug 16, 2026", source: "DDD / iRecord", provider: "Morning Star" },
  { name: "Participant Enrollment Agreement", type: "Enrollment", version: "1", status: "Current", effective: "11/01/2003", expires: "—", source: "CAREONBOARD" },
];

const documentTypes = ["ISP", "Assessment", "Tier", "SDR", "PA", "Enrollment", "Other"];
const sources = ["DDD / iRecord", "DDD / State record", "iRecord", "CareOnBoard", "Other"];
const dateFormat = { month: "2-digit", day: "2-digit", year: "numeric" } as const;
const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
const maxFileSize = 10 * 1024 * 1024;

export default function SupportCoordinatorDocumentsTab({ sample, client, onSaved }: { sample: boolean; client: Client | null; onSaved: (client: Client) => void }) {
  const { toast } = useToast();
  const [addedDocuments, setAddedDocuments] = useState<Document[]>([]);
  const [preview, setPreview] = useState<Document | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<ClientDocument["category"] | "">("");
  const [source, setSource] = useState("DDD / iRecord");
  const [effectiveDate, setEffectiveDate] = useState<Date>();
  const [expirationDate, setExpirationDate] = useState<Date>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const documents = sample ? [...sampleDocuments, ...addedDocuments] : (client?.documents ?? []).map(document => ({
    name: document.title || document.fileName || "Document", type: document.category || "Other", version: "—",
    status: document.expiryDate && document.expiryDate.slice(0, 10) < format(new Date(), "yyyy-MM-dd") ? "Expired" : "On file",
    effective: document.issuedOnDate?.slice(0, 10) || "—", expires: document.expiryDate?.slice(0, 10) || "—", source: document.source || "Not recorded", provider: document.provider, url: clientDocumentUrl(document.url), fileName: document.fileName,
  }));

  const close = () => setOpen(false);
  const selectFile = (files: FileList | null) => {
    const selected = files?.[0];
    if (!selected) return;
    if (!allowedTypes.includes(selected.type)) {
      setFile(null);
      setError("Choose a PDF, PNG, or JPG file.");
    } else if (selected.size > maxFileSize) {
      setFile(null);
      setError("Choose a file smaller than 10 MB.");
    } else {
      setFile(selected);
      setError("");
    }
  };

  return <section aria-labelledby="sc-documents-heading">
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="sc-documents-heading" className="text-2xl font-semibold text-[#10141a]">Document Control</h2>
        <p className="mt-1 text-sm text-[#4b5563]">Client documents with source and effective dates.</p>
      </div>
      <Button type="button" className="h-9 rounded-lg px-3 text-sm" onClick={() => { setFile(null); setType(""); setSource("DDD / iRecord"); setEffectiveDate(undefined); setExpirationDate(undefined); setError(""); setOpen(true); }}>Upload document</Button>
    </div>

    {documents.length ? <div className="overflow-x-auto rounded-xl border border-[#e5e7eb]">
      <table className="w-full min-w-[800px] table-fixed text-left text-sm">
        <colgroup><col className="w-[24%]" /><col className="w-[13%]" /><col className="w-[11%]" /><col className="w-[10%]" /><col className="w-[14%]" /><col className="w-[14%]" /><col className="w-[14%]" /></colgroup>
        <thead className="border-b border-[#e5e7eb] bg-[#fafbfc] text-xs uppercase tracking-wide text-[#6b7280]">
          <tr>{["Document", "Type", "Version", "Status", "Effective", "Expires", "Source"].map((header) => <th key={header} scope="col" className="px-3 py-2.5 font-semibold">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#f0f1f3]">
          {documents.map((document, index) => <tr key={`${document.name}-${index}`}>
            <td className="px-3 py-3 align-middle">{document.url ? <button type="button" onClick={() => setPreview(document)} className="cursor-pointer font-medium text-[#bc1024] hover:underline">{document.name}</button> : <span className="font-medium text-[#bc1024]">{document.name}</span>}{document.provider && <span className="mt-1 block text-xs text-[#8a929e]">{document.provider}</span>}</td>
            <td className="px-3 py-3 text-[#5e6672]">{document.type}</td>
            <td className="px-3 py-3 text-[#5e6672]">{document.version}</td>
            <td className="px-3 py-3"><span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${document.status === "Expired" ? "bg-[#fff1f2] text-[#ad182d]" : "bg-[#e8fff2] text-[#047857]"}`}>{document.status}</span></td>
            <td className="px-3 py-3 text-[#5e6672]">{document.effective}</td>
            <td className="px-3 py-3 text-[#5e6672]">{document.expires}</td>
            <td className="px-3 py-3 text-[#7a8390]">{document.source}</td>
          </tr>)}
        </tbody>
      </table>
    </div> : <p className="rounded-xl border border-dashed border-[#d1d5db] px-6 py-12 text-center text-sm text-[#6b7280]">No documents recorded yet.</p>}

    <DocumentPreviewModal open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }} title={preview?.name || "Document preview"} url={preview?.url} fileName={preview?.fileName} />

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="flex max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-[455px] flex-col overflow-hidden rounded-[22px] p-5">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <DialogTitle className="text-lg font-semibold text-[#10141a]">Upload document</DialogTitle>
          <button type="button" aria-label="Close upload document" onClick={close} className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-[#f0f3f5] text-[#303741] hover:bg-[#e4ebed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b4b8]"><X className="size-4" /></button>
        </div>
        <DialogDescription className="sr-only">Upload a document to this client record.</DialogDescription>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const name = String(data.get("name") ?? "").trim();
          const provider = String(data.get("provider") ?? "").trim();
          if (!file || !type || !source || !name || !effectiveDate) {
            setError("Add a file, document type, name, and effective date.");
            return;
          }
          if (expirationDate && expirationDate < effectiveDate) {
            setError("Expiration date must be on or after the effective date.");
            return;
          }
          if (!sample && client) {
            setSaving(true);
            try {
              const uploaded = await uploadClientDocument(client.id, "support-coordination", file);
              const document: ClientDocument = { key: "scDocuments", title: name, fileName: uploaded.fileName, url: uploaded.url, category: type, source, provider: provider || undefined, issuedOnDate: format(effectiveDate, "yyyy-MM-dd"), expiryDate: expirationDate ? format(expirationDate, "yyyy-MM-dd") : undefined };
              const documents = [...(client.documents ?? []), document];
              await updateClient(client.id, { documents });
              onSaved({ ...client, documents });
              close();
              toast({ title: "Document uploaded", description: "Saved to the client record.", variant: "success" });
            } catch {
              setError("Document could not be saved. Please try again.");
            } finally { setSaving(false); }
            return;
          }
          setAddedDocuments((current) => [...current, {
            name, type, version: "1", status: "Current",
            effective: effectiveDate.toLocaleDateString("en-US", dateFormat),
            expires: expirationDate?.toLocaleDateString("en-US", dateFormat) ?? "—",
            source, provider: provider || undefined,
          }]);
          close();
          toast({ title: "Document added to preview", description: "This preview is not saved to the client record.", variant: "success" });
        }}>
          <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto py-4 pr-0.5">
            <div className="rounded bg-[#fafbfc] py-1 text-sm text-[#4b5563]"><p className="font-semibold text-[#10141a]">Upload your filled forms here</p><p>Upload your assets of choice to me.</p></div>
            <div>
              <FileUpload aria-label="Document file" label={<span className="flex flex-col gap-1"><span>{file ? file.name : <><span className="font-medium text-[#006c73]">Click to upload</span> or drag and drop</>}</span><span className="text-xs text-[#8a929e]">PDF, PNG, or JPG (Max. 10 MB)</span></span>} icon={<span className="flex size-9 items-center justify-center rounded-full bg-white text-[#59636e]"><UploadCloud className="size-5" /></span>} accept=".pdf,.png,.jpg,.jpeg" onFilesSelected={selectFile} className="min-h-24 max-w-none border-0 bg-[#f7f7f8] px-4 py-4 [&>span]:flex-col [&>span]:gap-1.5 [&>span]:text-center" />
            </div>
            <div><label htmlFor="sc-document-type" className="mb-1.5 block text-sm font-semibold text-[#10141a]">Document type</label><Select value={type} onValueChange={(value) => { setType(value as ClientDocument["category"]); setError(""); }}><SelectTrigger id="sc-document-type" aria-label="Document type" className="h-10 w-full rounded-lg border-[#e5e7eb] text-sm"><SelectValue placeholder="Select document type" /></SelectTrigger><SelectContent>{documentTypes.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
            <div><label htmlFor="sc-document-source" className="mb-1.5 block text-sm font-semibold text-[#10141a]">Source</label><Select value={source} onValueChange={setSource}><SelectTrigger id="sc-document-source" aria-label="Source" className="h-10 w-full rounded-lg border-[#e5e7eb] text-sm"><SelectValue /></SelectTrigger><SelectContent>{sources.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
            <div><label htmlFor="sc-document-name" className="mb-1.5 block text-sm font-semibold text-[#10141a]">Document name</label><Input id="sc-document-name" name="name" required maxLength={120} placeholder="e.g. Community Inclusion Services" className="h-10 rounded-lg border-[#e5e7eb] text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="[&_label]:text-sm [&_label]:font-medium [&_label]:text-[#10141a]"><DatePickerField id="sc-document-effective-date" label="Effective date" value={effectiveDate} onChange={(date) => { setEffectiveDate(date); setError(""); }} placeholder="Select date" required /></div>
              <div className="[&_label]:text-sm [&_label]:font-medium [&_label]:text-[#10141a]"><DatePickerField id="sc-document-expiration-date" label="Expiration date" value={expirationDate} onChange={(date) => { setExpirationDate(date); setError(""); }} placeholder="Select date" /></div>
            </div>
            <div><label htmlFor="sc-document-provider" className="mb-1.5 block text-sm font-semibold text-[#10141a]">Related provider</label><Input id="sc-document-provider" name="provider" maxLength={120} placeholder="e.g. Agency name" className="h-10 rounded-lg border-[#e5e7eb] text-sm" /></div>
          </div>
          <div className="shrink-0 border-t border-[#eef0f2] pt-3">
            {error && <p role="alert" className="mb-2 text-sm text-[#ad182d]">{error}</p>}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={close} className="rounded-lg">Cancel</Button><Button type="submit" disabled={saving} aria-busy={saving} className="gap-2 rounded-lg">{saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{saving ? "Saving…" : "Upload & save"}</Button></div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </section>;
}
