import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import {
  downloadX12Batch,
  listX12Batches,
  type BillingClaimListItem,
  type X12Batch,
} from "@/lib/api/claims";
import EdiSettingsDialog from "./EdiSettingsDialog";
import X12ExportDialog from "./X12ExportDialog";
import { formatCents, getExportableClaims } from "./x12ExportUtils";

type X12ExportPanelProps = {
  claims: readonly BillingClaimListItem[];
  /** Changes when a file is made elsewhere (the claim report), to reload the list. */
  refreshKey?: number;
  onExported?: (batch: X12Batch) => void;
  /** Opens a claim's report from the "claims need fixing" list. */
  onOpenReport?: (claim: BillingClaimListItem) => void;
};

const RECENT_BATCH_LIMIT = 5;

function formatBatchDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function X12ExportPanel({ claims, refreshKey = 0, onExported, onOpenReport }: X12ExportPanelProps) {
  const { agencyId } = useOperationalAgency();
  const { toast } = useToast();
  const [batches, setBatches] = useState<X12Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const loadBatches = useCallback(async () => {
    if (!agencyId) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoadingBatches(true);
    try {
      const next = await listX12Batches({ context: { agencyId }, limit: RECENT_BATCH_LIMIT, signal: controller.signal });
      if (!controller.signal.aborted) setBatches(next);
    } catch {
      // The list is a convenience; the export itself still works without it.
    } finally {
      if (!controller.signal.aborted) setLoadingBatches(false);
    }
  }, [agencyId]);

  useEffect(() => {
    void loadBatches();
    return () => requestRef.current?.abort();
  }, [loadBatches, refreshKey]);

  const download = async (batch: X12Batch) => {
    if (!agencyId) return;
    setDownloadingId(batch.id);
    try {
      await downloadX12Batch({ context: { agencyId }, batch });
    } catch {
      toast({ title: "Download failed", description: "Couldn't download the 837P file. Try again.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExported = (batch: X12Batch) => {
    toast({
      title: "837P file created",
      description: `${batch.claimCount} ${batch.claimCount === 1 ? "claim" : "claims"} in ${batch.fileName}.`,
    });
    void loadBatches();
    void download(batch);
    onExported?.(batch);
  };

  const pendingCount = getExportableClaims(claims).length;

  return (
    <section className="rounded-[20px] border border-[#e5e5e6] bg-white p-5 sm:p-6" aria-labelledby="x12-export-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="x12-export-title" className="text-[18px] font-semibold text-[#10141a]">
            837P files for NJ Medicaid
          </h2>
          <p className="mt-1 text-[14px] text-[#808081]">
            {pendingCount === 0
              ? "No pending claims waiting for a file."
              : `${pendingCount} pending ${pendingCount === 1 ? "claim is" : "claims are"} not in a file yet.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex h-[44px] cursor-pointer items-center gap-2 rounded-full border border-[#e5e5e6] bg-white px-5 text-[14px] font-medium text-[#10141a] hover:bg-[#eef4f5]"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="inline-flex h-[44px] cursor-pointer items-center gap-2 rounded-full bg-[#00b4b8] px-5 text-[14px] font-medium text-white hover:bg-[#009da1]"
          >
            <FileText className="h-4 w-4" />
            Create 837P file
          </button>
        </div>
      </div>

      {batches.length > 0 ? (
        <ul className="mt-5 divide-y divide-[#e5e5e6] border-t border-[#e5e5e6]">
          {batches.map((batch) => (
            <li key={batch.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-[#10141a]">{batch.fileName}</p>
                <p className="text-[13px] text-[#808081]">
                  {formatBatchDate(batch.createdAt)} · {batch.claimCount} {batch.claimCount === 1 ? "claim" : "claims"} ·{" "}
                  {formatCents(batch.totalChargeCents)} · {batch.usageIndicator === "P" ? "Production" : "Test"}
                  {batch.status === "failed" ? " · Failed" : ""}
                </p>
              </div>
              {batch.status === "ready" ? (
                <button
                  type="button"
                  onClick={() => void download(batch)}
                  disabled={downloadingId === batch.id}
                  className="inline-flex h-[40px] shrink-0 cursor-pointer items-center gap-2 self-start rounded-full border border-[#e5e5e6] px-4 text-[14px] font-medium text-[#10141a] hover:bg-[#eef4f5] disabled:opacity-60 sm:self-auto"
                >
                  <Download className="h-4 w-4" />
                  {downloadingId === batch.id ? "Downloading…" : "Download"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : loadingBatches ? (
        <p className="mt-4 text-[13px] text-[#808081]">Loading recent files…</p>
      ) : null}

      {exportOpen ? (
        <X12ExportDialog
          open
          claims={claims}
          onClose={() => setExportOpen(false)}
          onOpenSettings={() => {
            setExportOpen(false);
            setSettingsOpen(true);
          }}
          onExported={handleExported}
          onOpenReport={
            onOpenReport
              ? (claim) => {
                  setExportOpen(false);
                  onOpenReport(claim);
                }
              : undefined
          }
        />
      ) : null}

      {settingsOpen ? (
        <EdiSettingsDialog
          open
          onClose={() => setSettingsOpen(false)}
          onSaved={() => toast({ title: "837P settings saved" })}
        />
      ) : null}
    </section>
  );
}
