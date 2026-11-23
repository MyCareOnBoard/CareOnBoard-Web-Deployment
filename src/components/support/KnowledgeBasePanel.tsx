import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Loader2, Lock, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  archiveSupportArticle,
  createSupportArticle,
  dismissSupportGap,
  listSupportArticles,
  listSupportGaps,
  supportErrorMessage,
  updateSupportArticle,
  type ArticleInput,
  type SupportArticle,
  type SupportAudience,
  type SupportDesk,
  type SupportGap,
} from "@/lib/api/support";
import { SideDrawer, fieldClass, primaryButton, secondaryButton } from "./SupportTeamDrawer";
import { formatTime } from "./SupportThread";

const AUDIENCE_LABELS: Record<SupportAudience, string> = { field_staff: "Field staff", agency: "Agency staff", all: "Everyone" };

export interface ArticleDraft extends ArticleInput {
  id?: string;
}

/**
 * The articles the desk's assistant answers from, and the questions it could not answer.
 * Agency desks edit their own articles and see CareOnboard's built-in ones read-only;
 * the corporate desk edits platform articles.
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

  const load = useCallback(async () => {
    try {
      const [loadedArticles, loadedGaps] = await Promise.all([listSupportArticles(desk), listSupportGaps(desk)]);
      setArticles(loadedArticles);
      setGaps(loadedGaps);
    } catch (error) {
      setArticles([]);
      toast.error(supportErrorMessage(error, "Articles could not be loaded."));
    }
  }, [desk]);
  useEffect(() => { void load(); }, [load]);

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
      .filter((a) => !term || `${a.title} ${a.body} ${a.tags.join(" ")}`.toLowerCase().includes(term));
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
          <button type="button" className={primaryButton} onClick={() => setEditing({ audience: defaultAudience, status: "published" })}>
            <Plus aria-hidden="true" className="h-4 w-4" />New article
          </button>
        </div>
        {articles === null ? (
          <div className="grid place-items-center py-12"><Loader2 aria-label="Loading articles" className="h-6 w-6 animate-spin text-[#5d6b73]" /></div>
        ) : visible.length === 0 ? (
          <p className="rounded-[12px] bg-[#f4f6f7] p-4 text-[13px] text-[#5d6b73] dark:bg-white/5 dark:text-[#9aa4a8]">No articles yet. Add the answers your team gives most often, and the assistant will use them.</p>
        ) : (
          <ul className="overflow-hidden rounded-[14px] border border-[#e3e8ea] dark:border-white/10">
            {visible.map((article) => (
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
      />
    </div>
  );
}

function ArticleEditor({ desk, categories, draft, onClose, onSaved }: {
  desk: SupportDesk;
  categories: string[];
  draft: ArticleDraft | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState<ArticleDraft>({});
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (draft) {
      setValue(draft);
      setTags((draft.tags ?? []).join(", "));
    }
  }, [draft]);

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
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[12.5px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">Who it&apos;s for
            <select value={value.audience ?? "all"} onChange={(e) => setValue({ ...value, audience: e.target.value as SupportAudience })} className={cn(fieldClass, "mt-1")}>
              {(desk === "corporate" ? (["agency", "field_staff", "all"] as const) : (["field_staff", "all"] as const)).map((a) => <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>)}
            </select>
          </label>
          <label className="text-[12.5px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">Topic
            <select value={value.category ?? ""} onChange={(e) => setValue({ ...value, category: e.target.value || null })} className={cn(fieldClass, "mt-1")}>
              <option value="">None</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <label className="text-[12.5px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">Search words, separated by commas
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="timesheet, clock out, missed punch" className={cn(fieldClass, "mt-1")} />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[#10141a] dark:text-[#f4f6f7]">
          <input type="checkbox" checked={value.status === "draft"} onChange={(e) => setValue({ ...value, status: e.target.checked ? "draft" : "published" })} className="h-4 w-4 accent-[#007679]" />
          Save as a draft (the assistant won&apos;t use it yet)
        </label>
      </div>
    </SideDrawer>
  );
}
