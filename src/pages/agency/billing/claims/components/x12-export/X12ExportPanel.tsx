import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, CheckCircle2, ChevronDown, Download, FileSearch, FileText, Settings, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { menuItemClassName } from "@/components/ui/dot-grid-menu";
import { useToast } from "@/hooks/use-toast";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import {
  downloadX12Batch,
  downloadX12RunZip,
  getX12BatchReport,
  getX12Run,
  getX12RunReport,
  listX12Batches,
  listX12Runs,
  markX12BatchUploaded,
  validateX12Batch,
  type BillingClaimListItem,
  type X12Batch,
  type X12Run,
} from "@/lib/api/claims";
import EdiSettingsDialog from "./EdiSettingsDialog";
import X12BatchRunDialog from "./X12BatchRunDialog";
import X12ExportDialog from "./X12ExportDialog";
import X12ReportDialog from "./X12ReportDialog";
import X12ResponseUploadDialog from "./X12ResponseUploadDialog";
import X12StatusBadge from "./X12StatusBadge";
import X12ValidateFileDialog from "./X12ValidateFileDialog";
import { VALIDATION_LABELS, formatCents, getExportableClaims, submissionLabel } from "./x12ExportUtils";

type X12ExportPanelProps = {
  claims: readonly BillingClaimListItem[];
  /** Changes when a file is made elsewhere (the claim report), to reload the list. */
  refreshKey?: number;
  /** Called when files or claims changed (export, batch, NJMMIS response), to reload claims. */
  onExported?: () => void;
  /** Opens a claim's report from the "claims need fixing" list. */
  onOpenReport?: (claim: BillingClaimListItem) => void;
};

const RECENT_BATCH_LIMIT = 5;
const RECENT_RUN_LIMIT = 3;
const RUN_POLL_MS = 5000;

type ReportView = { title: string; fileName: string; load?: () => Promise<string>; html?: string };

const ROW_BUTTON_CLASS =
  "inline-flex h-[36px] shrink-0 cursor-pointer items-center gap-2 rounded-full border border-[#e5e5e6] px-3 text-[13px] font-medium text-[#10141a] hover:bg-[#eef4f5] disabled:cursor-not-allowed disabled:opacity-60";
// Header actions share one height and shape. On phones they stack full width with the main action first.
const HEADER_BUTTON_BASE =
  "inline-flex h-[40px] w-full shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-[14px] font-medium transition-colors sm:order-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 sm:w-auto";
const HEADER_BUTTON_CLASS = `${HEADER_BUTTON_BASE} border border-[#e5e5e6] bg-white text-[#10141a] hover:bg-[#eef4f5] data-[state=open]:bg-[#eef4f5]`;
const PRIMARY_HEADER_BUTTON_CLASS = `${HEADER_BUTTON_BASE} order-first bg-[#00b4b8] text-white hover:bg-[#009da1]`;

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function runWorking(run: X12Run): boolean {
  return run.status === "queued" || run.status === "running";
}

