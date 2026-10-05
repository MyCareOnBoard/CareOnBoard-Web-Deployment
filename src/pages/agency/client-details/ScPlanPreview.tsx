import { useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./sc-plan-print.css";

export default function ScPlanPreview({ children, onSave, saveDisabled, downloadDisabled, busy, dirty }: {
  children: ReactNode; onSave: () => void; saveDisabled: boolean; downloadDisabled: boolean; busy: boolean; dirty: boolean;
}) {
  const helpId = useId();
  const [printError, setPrintError] = useState("");
  function download() {
    setPrintError("");
    try { window.print(); }
    catch { setPrintError("Could not open printing. Please try again. Your entries are still here."); }
  }
  return <div className="flex min-h-0 min-w-0 flex-col bg-[#e4e6eb]">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-[#f1f2f5] px-4 py-3 text-xs text-[#4b5563]">
      <div><strong className="block">Live Document Preview</strong><p id={helpId} className="mt-1">Print or save as PDF{dirty ? " · Includes unsaved changes" : ""}</p></div>
      <div className="flex gap-2" role="group" aria-label="Document actions">
        <Button type="button" className="rounded-[3px] bg-[#008b90] hover:bg-[#00767a]" disabled={saveDisabled} onClick={onSave}><Save className="size-4" aria-hidden="true" />{busy ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="outline" className="rounded-[3px]" disabled={downloadDisabled} aria-describedby={helpId} onClick={download}><Download className="size-4" aria-hidden="true" />Download</Button>
      </div>
    </div>
    {printError && <p role="alert" className="px-4 py-2 text-sm text-[#ad182d]">{printError}</p>}
    <div className="min-h-0 max-h-[690px] flex-1 overflow-auto p-4 lg:max-h-none lg:p-8">{children}</div>
    {!downloadDisabled && createPortal(<div className="sc-plan-print" style={{ display: "none" }}>{children}</div>, document.body)}
  </div>;
}
