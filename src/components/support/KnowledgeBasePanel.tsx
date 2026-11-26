import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { AlertCircle, BookOpen, ExternalLink, FileText, Loader2, Lock, Paperclip, Plus, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import {
  ATTACHMENT_ACCEPT,
  DOCUMENT_ACCEPT,
  MAX_ARTICLE_ATTACHMENTS,
  MAX_SUPPORT_FILE_BYTES,
  addArticleAttachment,
  archiveSupportArticle,
  createSupportArticle,
  deleteSupportDocument,
  dismissSupportGap,
  listSupportArticles,
  listSupportGaps,
  reindexSupportDocument,
  removeArticleAttachment,
  replaceSupportDocumentFile,
  supportErrorMessage,
  updateSupportArticle,
  uploadSupportDocument,
  type ArticleInput,
  type DocumentProcessingStatus,
  type SupportArticle,
  type SupportAudience,
  type SupportDesk,
  type SupportFile,
  type SupportGap,
} from "@/lib/api/support";
import { SideDrawer, fieldClass, primaryButton, secondaryButton } from "./SupportTeamDrawer";
import { formatTime, openKnowledgeFile } from "./SupportThread";

const AUDIENCE_LABELS: Record<SupportAudience, string> = { field_staff: "Field staff", agency: "Agency staff", all: "Everyone" };

export interface ArticleDraft extends ArticleInput {
  id?: string;
  attachments?: SupportFile[];
}

/** How often the list refreshes while a document is being read. */
const PROCESSING_POLL_MS = 5000;

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** A reason the file can't be sent, checked before uploading. */
export function fileProblem(file: File, accept: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!accept.split(",").includes(`.${ext}`)) return `Use one of these file types: ${accept.split(",").join(", ")}.`;
  if (file.size > MAX_SUPPORT_FILE_BYTES) return `The file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_SUPPORT_FILE_BYTES)}.`;
  if (file.size === 0) return "The file is empty.";
  return null;
}

const PROCESSING_LABELS: Record<DocumentProcessingStatus, string> = { queued: "Processing", processing: "Processing", ready: "Ready", failed: "Failed" };
const PROCESSING_STYLES: Record<DocumentProcessingStatus, string> = {
  queued: "bg-[#eef1ff] text-[#3446a8] dark:bg-[#3446a8]/25 dark:text-[#aab6ff]",
  processing: "bg-[#eef1ff] text-[#3446a8] dark:bg-[#3446a8]/25 dark:text-[#aab6ff]",
  ready: "bg-[#e3f6f6] text-[#00686b] dark:bg-[#00686b]/25 dark:text-[#7fd3d3]",
  failed: "bg-[#fdecea] text-[#b42318] dark:bg-[#b42318]/25 dark:text-[#ffb4ab]",
};

function ProcessingChip({ status, stuck = false }: { status: DocumentProcessingStatus; stuck?: boolean }) {
  if (stuck) return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", PROCESSING_STYLES.failed)}>Stuck</span>;
  const busy = status === "queued" || status === "processing";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", PROCESSING_STYLES[status])}>
      {busy && <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />}{PROCESSING_LABELS[status]}
    </span>
  );
}

/** Being read right now. A stuck document isn't, so the list stops refreshing for it. */
const isBusy = (article: SupportArticle) =>
  article.kind === "document" && !article.processing?.stuck && (article.processing?.status === "queued" || article.processing?.status === "processing");

/** One line about a document: its file, and what reading it produced. */
function documentSummary(article: SupportArticle) {
  const parts = [article.file ? `${article.file.name} · ${formatBytes(article.file.size)}` : "No file"];
  const processing = article.processing;
  if (processing?.status === "ready") parts.push(`${processing.sectionCount} ${processing.sectionCount === 1 ? "section" : "sections"}${processing.truncated ? " (first part only)" : ""}`);
  if (processing?.status === "failed" && processing.error) parts.push(processing.error);
  return parts.join(" · ");
}

/**
 * The articles and documents the desk's assistant answers from, and the questions it
 * could not answer. Agency desks edit their own and see CareOnboard's read-only; the
 * corporate desk edits platform ones. Uploaded documents are read in the background, so
 * the list refreshes while any is still processing.
 */