export default function X12ExportPanel({ claims, refreshKey = 0, onExported, onOpenReport }: X12ExportPanelProps) {
  const { agencyId, mode } = useOperationalAgency();
  const { toast } = useToast();
  const [batches, setBatches] = useState<X12Batch[]>([]);
  const [runs, setRuns] = useState<X12Run[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [dialog, setDialog] = useState<"export" | "run" | "settings" | "responses" | "validate" | null>(null);
  const [report, setReport] = useState<ReportView | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  // Runs started here that should download once the background job finishes.
  const awaitingRef = useRef<Set<string>>(new Set());

  const loadLists = useCallback(async () => {
    if (!agencyId) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoadingBatches(true);
    const context = { agencyId };
    const scope = { ...(mode ? { mode } : {}), signal: controller.signal };
    // The lists are a convenience; the export itself still works without them.
    const [nextBatches, nextRuns] = await Promise.all([
      listX12Batches({ context, limit: RECENT_BATCH_LIMIT, ...scope }).catch(() => null),
      listX12Runs({ context, limit: RECENT_RUN_LIMIT, ...scope }).catch(() => null),
    ]);
    if (controller.signal.aborted) return;
    if (nextBatches) setBatches(nextBatches);
    if (nextRuns) setRuns(nextRuns);
    setLoadingBatches(false);
  }, [agencyId, mode]);

  useEffect(() => {
    void loadLists();
    return () => requestRef.current?.abort();
  }, [loadLists, refreshKey]);

  const downloadRun = useCallback(
    async (run: X12Run) => {
      if (!agencyId) return;
      setBusyId(run.id);
      try {
        await downloadX12RunZip({ context: { agencyId }, run });
      } catch {
        toast({ title: "Download failed", description: "Couldn't download the zip. Try again.", variant: "destructive" });
      } finally {
        setBusyId(null);
      }
    },
    [agencyId, toast],
  );

  const announceRun = useCallback(
    (run: X12Run) => {
      if (run.status === "failed") {
        toast({ title: "837P batch failed", description: run.error?.message || "Try again.", variant: "destructive" });
        return;
      }
      const failed = run.validation?.status === "failed";
      toast({
        title: failed ? "837P batch failed validation" : "837P batch ready",
        description: failed
          ? "Its claims were released. Open the report to see what to fix."
          : `${run.claimCount} ${run.claimCount === 1 ? "claim" : "claims"}, ${formatCents(run.totalChargeCents)}.`,
        ...(failed ? { variant: "destructive" as const } : {}),
      });
      if (!failed && run.files.some((file) => file.included)) void downloadRun(run);
    },
    [downloadRun, toast],
  );

  // Big batches finish in the background: poll them until they're done.
  const workingIds = runs.filter(runWorking).map((run) => run.id).join(",");
  useEffect(() => {
    if (!agencyId || !workingIds) return undefined;
    const controller = new AbortController();
    const timer = window.setInterval(async () => {
      const updated = await Promise.all(
        workingIds.split(",").map((runId) =>
          getX12Run({ context: { agencyId }, runId, signal: controller.signal }).catch(() => null),
        ),
      );
      if (controller.signal.aborted) return;
      const finished = updated.filter((run): run is X12Run => Boolean(run && !runWorking(run)));
      if (finished.length === 0) return;
      for (const run of finished) {
        if (awaitingRef.current.delete(run.id)) announceRun(run);
      }
      void loadLists();
      onExported?.();
    }, RUN_POLL_MS);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [agencyId, announceRun, loadLists, onExported, workingIds]);

  const download = async (batch: X12Batch) => {
    if (!agencyId) return;
    setBusyId(batch.id);
    try {
      await downloadX12Batch({ context: { agencyId }, batch });
    } catch {
      toast({ title: "Download failed", description: "Couldn't download the 837P file. Try again.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const recheck = async (batch: X12Batch) => {
    if (!agencyId) return;
    setBusyId(batch.id);
    try {
      const updated = await validateX12Batch({ context: { agencyId }, batchId: batch.id });
      setBatches((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (updated.status === "invalid") onExported?.();
    } catch {
      toast({ title: "Check failed", description: "Couldn't check the 837P file. Try again.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const markUploaded = async (batch: X12Batch) => {
    if (!agencyId) return;
    setBusyId(batch.id);
    try {
      const { uploadedAt } = await markX12BatchUploaded({ context: { agencyId }, batchId: batch.id });
      setBatches((current) => current.map((item) => (item.id === batch.id ? { ...item, uploadedAt } : item)));
    } catch {
      toast({ title: "Couldn't save", description: "Try marking the file again.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const openBatchReport = (batch: X12Batch) => {
    if (!agencyId) return;
    setReport({
      title: `Validation report: ${batch.fileName}`,
      fileName: `${batch.fileName.replace(/\.[^.]+$/, "")}-validation.html`,
      load: () => getX12BatchReport({ context: { agencyId }, batchId: batch.id }),
    });
  };

  const openRunReport = (run: X12Run) => {
    if (!agencyId) return;
    setReport({
      title: "Batch validation report",
      fileName: `${(run.zipFileName ?? `837P-batch-${run.id}`).replace(/\.zip$/, "")}-validation.html`,
      load: () => getX12RunReport({ context: { agencyId }, runId: run.id }),
    });
  };

  const handleExported = (batch: X12Batch) => {
    void loadLists();
    onExported?.();
    if (batch.status === "invalid") {
      toast({
        title: "837P file failed validation",
        description: "The claims were not locked. Open the report on the file to see what to fix.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "837P file created",
      description: `${batch.claimCount} ${batch.claimCount === 1 ? "claim" : "claims"} in ${batch.fileName}.`,
    });
    void download(batch);
  };

  const handleRunCreated = (run: X12Run, queued: boolean) => {
    void loadLists();
    onExported?.();
    if (queued) {
      awaitingRef.current.add(run.id);
      toast({
        title: "Creating 837P batch",
        description: `${run.requestedClaimCount} claims. This takes a minute; the zip downloads when it's ready.`,
      });
      return;
    }
    announceRun(run);
  };

  const pendingCount = getExportableClaims(claims).length;
  const closeDialog = () => setDialog(null);
  const openSettings = () => setDialog("settings");

  return (
    <section className="rounded-[20px] border border-[#e5e5e6] bg-white p-5 sm:p-6" aria-labelledby="x12-export-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 id="x12-export-title" className="text-[18px] font-semibold text-[#10141a]">
            837P files for NJ Medicaid
          </h2>
          <p className="mt-1 text-[14px] text-[#808081]">
            {pendingCount === 0
              ? "No pending claims waiting for a file."
              : `${pendingCount} pending ${pendingCount === 1 ? "claim is" : "claims are"} not in a file yet.`}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:shrink-0 sm:items-center sm:gap-3">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button type="button" className={`group ${HEADER_BUTTON_CLASS}`}>
                More tools
                <ChevronDown
                  className="h-4 w-4 text-[#808081] transition-transform group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-[100] min-w-[230px] overflow-hidden rounded-xl border-0 bg-white p-0 py-1 shadow-lg"
            >
              <DropdownMenuItem className={menuItemClassName} onSelect={() => setDialog("validate")}>
                <FileSearch className="mr-2 h-4 w-4 text-[#808081]" aria-hidden />
                Validate a file
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemClassName} onSelect={() => setDialog("responses")}>
                <Upload className="mr-2 h-4 w-4 text-[#808081]" aria-hidden />
                Upload NJMMIS response
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-[#e5e5e6]" />
              <DropdownMenuItem className={menuItemClassName} onSelect={openSettings}>
                <Settings className="mr-2 h-4 w-4 text-[#808081]" aria-hidden />
                837P settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button type="button" onClick={() => setDialog("export")} className={HEADER_BUTTON_CLASS}>
            <FileText className="h-4 w-4" aria-hidden />
            Create 837P file
          </button>
          <button type="button" onClick={() => setDialog("run")} className={PRIMARY_HEADER_BUTTON_CLASS}>
            <Archive className="h-4 w-4" aria-hidden />
            Create zip batch
          </button>
        </div>
      </div>

      {runs.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-[14px] font-semibold text-[#10141a]">Zip batches</h3>
          <ul className="mt-2 divide-y divide-[#e5e5e6] border-t border-[#e5e5e6]">
            {runs.map((run) => (
              <li key={run.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-[#10141a]">
                    {formatDate(run.createdAt)}
                    {runWorking(run) ? (
                      <X12StatusBadge label="Creating…" tone="neutral" />
                    ) : run.status === "failed" ? (
                      <X12StatusBadge label="Failed" tone="danger" title={run.error?.message} />
                    ) : run.validation ? (
                      <X12StatusBadge {...VALIDATION_LABELS[run.validation.status]} />
                    ) : null}
                  </p>
                  <p className="text-[13px] text-[#808081]">
                    {runWorking(run)
                      ? `${run.requestedClaimCount} claims`
                      : run.status === "failed"
                        ? run.error?.message || "The batch couldn't be created."
                        : `${run.files.length} ${run.files.length === 1 ? "file" : "files"} · ${run.claimCount} ${
                            run.claimCount === 1 ? "claim" : "claims"
                          } · ${formatCents(run.totalChargeCents)} · ${run.usageIndicator === "P" ? "Production" : "Test"}${
                            run.skippedClaimCount ? ` · ${run.skippedClaimCount} left out` : ""
                          }`}
                  </p>
                </div>
                {run.status === "ready" ? (
                  <div className="flex flex-wrap gap-2">
                    {run.hasReport ? (
                      <button type="button" onClick={() => openRunReport(run)} className={ROW_BUTTON_CLASS}>
                        <FileSearch className="h-4 w-4" />
                        View report
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void downloadRun(run)}
                      disabled={busyId === run.id}
                      className={ROW_BUTTON_CLASS}
                    >
                      <Download className="h-4 w-4" />
                      {busyId === run.id ? "Downloading…" : "Download zip"}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {batches.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-[14px] font-semibold text-[#10141a]">Recent files</h3>
          <ul className="mt-2 divide-y divide-[#e5e5e6] border-t border-[#e5e5e6]">
            {batches.map((batch) => {
              const submission = submissionLabel(batch);
              const validation = batch.validation;
              const canRecheck = batch.status === "ready" && (!validation || validation.status === "error" || validation.status === "skipped");
              return (
                <li key={batch.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-[#10141a]">
                      <span className="truncate">{batch.fileName}</span>
                      {validation ? (
                        <X12StatusBadge {...VALIDATION_LABELS[validation.status]} title={validation.message ?? undefined} />
                      ) : null}
                      {submission ? (
                        <X12StatusBadge {...submission} title={batch.submission?.errors.join("\n") || undefined} />
                      ) : null}
                    </p>
                    <p className="text-[13px] text-[#808081]">
                      {formatDate(batch.createdAt)} · {batch.claimCount} {batch.claimCount === 1 ? "claim" : "claims"} ·{" "}
                      {formatCents(batch.totalChargeCents)} · {batch.usageIndicator === "P" ? "Production" : "Test"}
                      {batch.status === "failed" ? " · Failed" : ""}
                      {batch.status === "invalid" ? " · Claims released for fixing" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {validation?.hasReport ? (
                      <button type="button" onClick={() => openBatchReport(batch)} className={ROW_BUTTON_CLASS}>
                        <FileSearch className="h-4 w-4" />
                        View report
                      </button>
                    ) : null}
                    {canRecheck ? (
                      <button
                        type="button"
                        onClick={() => void recheck(batch)}
                        disabled={busyId === batch.id}
                        className={ROW_BUTTON_CLASS}
                      >
                        {busyId === batch.id ? "Checking…" : "Check again"}
                      </button>
                    ) : null}
                    {batch.status === "ready" && !batch.uploadedAt && !batch.submission ? (
                      <button
                        type="button"
                        onClick={() => void markUploaded(batch)}
                        disabled={busyId === batch.id}
                        className={ROW_BUTTON_CLASS}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark as uploaded
                      </button>
                    ) : null}
                    {batch.status === "ready" ? (
                      <button
                        type="button"
                        onClick={() => void download(batch)}
                        disabled={busyId === batch.id}
                        className={ROW_BUTTON_CLASS}
                      >
                        <Download className="h-4 w-4" />
                        {busyId === batch.id ? "Working…" : "Download"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : loadingBatches ? (
        <p className="mt-4 text-[13px] text-[#808081]">Loading recent files…</p>
      ) : null}

      {dialog === "export" ? (
        <X12ExportDialog
          open
          claims={claims}
          onClose={closeDialog}
          onOpenSettings={openSettings}
          onExported={handleExported}
          onOpenReport={
            onOpenReport
              ? (claim) => {
                  closeDialog();
                  onOpenReport(claim);
                }
              : undefined
          }
        />
      ) : null}

      {dialog === "run" ? (
        <X12BatchRunDialog
          claims={claims}
          onClose={closeDialog}
          onOpenSettings={openSettings}
          onCreated={handleRunCreated}
          onOpenReport={
            onOpenReport
              ? (claim) => {
                  closeDialog();
                  onOpenReport(claim);
                }
              : undefined
          }
        />
      ) : null}

      {dialog === "responses" ? (
        <X12ResponseUploadDialog
          onClose={closeDialog}
          onImported={() => {
            void loadLists();
            onExported?.();
          }}
        />
      ) : null}

      {dialog === "validate" ? (
        <X12ValidateFileDialog
          onClose={closeDialog}
          onOpenReport={(html, fileName) => setReport({ title: "Validation report", fileName, html })}
        />
      ) : null}

      {dialog === "settings" ? (
        <EdiSettingsDialog open onClose={closeDialog} onSaved={() => toast({ title: "837P settings saved" })} />
      ) : null}

      {report ? (
        <X12ReportDialog
          title={report.title}
          fileName={report.fileName}
          load={report.load}
          html={report.html}
          onClose={() => setReport(null)}
        />
      ) : null}
    </section>
  );
}
