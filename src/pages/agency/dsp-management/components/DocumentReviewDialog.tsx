import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileCheck2, X } from "lucide-react";
import { agencyOutlineButton, agencyPrimaryButton } from "@/components/agency/AgencyListKit";
import CustomDatePicker from "@/components/ui/datePicker";
import { useToast } from "@/hooks/use-toast";
import { documentTypeLabel } from "@/lib/documentTypes";
import { reviewEmployeeDocument, setEmployeeDocumentExpiry, type EmployeeDocument } from "@/lib/api/employee-documents";

const REASON_MAX = 500;

/** "review" accepts or rejects a staff upload; "expiry" only sets the expiry date. */
export type DocumentReviewMode = "review" | "expiry";

interface DocumentReviewDialogProps {
  employeeId: string;
  employeeName: string;
  document: EmployeeDocument | null;
  mode: DocumentReviewMode;
  /** The date the expiry check has on file (YYYY-MM-DD), if any. */
  currentExpiryDateKey?: string | null;
  onClose: () => void;
  onSaved: () => void;
  onView?: (document: EmployeeDocument) => void;
}

function dateFromKey(key?: string | null): Date | null {
  if (!key || !/^\d{4}-\d{2}-\d{2}/.test(key)) return null;
  const [year, month, day] = key.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function DocumentReviewDialog({ employeeId, employeeName, document, mode, currentExpiryDateKey, onClose, onSaved, onView }: DocumentReviewDialogProps) {
  const { toast } = useToast();
  const [expiry, setExpiry] = useState<Date | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState<"accept" | "reject" | "expiry" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start from the document's own date each time the dialog opens on a document.
  useEffect(() => {
    setExpiry(dateFromKey(currentExpiryDateKey ?? document?.expiryDateKey ?? document?.expiryDate));
    setRejecting(false);
    setReason("");
    setError(null);
  }, [document?.id, currentExpiryDateKey, document?.expiryDateKey, document?.expiryDate]);

  if (!document) return null;
  const label = documentTypeLabel(document.documentName);
  const needsDate = mode === "expiry" || Boolean(document.requiresExpiry);
  const expiryKey = expiry ? format(expiry, "yyyy-MM-dd") : undefined;
  // Ties the decision to the file shown here, in case a new copy arrives meanwhile.
  const seen = document.uploadedAt ? { expectedUploadedAt: document.uploadedAt } : {};

  const run = async (action: "accept" | "reject" | "expiry") => {
    setError(null);
    if (action !== "reject" && needsDate && !expiryKey) {
      setError("Add the expiry date.");
      return;
    }
    if (action === "reject" && !reason.trim()) {
      setError("Give a reason so they know what to fix.");
      return;
    }
    setSaving(action);
    try {
      if (action === "expiry") await setEmployeeDocumentExpiry(employeeId, document.id, expiryKey!);
      else if (action === "accept") await reviewEmployeeDocument(employeeId, document.id, { decision: "accept", ...(expiryKey ? { expiryDateKey: expiryKey } : {}), ...seen });
      else await reviewEmployeeDocument(employeeId, document.id, { decision: "reject", reason: reason.trim(), ...seen });
      toast({
        title: action === "expiry" ? "Expiry date saved" : action === "accept" ? "Document accepted" : "Document rejected",
        description: action === "reject" ? `${employeeName} was asked to upload a new ${label}.` : `${label} for ${employeeName} is up to date.`,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSaving(null);
    }
  };

  const uploaded = document.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString() : null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-32px)] max-w-[480px] gap-0 overflow-hidden rounded-[20px] p-0">
        <DialogHeader className="flex-row items-start gap-3.5 border-b border-[#eceef0] px-5 py-4 text-left dark:border-white/10"><span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#dcdfe2] text-[#007679] dark:border-white/15 dark:text-[#7fd3d3]"><FileCheck2 className="h-5 w-5" /></span><div className="min-w-0 flex-1">
          <DialogTitle className="text-[22px] font-medium leading-tight text-[#10141a] dark:text-[#f4f6f7]">
            {mode === "expiry" ? "Set expiry date" : "Review document"}
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
            {label} from {employeeName}{uploaded ? `, uploaded ${uploaded}` : ""}.
          </DialogDescription>
        </div><button type="button" onClick={onClose} aria-label="Close" disabled={saving !== null} className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] text-[#4b535b] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:opacity-50 dark:border-white/15 dark:text-[#c9d1d4]"><X aria-hidden="true" className="h-4 w-4" /></button></DialogHeader>

        <div className="space-y-4 px-5 py-5">
          {mode === "review" && document.fileUrl && onView && (
            <Button type="button" variant="outline" onClick={() => onView(document)} className={agencyOutlineButton}>
              View file
            </Button>
          )}

          {!rejecting && (
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]">
                Expiry date{" "}
                {needsDate ? <span className="text-[#b42318] dark:text-[#f8a1a1]">*</span> : <span className="font-normal text-[#4b535b] dark:text-[#9aa4a8]">(optional, this document doesn't usually expire)</span>}
              </Label>
              <CustomDatePicker
                date={expiry}
                setDate={setExpiry}
                ariaLabel="Expiry date"
                placeholder="Select expiry date"
                startMonth={new Date(new Date().getFullYear() - 5, 0)}
                endMonth={new Date(new Date().getFullYear() + 15, 11)}
              />
            </div>
          )}

          {rejecting && (
            <div className="space-y-1.5">
              <Label htmlFor="document-reject-reason" className="text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]">
                Reason <span className="text-[#b42318] dark:text-[#f8a1a1]">*</span>
              </Label>
              <Textarea
                id="document-reject-reason"
                value={reason}
                maxLength={REASON_MAX}
                onChange={(event) => setReason(event.target.value)}
                placeholder="For example: the scan is blurry, or the card has expired."
                rows={3}
              />
              <p className="text-xs text-[#4b535b] dark:text-[#9aa4a8]">{employeeName} will see this and be asked to upload a new copy.</p>
            </div>
          )}

          {error && <p role="alert" className="rounded-[10px] border border-[#f0c8c4] bg-[#fdf3f2] px-3.5 py-2.5 text-[13px] text-[#b42318] dark:border-[#ff6b5e]/30 dark:bg-[#ff6b5e]/10 dark:text-[#f8a1a1]">{error}</p>}

          <div className="flex flex-wrap justify-end gap-2.5 border-t border-[#eceef0] pt-4 dark:border-white/10">
            {mode === "expiry" ? (
              <Button type="button" onClick={() => run("expiry")} disabled={saving !== null} className={`${agencyPrimaryButton} active:bg-[#003839]`}>
                {saving ? "Saving..." : "Save expiry date"}
              </Button>
            ) : rejecting ? (
              <>
                <Button type="button" variant="outline" onClick={() => { setRejecting(false); setError(null); }} disabled={saving !== null} className={agencyOutlineButton}>
                  Back
                </Button>
                <Button type="button" onClick={() => run("reject")} disabled={saving !== null} className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#b42318] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#9a1d14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#d93a2f] dark:hover:bg-[#c2322a] active:bg-[#9a1d14]">
                  {saving === "reject" ? "Rejecting..." : "Reject document"}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => { setRejecting(true); setError(null); }} disabled={saving !== null} className={`${agencyOutlineButton} border-[#f0c8c4] text-[#b42318] hover:bg-[#fdf2f1] dark:border-[#ff6b5e]/30 dark:text-[#f8a1a1] dark:hover:bg-[#ff6b5e]/10`}>
                  Reject
                </Button>
                <Button type="button" onClick={() => run("accept")} disabled={saving !== null} className={`${agencyPrimaryButton} active:bg-[#003839]`}>
                  {saving === "accept" ? "Accepting..." : "Accept"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
