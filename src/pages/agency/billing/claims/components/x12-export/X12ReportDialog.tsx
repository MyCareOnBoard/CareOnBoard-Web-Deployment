import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import BillingCornerModalHeader from "@/pages/agency/billing/components/BillingCornerModalHeader";
import { BILLING_SECONDARY_BUTTON_CLASS } from "@/pages/agency/billing/components/billingModalStyles";
import { saveHtmlReport } from "@/lib/api/claims";

type X12ReportDialogProps = {
  title: string;
  fileName: string;
  /** Loads the report HTML; or pass `html` when it is already here. */
  load?: () => Promise<string>;
  html?: string;
  onClose: () => void;
};

/**
 * Shows a validation report in a sandboxed frame: no scripts and its own origin, so
 * the report can never act as a page of this app. Download saves it for printing.
 */
export default function X12ReportDialog({ title, fileName, load, html: givenHtml, onClose }: X12ReportDialogProps) {
  const [html, setHtml] = useState(givenHtml ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (givenHtml || !load) return undefined;
    let cancelled = false;
    load()
      .then((text) => {
        if (!cancelled) setHtml(text);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the report. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [givenHtml, load]);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[90dvh] w-[calc(100vw-32px)] max-w-[1100px] flex-col gap-0 rounded-[20px] border border-[#e5e5e6] bg-white p-0"
      >
        <BillingCornerModalHeader
          title={title}
          description="Contains patient information. Keep it private."
          onClose={onClose}
        />
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pb-6 pt-4">
          {error ? (
            <p role="alert" className="text-[14px] text-[#d92d20]">
              {error}
            </p>
          ) : html ? (
            <iframe
              title={title}
              sandbox=""
              srcDoc={html}
              className="min-h-0 w-full flex-1 rounded-[12px] border border-[#e5e5e6]"
            />
          ) : (
            <p className="text-[14px] text-[#808081]">Loading report…</p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!html}
              onClick={() => saveHtmlReport(html, fileName)}
              className={`${BILLING_SECONDARY_BUTTON_CLASS} gap-2`}
            >
              <Download className="h-4 w-4" />
              Download report
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
