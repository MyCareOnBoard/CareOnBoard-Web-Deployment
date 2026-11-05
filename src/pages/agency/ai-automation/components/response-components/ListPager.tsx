import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Paging info the assistant sends with list cards. */
export interface ListMeta {
  total?: number;
  totalIsExact?: boolean;
  hasMore?: boolean;
  offset?: number;
}

export const LIST_PAGE_SIZE = 10;

/** Reads the paging fields from a list card's data or its `meta`. */
export function readListMeta(source: unknown): ListMeta {
  if (!source || typeof source !== "object") return {};
  const s = source as Record<string, unknown>;
  return {
    total: typeof s.total === "number" ? s.total : undefined,
    totalIsExact: typeof s.totalIsExact === "boolean" ? s.totalIsExact : undefined,
    hasMore: typeof s.hasMore === "boolean" ? s.hasMore : undefined,
    offset: typeof s.offset === "number" ? s.offset : undefined,
  };
}

export interface PagedRows<T> {
  pageRows: T[];
  page: number;
  pageCount: number;
  start: number;
  end: number;
  setPage: (page: number) => void;
}

/** Pages a card's rows in the browser, 10 at a time. */
export function usePagedRows<T>(rows: T[], pageSize = LIST_PAGE_SIZE): PagedRows<T> {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  // A merged card can shrink or grow; keep the page in range.
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);
  const current = Math.min(page, pageCount - 1);
  return {
    pageRows: rows.slice(current * pageSize, current * pageSize + pageSize),
    page: current,
    pageCount,
    start: rows.length ? current * pageSize + 1 : 0,
    end: Math.min(rows.length, current * pageSize + pageSize),
    setPage,
  };
}

/** Header count: the full total when the assistant knows it, else the rows shown. */
export function listCountLabel(loaded: number, meta: ListMeta) {
  if (meta.total == null || meta.total === loaded) return String(loaded);
  return meta.totalIsExact === false ? `${meta.total}+` : String(meta.total);
}

interface ListPagerProps {
  loaded: number;
  meta: ListMeta;
  paging: Omit<PagedRows<unknown>, "pageRows">;
  /** Noun for the "load the rest" request, e.g. "DSPs". */
  noun: string;
  onSendMessage?: (text: string) => void;
}

export default function ListPager({ loaded, meta, paging, noun, onSendMessage }: ListPagerProps) {
  const { page, pageCount, start, end, setPage } = paging;
  const notLoaded = meta.hasMore && loaded > 0;
  if (pageCount <= 1 && !notLoaded) return null;

  const totalText = meta.total != null && meta.total > loaded
    ? `${meta.totalIsExact === false ? "at least " : ""}${meta.total}`
    : String(loaded);

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[#e5e7eb] px-4 py-2 text-[12px] text-[#6b7280]">
      <span>
        {start}–{end} of {totalText}
      </span>
      {notLoaded && onSendMessage && (
        <button
          type="button"
          onClick={() => onSendMessage(`Show all ${noun}`)}
          className="rounded-full border border-[#00b4b8] px-2.5 py-0.5 text-[11px] font-medium text-[#00898c] hover:bg-[#f3fafa]"
        >
          Load all
        </button>
      )}
      {pageCount > 1 && (
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="rounded-md p-1 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="tabular-nums">
            {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= pageCount - 1}
            onClick={() => setPage(page + 1)}
            className="rounded-md p-1 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
