type ClaimsTablePaginationProps = {
  isRefetching?: boolean;
  nextCursor?: string | null;
  onLoadMore?: () => void;
  loadMoreLabel: string;
  terminalLabel: string;
  loadMoreError?: string | null;
};

export default function ClaimsTablePagination({
  isRefetching = false,
  nextCursor,
  onLoadMore,
  loadMoreLabel,
  terminalLabel,
  loadMoreError,
}: ClaimsTablePaginationProps) {
  if (nextCursor === undefined) return null;

  if (nextCursor === null) {
    return (
      <p role="status" className="pt-4 text-center text-[13px] text-[#6b737a] dark:text-[#9aa4a8]">
        {terminalLabel}
      </p>
    );
  }

  return (
    <div className="space-y-2 pt-4">
      {loadMoreError ? <p role="alert" aria-live="polite" className="text-center text-[13px] text-[#b42318]">{loadMoreError}</p> : null}
      <div className="flex justify-center">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={!onLoadMore || isRefetching}
        aria-label={loadMoreError ? loadMoreLabel.replace("Load more", "Retry loading more") : loadMoreLabel}
        aria-busy={isRefetching}
        className="inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-[10px] border border-[#dcdfe2] bg-white px-4 text-[14px] font-semibold text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5"
      >
        {isRefetching ? "Loading more…" : "Load more"}
      </button>
      </div>
    </div>
  );
}
