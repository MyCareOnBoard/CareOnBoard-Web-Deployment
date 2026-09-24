import { useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerField } from "@/pages/shared/client-management/components/forms/formControls";

type Document = {
  name: string;
  type: string;
  version: string;
  status: string;
  effective: string;
  expires: string;
  source: string;
  provider?: string;
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
const allowedExtensions = /\.(pdf|png|docx?)$/i;
const maxFileSize = 50 * 1024 * 1024;

export default function SupportCoordinatorDocumentsTab({ sample }: { sample: boolean }) {
  const [addedDocuments, setAddedDocuments] = useState<Document[]>([]);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState("");
  const [source, setSource] = useState("DDD / iRecord");
  const [effectiveDate, setEffectiveDate] = useState<Date>();
  const [expirationDate, setExpirationDate] = useState<Date>();
  const [error, setError] = useState("");
  const documents = sample ? [...sampleDocuments, ...addedDocuments] : addedDocuments;

  const close = () => setOpen(false);
  const selectFile = (files: FileList | null) => {
    const selected = files?.[0];
    if (!selected) return;
    if (!allowedExtensions.test(selected.name)) {
      setFile(null);
      setError("Choose a PDF, PNG, or Word document.");
    } else if (selected.size > maxFileSize) {
      setFile(null);
      setError("Choose a file smaller than 50 MB.");
    } else {
      setFile(selected);
      setError("");
    }
  };

  return <section aria-labelledby="sc-documents-heading">
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="sc-documents-heading" className="text-2xl font-semibold text-[#10141a]">Document Control</h2>
        <p className="mt-1 text-sm text-[#4b5563]">Every document with source, version, effective dates, and audit trail.</p>
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
            <td className="px-3 py-3 align-middle"><span className="font-medium text-[#bc1024]">{document.name}</span>{document.provider && <span className="mt-1 block text-xs text-[#8a929e]">{document.provider}</span>}</td>
            <td className="px-3 py-3 text-[#5e6672]">{document.type}</td>
            <td className="px-3 py-3 text-[#5e6672]">{document.version}</td>
            <td className="px-3 py-3"><span className="inline-block rounded bg-[#e8fff2] px-1.5 py-0.5 text-xs font-semibold text-[#047857]">{document.status}</span></td>
            <td className="px-3 py-3 text-[#5e6672]">{document.effective}</td>
            <td className="px-3 py-3 text-[#5e6672]">{document.expires}</td>
            <td className="px-3 py-3 text-[#7a8390]">{document.source}</td>
          </tr>)}
        </tbody>
      </table>
    </div> : <p className="rounded-xl border border-dashed border-[#d1d5db] px-6 py-12 text-center text-sm text-[#6b7280]">No documents recorded yet.</p>}

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="flex max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-[455px] flex-col overflow-hidden rounded-[22px] p-5">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <DialogTitle className="text-lg font-semibold text-[#10141a]">Upload document</DialogTitle>
          <button type="button" aria-label="Close upload document" onClick={close} className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-[#f0f3f5] text-[#303741] hover:bg-[#e4ebed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b4b8]"><X className="size-4" /></button>
        </div>
        <DialogDescription className="sr-only">Add a document to this local client preview.</DialogDescription>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => {
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
          setAddedDocuments((current) => [...current, {
            name, type, version: "1", status: "Current",
            effective: effectiveDate.toLocaleDateString("en-US", dateFormat),
            expires: expirationDate?.toLocaleDateString("en-US", dateFormat) ?? "—",
            source, provider: provider || undefined,
          }]);
          close();
        }}>
          <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto py-4 pr-0.5">
            <div className="rounded bg-[#fafbfc] py-1 text-sm text-[#4b5563]"><p className="font-semibold text-[#10141a]">Upload your filled forms here</p><p>Upload your assets of choice to me.</p></div>
            <div>
              <FileUpload aria-label="Document file" label={<span className="flex flex-col gap-1"><span>{file ? file.name : <><span className="font-medium text-[#006c73]">Click to upload</span> or drag and drop</>}</span><span className="text-xs text-[#8a929e]">PDF, PNG, or Docs (Max. 50 MB)</span></span>} icon={<span className="flex size-9 items-center justify-center rounded-full bg-white text-[#59636e]"><UploadCloud className="size-5" /></span>} accept=".pdf,.png,.doc,.docx" onFilesSelected={selectFile} className="min-h-24 max-w-none border-0 bg-[#f7f7f8] px-4 py-4 [&>span]:flex-col [&>span]:gap-1.5 [&>span]:text-center" />
            </div>
            <div><label htmlFor="sc-document-type" className="mb-1.5 block text-sm font-semibold text-[#10141a]">Document type</label><Select value={type} onValueChange={(value) => { setType(value); setError(""); }}><SelectTrigger id="sc-document-type" aria-label="Document type" className="h-10 w-full rounded-lg border-[#e5e7eb] text-sm"><SelectValue placeholder="Select document type" /></SelectTrigger><SelectContent>{documentTypes.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
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
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={close} className="rounded-lg">Cancel</Button><Button type="submit" className="rounded-lg">Upload &amp; save</Button></div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </section>;
}
