type ClaimsTablePaginationProps = {
  isRefetching?: boolean;
  nextCursor?: string | null;
  onLoadMore?: () => void;
  loadMoreLabel: string;
  terminalLabel: string;
};

export default function ClaimsTablePagination({
  isRefetching = false,
  nextCursor,
  onLoadMore,
  loadMoreLabel,
  terminalLabel,
}: ClaimsTablePaginationProps) {
  if (nextCursor === undefined) return null;

  if (nextCursor === null) {
    return (
      <p role="status" className="pt-4 text-center text-[13px] text-[#808081]">
        {terminalLabel}
      </p>
    );
  }

  return (
    <div className="flex justify-center pt-4">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={!onLoadMore || isRefetching}
        aria-label={loadMoreLabel}
        aria-busy={isRefetching}
        className="inline-flex h-11 min-w-11 items-center justify-center rounded-md border border-[#cccccd] bg-white px-4 text-[13px] font-medium text-[#10141a] transition-colors hover:bg-[#eef4f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRefetching ? "Loading more…" : "Load more"}
      </button>
    </div>
  );
}