export function KnowledgeBasePanel({ desk, categories, draft, onDraftHandled }: {
  desk: SupportDesk;
  categories: string[];
  /** An article to open in the editor, such as one started from a case. */
  draft?: ArticleDraft | null;
  onDraftHandled?: () => void;
}) {
  const [articles, setArticles] = useState<SupportArticle[] | null>(null);
  const [gaps, setGaps] = useState<SupportGap[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ArticleDraft | null>(null);
  /** The document drawer: "new" to upload, or the document being looked at. */
  const [documentTarget, setDocumentTarget] = useState<"new" | SupportArticle | null>(null);

  const load = useCallback(async () => {
    try {
      const [loadedArticles, loadedGaps] = await Promise.all([listSupportArticles(desk), listSupportGaps(desk)]);
      setArticles(loadedArticles);
      setGaps(loadedGaps);
    } catch (error) {
      setArticles((current) => current ?? []);
      toast.error(supportErrorMessage(error, "Articles could not be loaded."));
    }
  }, [desk]);
  useEffect(() => { void load(); }, [load]);

  /** Put a changed article or document into the list without a reload. */
  const upsert = useCallback((article: SupportArticle) => {
    setArticles((current) => {
      const list = current ?? [];
      return list.some((a) => a.id === article.id) ? list.map((a) => (a.id === article.id ? article : a)) : [article, ...list];
    });
    setDocumentTarget((target) => (target && target !== "new" && target.id === article.id ? article : target));
  }, []);

  const processing = useMemo(() => (articles ?? []).some(isBusy), [articles]);
  useEffect(() => {
    if (!processing) return undefined;
    const timer = window.setTimeout(async () => {
      try {
        const next = await listSupportArticles(desk);
        setArticles(next);
        setDocumentTarget((target) => (target && target !== "new" ? next.find((a) => a.id === target.id) ?? target : target));
      } catch {
        // A missed refresh is retried on the next change; no need to alarm anyone.
      }
    }, PROCESSING_POLL_MS);
    return () => window.clearTimeout(timer);
  }, [processing, articles, desk]);

  useEffect(() => {
    if (draft) {
      setEditing(draft);
      onDraftHandled?.();
    }
  }, [draft, onDraftHandled]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (articles ?? [])
      .filter((a) => a.status !== "archived")
      .filter((a) => !term || `${a.title} ${a.body} ${a.preview ?? ""} ${a.file?.name ?? ""} ${a.tags.join(" ")}`.toLowerCase().includes(term));
  }, [articles, search]);

  const defaultAudience: SupportAudience = desk === "corporate" ? "agency" : "field_staff";

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section aria-label="Help articles">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="relative min-w-[200px] flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a969c]" />
            <label htmlFor="kb-search" className="sr-only">Search articles</label>
            <input id="kb-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles" className={cn(fieldClass, "pl-8")} />
          </span>
          <button type="button" className={secondaryButton} onClick={() => setDocumentTarget("new")}>
            <Upload aria-hidden="true" className="h-4 w-4" />Upload document
          </button>
          <button type="button" className={primaryButton} onClick={() => setEditing({ audience: defaultAudience, status: "published" })}>
            <Plus aria-hidden="true" className="h-4 w-4" />New article
          </button>
        </div>
        {articles === null ? (
          <div className="grid place-items-center py-12"><Loader2 aria-label="Loading articles" className="h-6 w-6 animate-spin text-[#5d6b73]" /></div>
        ) : visible.length === 0 ? (
          <p className="rounded-[12px] bg-[#f4f6f7] p-4 text-[13px] text-[#5d6b73] dark:bg-white/5 dark:text-[#9aa4a8]">No articles yet. Add the answers your team gives most often, or upload a handbook or policy, and the assistant will use them.</p>
        ) : (
          <ul className="overflow-hidden rounded-[14px] border border-[#e3e8ea] dark:border-white/10">
            {visible.map((article) => article.kind === "document" ? (
              <li key={article.id} className="border-b border-[#edf1f2] last:border-0 dark:border-white/10">
                <button type="button"
                  onClick={() => (article.editable ? setDocumentTarget(article) : article.file && openKnowledgeFile(article.id, article.file.name))}
                  aria-label={article.editable ? `Open ${article.title}` : `Open the file for ${article.title}`}
                  className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left hover:bg-[#f7f9f9] dark:hover:bg-white/5">
                  <FileText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#007679] dark:text-[#7fd3d3]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{article.title}</span>
                      {article.processing && <ProcessingChip status={article.processing.status} stuck={article.processing.stuck} />}
                      {article.status === "draft" && <span className="rounded-full bg-[#fff4e0] px-2 py-0.5 text-[11px] font-medium text-[#8a5300]">Draft</span>}
                      {!article.editable && <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f3f4] px-2 py-0.5 text-[11px] text-[#5d6b73] dark:bg-white/10 dark:text-[#9aa4a8]"><Lock aria-hidden="true" className="h-3 w-3" />CareOnboard</span>}
                    </span>
                    {article.preview && <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-[#5d6b73] dark:text-[#9aa4a8]">{article.preview}</span>}
                    <span className={cn("mt-1 block text-[11.5px]", article.processing?.status === "failed" ? "text-[#b42318] dark:text-[#ffb4ab]" : "text-[#8a969c]")}>
                      {documentSummary(article)}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-[#8a969c]">
                      {AUDIENCE_LABELS[article.audience]}{article.category ? ` · ${article.category}` : ""}
                      {article.usedCount ? ` · used ${article.usedCount} times` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ) : (
              <li key={article.id} className="border-b border-[#edf1f2] last:border-0 dark:border-white/10">
                <button type="button" onClick={() => article.editable && setEditing({ ...article })} disabled={!article.editable}
                  className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left hover:bg-[#f7f9f9] disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-white/5">
                  <BookOpen aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#007679] dark:text-[#7fd3d3]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{article.title}</span>
                      {article.status === "draft" && <span className="rounded-full bg-[#fff4e0] px-2 py-0.5 text-[11px] font-medium text-[#8a5300]">Draft</span>}
                      {!article.editable && <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f3f4] px-2 py-0.5 text-[11px] text-[#5d6b73] dark:bg-white/10 dark:text-[#9aa4a8]"><Lock aria-hidden="true" className="h-3 w-3" />CareOnboard</span>}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-[#5d6b73] dark:text-[#9aa4a8]">{article.body}</span>
                    <span className="mt-1 block text-[11.5px] text-[#8a969c]">
                      {AUDIENCE_LABELS[article.audience]}{article.category ? ` · ${article.category}` : ""}
                      {article.attachments?.length ? ` · ${article.attachments.length} ${article.attachments.length === 1 ? "file" : "files"}` : ""}
                      {article.usedCount ? ` · used ${article.usedCount} times` : ""}
                      {article.helpfulCount || article.notHelpfulCount ? ` · ${article.helpfulCount} helpful, ${article.notHelpfulCount} not` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="kb-gaps" className="self-start rounded-[14px] border border-[#e3e8ea] p-4 dark:border-white/10">
        <h3 id="kb-gaps" className="text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Questions the assistant couldn&apos;t answer</h3>
        <p className="mt-0.5 text-[12.5px] text-[#5d6b73] dark:text-[#9aa4a8]">Write an article for the ones that come up again.</p>
        {gaps.length === 0 ? (
          <p className="mt-3 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Nothing waiting.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {gaps.slice(0, 20).map((gap) => (
              <li key={gap.id} className="rounded-[10px] bg-[#f7f9f9] p-2.5 dark:bg-white/5">
                <p className="line-clamp-3 text-[13px] text-[#10141a] dark:text-[#f4f6f7]">{gap.question}</p>
                <p className="mt-1 text-[11.5px] text-[#8a969c]">{gap.caseNumber} · {formatTime(gap.createdAt)}</p>
                <div className="mt-1.5 flex gap-3">
                  <button type="button" className="cursor-pointer text-[12.5px] font-medium text-[#007679] hover:underline dark:text-[#7fd3d3]" onClick={() => setEditing({ title: gap.question.slice(0, 120), body: "", audience: defaultAudience, status: "published", sourceCaseId: gap.caseId })}>Write article</button>
                  <button type="button" className="cursor-pointer text-[12.5px] text-[#5d6b73] hover:underline" onClick={async () => {
                    try {
                      await dismissSupportGap(desk, gap.id);
                      setGaps((current) => current.filter((g) => g.id !== gap.id));
                    } catch (error) {
                      toast.error(supportErrorMessage(error));
                    }
                  }}>Dismiss</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ArticleEditor
        desk={desk}
        categories={categories}
        draft={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); void load(); }}
        onChanged={upsert}
      />
      <DocumentDrawer
        desk={desk}
        categories={categories}
        target={documentTarget}
        defaultAudience={defaultAudience}
        onClose={() => setDocumentTarget(null)}
        onChanged={upsert}
        onDeleted={(id) => {
          setDocumentTarget(null);
          setArticles((current) => (current ?? []).filter((a) => a.id !== id));
        }}
      />
    </div>
  );
}

const labelClass = "text-[12.5px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]";

function AudienceAndTopic({ desk, categories, audience, category, onChange }: {
  desk: SupportDesk;
  categories: string[];
  audience: SupportAudience | undefined;
  category: string | null | undefined;
  onChange: (patch: { audience?: SupportAudience; category?: string | null }) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className={labelClass}>Who it&apos;s for
        <select value={audience ?? "all"} onChange={(e) => onChange({ audience: e.target.value as SupportAudience })} className={cn(fieldClass, "mt-1")}>
          {(desk === "corporate" ? (["agency", "field_staff", "all"] as const) : (["field_staff", "all"] as const)).map((a) => <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>)}
        </select>
      </label>
      <label className={labelClass}>Topic
        <select value={category ?? ""} onChange={(e) => onChange({ category: e.target.value || null })} className={cn(fieldClass, "mt-1")}>
          <option value="">None</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
    </div>
  );
}

/** A hidden file input behind a button, so the picker matches the other buttons. */
function FilePickerButton({ accept, label, disabled, onPick, icon = Upload, className }: {
  accept: string;
  label: string;
  disabled?: boolean;
  onPick: (file: File) => void;
  icon?: typeof Upload;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const Icon = icon;
  const picked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = fileProblem(file, accept);
    if (problem) toast.error(problem);
    else onPick(file);
  };
  return (
    <>
      <input ref={input} type="file" accept={accept} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={picked} />
      <button type="button" className={cn(secondaryButton, className)} disabled={disabled} onClick={() => input.current?.click()}>
        <Icon aria-hidden="true" className="h-4 w-4" />{label}
      </button>
    </>
  );
}

/**
 * Upload a document, or look after one: see whether it was read, open, replace or retry
 * the file, change who it's for, or delete it with its sections.
 */
function DocumentDrawer({ desk, categories, target, defaultAudience, onClose, onChanged, onDeleted }: {
  desk: SupportDesk;
  categories: string[];
  target: "new" | SupportArticle | null;
  defaultAudience: SupportAudience;
  onClose: () => void;
  onChanged: (article: SupportArticle) => void;
  onDeleted: (id: string) => void;
}) {
  const existing = target && target !== "new" ? target : null;
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<SupportAudience>(defaultAudience);
  const [category, setCategory] = useState<string | null>(null);
  const [draft, setDraft] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "replace" | "retry" | "delete">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const existingId = existing?.id;

  // Reset the form when a different document (or a new upload) opens, not on each refresh.
  useEffect(() => {
    if (!target) return;
    const source = target === "new" ? null : target;
    setFile(null);
    setTitle(source?.title ?? "");
    setAudience(source?.audience ?? defaultAudience);
    setCategory(source?.category ?? null);
    setDraft(source?.status === "draft");
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target === "new" ? "new" : existingId, defaultAudience]);

  const run = async (kind: NonNullable<typeof busy>, work: () => Promise<void>) => {
    setBusy(kind);
    try {
      await work();
    } catch (error) {
      toast.error(supportErrorMessage(error, "That didn't work. Try again."));
    } finally {
      setBusy(null);
    }
  };

  const titleValid = title.trim().length >= 3;
  const upload = () => run("save", async () => {
    if (!file) return;
    const created = await uploadSupportDocument(desk, file, { title: title.trim(), audience, category, status: draft ? "draft" : "published" });
    onChanged(created);
    toast.success("Document uploaded. The assistant can use it once it's ready.");
    onClose();
  });
  const saveDetails = () => run("save", async () => {
    if (!existing) return;
    onChanged(await updateSupportArticle(desk, existing.id, { title: title.trim(), audience, category, status: draft ? "draft" : "published" }));
    toast.success("Document saved");
  });
  const replace = (next: File) => run("replace", async () => {
    if (!existing) return;
    onChanged(await replaceSupportDocumentFile(desk, existing.id, next));
    toast.success("File replaced. It's being read again.");
  });
  const retry = () => run("retry", async () => {
    if (!existing) return;
    onChanged(await reindexSupportDocument(desk, existing.id));
  });
  const remove = () => run("delete", async () => {
    if (!existing) return;
    await deleteSupportDocument(desk, existing.id);
    setConfirmDelete(false);
    toast.success("Document deleted");
    onDeleted(existing.id);
  });

  const status = existing?.processing?.status;
  const stuck = existing?.processing?.stuck === true;
  const working = !stuck && (status === "queued" || status === "processing");

  return (
    <SideDrawer
      open={target !== null}
      onOpenChange={(open) => !open && !busy && onClose()}
      title={existing ? "Document" : "Upload document"}
      description="The assistant reads the document and answers from its sections, citing the section it used."
      footer={
        existing ? (
          <>
            <button type="button" className={cn(secondaryButton, "mr-auto text-[#b42318]")} onClick={() => setConfirmDelete(true)} disabled={!!busy}><Trash2 aria-hidden="true" className="h-4 w-4" />Delete</button>
            <button type="button" className={secondaryButton} onClick={onClose} disabled={!!busy}>Close</button>
            <button type="button" className={primaryButton} onClick={() => void saveDetails()} disabled={!titleValid || !!busy}>{busy === "save" && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Save</button>
          </>
        ) : (
          <>
            <button type="button" className={secondaryButton} onClick={onClose} disabled={!!busy}>Cancel</button>
            <button type="button" className={primaryButton} onClick={() => void upload()} disabled={!file || !titleValid || !!busy}>{busy === "save" && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Upload</button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-3">
        {existing ? (
          <div className="rounded-[12px] border border-[#e3e8ea] p-3 dark:border-white/10">
            <div className="flex items-start gap-2.5">
              <FileText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#007679] dark:text-[#7fd3d3]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{existing.file?.name ?? "No file"}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">
                  {existing.file && <span>{formatBytes(existing.file.size)}</span>}
                  {existing.processing && <ProcessingChip status={existing.processing.status} stuck={existing.processing.stuck} />}
                  {status === "ready" && <span>{existing.processing?.sectionCount} sections</span>}
                </p>
              </div>
            </div>
            <div aria-live="polite">
              {working && <p className="mt-2 text-[12.5px] text-[#5d6b73] dark:text-[#9aa4a8]">Reading the document. Long PDFs can take a few minutes; you can close this and come back.</p>}
              {status === "ready" && existing.processing?.truncated && <p className="mt-2 text-[12.5px] text-[#8a5300]">This document is very long, so only the first part is searched. Split it into smaller files to cover all of it.</p>}
              {stuck && <p className="mt-2 text-[12.5px] text-[#b42318] dark:text-[#ffb4ab]">Reading this document didn&apos;t finish. Use Retry, or replace the file.</p>}
              {status === "failed" && (
                <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-[#b42318] dark:text-[#ffb4ab]">
                  <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{existing.processing?.error || "The document couldn't be read."}
                </p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {existing.file && (
                <button type="button" className={secondaryButton} onClick={() => existing.file && openKnowledgeFile(existing.id, existing.file.name)}>
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />Open file
                </button>
              )}
              <FilePickerButton accept={DOCUMENT_ACCEPT} label={busy === "replace" ? "Uploading…" : "Replace file"} disabled={!!busy || working} onPick={(next) => void replace(next)} />
              {(status === "failed" || stuck) && (
                <button type="button" className={secondaryButton} onClick={() => void retry()} disabled={!!busy}>
                  {busy === "retry" ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="h-4 w-4" />}Retry
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-[12px] border border-dashed border-[#c9d3d6] p-4 text-center dark:border-white/20">
            {file ? (
              <p className="flex items-center justify-center gap-2 text-[13.5px] text-[#10141a] dark:text-[#f4f6f7]">
                <FileText aria-hidden="true" className="h-4 w-4 text-[#007679]" /><span className="truncate">{file.name}</span>
                <span className="text-[12px] text-[#5d6b73]">{formatBytes(file.size)}</span>
              </p>
            ) : (
              <p className="text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">PDF, Word (.docx) or text, up to {formatBytes(MAX_SUPPORT_FILE_BYTES)}. Scanned PDFs work too.</p>
            )}
            <FilePickerButton
              accept={DOCUMENT_ACCEPT}
              label={file ? "Choose another file" : "Choose file"}
              disabled={!!busy}
              className="mt-2"
              onPick={(picked) => {
                setFile(picked);
                if (!title.trim()) setTitle(picked.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 200));
              }}
            />
            <p className="mt-2 text-[12px] text-[#8a969c]">Don&apos;t upload files with client names or health details. Use policies, handbooks and how-to guides.</p>
          </div>
        )}
        <label className={labelClass}>Title
          <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={cn(fieldClass, "mt-1")} />
        </label>
        <AudienceAndTopic desk={desk} categories={categories} audience={audience} category={category} onChange={(patch) => {
          if (patch.audience) setAudience(patch.audience);
          if ("category" in patch) setCategory(patch.category ?? null);
        }} />
        <label className="flex items-center gap-2 text-[13px] text-[#10141a] dark:text-[#f4f6f7]">
          <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} className="h-4 w-4 accent-[#007679]" />
          Save as a draft (the assistant won&apos;t use it yet)
        </label>
      </div>
      <ConfirmDialog open={confirmDelete} onOpenChange={(open) => { if (busy !== "delete") setConfirmDelete(open); }}>
        <ConfirmDialogContent
          title="Delete this document?"
          description="The file and everything the assistant learned from it are removed. Past answers keep their citation but the file won't open."
          confirmText="Delete"
          loadingText="Deleting…"
          isLoading={busy === "delete"}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void remove()}
        />
      </ConfirmDialog>
    </SideDrawer>
  );
}

function ArticleEditor({ desk, categories, draft, onClose, onSaved, onChanged }: {
  desk: SupportDesk;
  categories: string[];
  draft: ArticleDraft | null;
  onClose: () => void;
  onSaved: () => void;
  /** An attachment was added or removed (already saved). */
  onChanged: (article: SupportArticle) => void;
}) {
  const [value, setValue] = useState<ArticleDraft>({});
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<SupportFile[]>([]);
  const [fileBusy, setFileBusy] = useState<string | null>(null);
  useEffect(() => {
    if (draft) {
      setValue(draft);
      setTags((draft.tags ?? []).join(", "));
      setAttachments(draft.attachments ?? []);
    }
  }, [draft]);

  const changeFiles = async (key: string, work: () => Promise<SupportArticle>) => {
    setFileBusy(key);
    try {
      const article = await work();
      setAttachments(article.attachments);
      onChanged(article);
    } catch (error) {
      toast.error(supportErrorMessage(error, "The file wasn't saved."));
    } finally {
      setFileBusy(null);
    }
  };

  const valid = (value.title?.trim().length ?? 0) >= 3 && (value.body?.trim().length ?? 0) >= 10;
  const save = async () => {
    setSaving(true);
    const input: ArticleInput = {
      title: value.title?.trim(),
      body: value.body?.trim(),
      category: value.category || null,
      audience: value.audience,
      status: value.status === "draft" ? "draft" : "published",
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20),
      ...(value.id ? {} : { sourceCaseId: value.sourceCaseId ?? null }),
    };
    try {
      if (value.id) await updateSupportArticle(desk, value.id, input);
      else await createSupportArticle(desk, input);
      toast.success(value.id ? "Article saved" : "Article added");
      onSaved();
    } catch (error) {
      toast.error(supportErrorMessage(error, "The article was not saved."));
    } finally {
      setSaving(false);
    }
  };
  const archive = async () => {
    if (!value.id) return;
    setSaving(true);
    try {
      await archiveSupportArticle(desk, value.id);
      toast.success("Article archived");
      onSaved();
    } catch (error) {
      toast.error(supportErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SideDrawer
      open={draft !== null}
      onOpenChange={(open) => !open && onClose()}
      title={value.id ? "Edit article" : "New article"}
      description="The assistant only answers from what's written here, so be specific."
      footer={
        <>
          {value.id && <button type="button" className={cn(secondaryButton, "mr-auto text-[#b42318]")} onClick={() => void archive()} disabled={saving}><X aria-hidden="true" className="h-4 w-4" />Archive</button>}
          <button type="button" className={secondaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={primaryButton} onClick={() => void save()} disabled={!valid || saving}>{saving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Save</button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="text-[12.5px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">Question or title
          <input value={value.title ?? ""} maxLength={200} onChange={(e) => setValue({ ...value, title: e.target.value })} className={cn(fieldClass, "mt-1")} />
        </label>
        <label className="text-[12.5px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">Answer
          <textarea value={value.body ?? ""} maxLength={10000} rows={10} onChange={(e) => setValue({ ...value, body: e.target.value })}
            className="mt-1 w-full resize-y rounded-[8px] border border-[#e3e8ea] bg-white p-2.5 text-[13.5px] text-[#10141a] outline-none focus:border-[#007679] focus:ring-2 focus:ring-[#007679]/20 dark:border-white/15 dark:bg-[#1b232b] dark:text-[#f4f6f7]" />
        </label>
        <AudienceAndTopic desk={desk} categories={categories} audience={value.audience} category={value.category} onChange={(patch) => setValue({ ...value, ...patch })} />
        <label className="text-[12.5px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">Search words, separated by commas
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="timesheet, clock out, missed punch" className={cn(fieldClass, "mt-1")} />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[#10141a] dark:text-[#f4f6f7]">
          <input type="checkbox" checked={value.status === "draft"} onChange={(e) => setValue({ ...value, status: e.target.checked ? "draft" : "published" })} className="h-4 w-4 accent-[#007679]" />
          Save as a draft (the assistant won&apos;t use it yet)
        </label>
        <section aria-labelledby="article-files" className="border-t border-[#edf1f2] pt-3 dark:border-white/10">
          <h3 id="article-files" className="text-[13.5px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Files</h3>
          <p className="mt-0.5 text-[12.5px] text-[#5d6b73] dark:text-[#9aa4a8]">Forms or guides people can download when the assistant uses this article. The assistant doesn&apos;t read them; upload a document for that.</p>
          {value.id ? (
            <>
              {attachments.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {attachments.map((file) => (
                    <li key={file.id} className="flex items-center gap-2 rounded-[10px] bg-[#f7f9f9] px-2.5 py-1.5 dark:bg-white/5">
                      <Paperclip aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#5d6b73]" />
                      <button type="button" className="min-w-0 flex-1 cursor-pointer truncate text-left text-[13px] text-[#00686b] hover:underline dark:text-[#7fd3d3]" onClick={() => value.id && openKnowledgeFile(value.id, file.name, file.id)}>{file.name}</button>
                      <span className="text-[11.5px] text-[#8a969c]">{formatBytes(file.size)}</span>
                      <button type="button" aria-label={`Remove ${file.name}`} disabled={!!fileBusy}
                        className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-[#5d6b73] hover:bg-[#edf1f2] disabled:opacity-50 dark:hover:bg-white/10"
                        onClick={() => value.id && void changeFiles(file.id, () => removeArticleAttachment(desk, value.id as string, file.id))}>
                        {fileBusy === file.id ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <X aria-hidden="true" className="h-3.5 w-3.5" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {attachments.length < MAX_ARTICLE_ATTACHMENTS ? (
                <FilePickerButton accept={ATTACHMENT_ACCEPT} icon={Paperclip} label={fileBusy === "add" ? "Uploading…" : "Attach file"} disabled={!!fileBusy} className="mt-2"
                  onPick={(file) => value.id && void changeFiles("add", () => addArticleAttachment(desk, value.id as string, file))} />
              ) : (
                <p className="mt-2 text-[12px] text-[#8a969c]">An article can have up to {MAX_ARTICLE_ATTACHMENTS} files.</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-[12.5px] text-[#8a969c]">Save the article first, then open it again to attach files.</p>
          )}
        </section>
      </div>
    </SideDrawer>
  );
}
