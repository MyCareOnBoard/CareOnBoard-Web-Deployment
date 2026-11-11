import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
      <DialogContent className="w-[480px] max-w-[calc(100vw-32px)] p-0 gap-0 overflow-hidden rounded-2xl shadow-xl">
        <DialogHeader className="px-6 pt-6 pb-4 text-left items-start">
          <DialogTitle className="text-lg font-semibold text-[#10141a]">
            {mode === "expiry" ? "Set expiry date" : "Review document"}
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--grey-200)]">
            {label} from {employeeName}{uploaded ? `, uploaded ${uploaded}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {mode === "review" && document.fileUrl && onView && (
            <Button type="button" variant="outline" size="sm" onClick={() => onView(document)}>
              View file
            </Button>
          )}

          {!rejecting && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#10141a]">
                Expiry date{" "}
                {needsDate ? <span className="text-red-500">*</span> : <span className="text-[var(--grey-200)] font-normal">(optional, this document doesn't usually expire)</span>}
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
              <Label htmlFor="document-reject-reason" className="text-sm font-medium text-[#10141a]">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="document-reject-reason"
                value={reason}
                maxLength={REASON_MAX}
                onChange={(event) => setReason(event.target.value)}
                placeholder="For example: the scan is blurry, or the card has expired."
                rows={3}
              />
              <p className="text-xs text-[var(--grey-200)]">{employeeName} will see this and be asked to upload a new copy.</p>
            </div>
          )}

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {mode === "expiry" ? (
              <Button type="button" onClick={() => run("expiry")} disabled={saving !== null} className="rounded-full bg-teal-500 hover:bg-teal-600 text-white">
                {saving ? "Saving..." : "Save expiry date"}
              </Button>
            ) : rejecting ? (
              <>
                <Button type="button" variant="outline" onClick={() => { setRejecting(false); setError(null); }} disabled={saving !== null} className="rounded-full">
                  Back
                </Button>
                <Button type="button" onClick={() => run("reject")} disabled={saving !== null} className="rounded-full bg-red-600 hover:bg-red-700 text-white">
                  {saving === "reject" ? "Rejecting..." : "Reject document"}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => { setRejecting(true); setError(null); }} disabled={saving !== null} className="rounded-full text-red-600 border-red-200 hover:bg-red-50">
                  Reject
                </Button>
                <Button type="button" onClick={() => run("accept")} disabled={saving !== null} className="rounded-full bg-teal-500 hover:bg-teal-600 text-white">
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
