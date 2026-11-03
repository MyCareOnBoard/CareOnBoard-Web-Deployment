import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeClientImportReview, listClientImportReviews, type ClientImportReviewRow } from "@/lib/api/client-import-review";
import type { Client } from "@/lib/api/clients";
import { Routes } from "@/routes/constants";
import { useToast } from "@/hooks/use-toast";

/** Fired after a folder import or a review so every review list on the page refreshes. */
export const CLIENT_IMPORT_REVIEW_EVENT = "careonboard:client-import-review";
export const IMPORT_REVIEW_PARAM = "importReview";

export function announceClientImportReviewChange() {
  window.dispatchEvent(new Event(CLIENT_IMPORT_REVIEW_EVENT));
}

const programLabel = (row: ClientImportReviewRow) => row.servicePrograms.includes("sc") ? "SC" : (row.type ?? row.servicePrograms[0] ?? "").toUpperCase();

function NotesList({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12px] leading-5 text-[#4b6266]">
    {notes.map(note => <li key={note} className="[overflow-wrap:anywhere]">{note}</li>)}
  </ul>;
}

const PAGE_SIZE = 8;

/**
 * Clients page banner: folder-imported clients that nobody has reviewed yet. A big batch
 * stays compact: one line per client, search, and pages of 8 in a capped, scrollable box.
 * Opens on its own when the page is reached from the import notification (?importReview=1).
 */
export function ClientImportReviewBanner({ program }: { program?: "ddd" | "hha" | "sc" | null }) {
  const [searchParams] = useSearchParams();
  const fromNotification = searchParams.get(IMPORT_REVIEW_PARAM) === "1";
  const [rows, setRows] = useState<ClientImportReviewRow[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(fromNotification);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const { toast } = useToast();

  const load = useCallback((signal?: AbortSignal) => {
    listClientImportReviews(signal)
      .then(data => { setRows(data.clients); setTruncated(data.truncated); setFailed(false); })
      .catch(error => { if (!signal?.aborted && (error as { code?: string })?.code !== "ERR_CANCELED") setFailed(true); });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const refresh = () => load();
    window.addEventListener(CLIENT_IMPORT_REVIEW_EVENT, refresh);
    return () => { controller.abort(); window.removeEventListener(CLIENT_IMPORT_REVIEW_EVENT, refresh); };
  }, [load]);

  useEffect(() => {
    if (fromNotification) setOpen(true);
  }, [fromNotification]);

  const visible = useMemo(() => rows.filter(row => !program || (program === "sc" ? row.servicePrograms.includes("sc") : !row.servicePrograms.includes("sc") && (row.type ?? "ddd") === program)), [rows, program]);
  const needle = query.trim().toLowerCase();
  const matches = useMemo(() => needle ? visible.filter(row => `${row.name} ${row.folderName}`.toLowerCase().includes(needle)) : visible, [visible, needle]);
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = matches.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  useEffect(() => {
    if (fromNotification && visible.length) ref.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }, [fromNotification, visible.length]);

  if (failed && fromNotification) return <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">The list of imported clients could not be loaded. Reload the page to try again.</p>;
  if (!visible.length) return null;

  const markReviewed = async (row: ClientImportReviewRow) => {
    setBusy(row.id);
    try {
      await completeClientImportReview(row.id);
      setRows(previous => previous.filter(item => item.id !== row.id));
      toast({ title: "Marked as reviewed", description: `${row.name} was removed from the review list.`, variant: "success" });
    } catch {
      toast({ title: "Could not mark as reviewed", description: "Try again in a moment.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const count = `${visible.length}${truncated ? "+" : ""}`;
  return <section ref={ref} aria-labelledby="client-import-review-heading" className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="client-import-review-heading" className="text-[14px] font-semibold text-[#10141a]">
            {visible.length === 1 ? "1 client from a folder upload needs review" : `${count} clients from a folder upload need review`}
          </h2>
          <p className="text-[12px] leading-5 text-[#5c4a1e]">Saved as pending from their documents. Check each profile, fill what is missing, then mark it reviewed.</p>
        </div>
      </div>
      <Button type="button" variant="outline" className="h-10 border-amber-400 bg-white" aria-expanded={open} aria-controls="client-import-review-list" onClick={() => setOpen(value => !value)}>
        {open ? "Hide list" : "Review clients"}
      </Button>
    </div>
    {open && <div id="client-import-review-list" className="mt-3 rounded-xl border border-amber-200 bg-white">
      {visible.length > PAGE_SIZE && <div className="border-b border-amber-100 p-2">
        <label className="relative block">
          <span className="sr-only">Search imported clients</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a9c]" aria-hidden="true" />
          <Input value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Search by name or folder" className="h-10 pl-9 text-[13px]" />
        </label>
      </div>}
      {!matches.length ? <p className="px-3 py-4 text-[13px] text-[#617579]">No imported clients match “{query.trim()}”.</p> : <ul aria-label="Imported clients to review" className="max-h-[360px] divide-y divide-amber-100 overflow-y-auto">
        {pageRows.map(row => {
          const showNotes = expanded === row.id;
          return <li key={row.id} className="px-3 py-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="min-w-0 flex-1">
                <Link className="text-[13px] font-semibold text-[#00838a] underline-offset-2 hover:underline [overflow-wrap:anywhere]" to={Routes.agency.clientDetails.replace(":clientId", row.id)}>{row.name}</Link>
                <span className="ml-2 text-[12px] text-[#617579]">{[programLabel(row), row.folderName].filter(Boolean).join(" · ")}</span>
              </div>
              {row.notes.length > 0 && <button type="button" className="min-h-[36px] rounded-lg px-2 text-[12px] font-medium text-amber-800 hover:bg-amber-50" aria-expanded={showNotes} aria-label={`${showNotes ? "Hide" : "Show"} what to check for ${row.name}`} onClick={() => setExpanded(showNotes ? null : row.id)}>
                {row.notes.length === 1 ? "1 to check" : `${row.notes.length} to check`}
              </button>}
              <Button type="button" variant="outline" className="h-9 gap-1.5 px-3 text-[12px]" disabled={busy === row.id} onClick={() => void markReviewed(row)} aria-label={`Mark ${row.name} as reviewed`}>
                {busy === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}Reviewed
              </Button>
            </div>
            {showNotes && <NotesList notes={row.notes} />}
          </li>;
        })}
      </ul>}
      {pageCount > 1 && <div className="flex items-center justify-between gap-2 border-t border-amber-100 px-3 py-2 text-[12px] text-[#617579]">
        <span>{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, matches.length)} of {matches.length}</span>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" className="h-9 w-9 p-0" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></Button>
          <Button type="button" variant="ghost" className="h-9 w-9 p-0" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
      </div>}
      {truncated && <p className="border-t border-amber-100 px-3 py-2 text-[12px] text-[#617579]">Showing the first 100. Mark some reviewed to see the rest.</p>}
    </div>}
  </section>;
}

/** Client page notice for a folder-imported client that still needs review. */
export function ClientImportReviewNotice({ client, onReviewed }: { client: Pick<Client, "id" | "importReview"> | null | undefined; onReviewed?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  if (!client?.id || client.importReview?.source !== "folder_upload" || client.importReview.status !== "needs_review" || done) return null;
  const markReviewed = async () => {
    setBusy(true);
    setError("");
    try {
      await completeClientImportReview(client.id);
      setDone(true);
      announceClientImportReviewChange();
      onReviewed?.();
    } catch {
      setError("Could not mark as reviewed. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };
  return <section aria-label="Imported client review" className="my-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-[14px] font-semibold text-[#10141a]">Created from a folder upload{client.importReview.folderName ? ` (${client.importReview.folderName})` : ""}</h2>
        <p className="text-[12px] leading-5 text-[#5c4a1e]">This client was filled in from their documents without the form. Check the details against the documents before activating.</p>
        <NotesList notes={client.importReview.notes ?? []} />
      </div>
      <Button type="button" variant="outline" className="h-10 gap-1.5 bg-white" disabled={busy} onClick={() => void markReviewed()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}Mark reviewed
      </Button>
    </div>
    {error && <p role="alert" className="mt-2 text-[12px] font-medium text-red-600">{error}</p>}
  </section>;
}
