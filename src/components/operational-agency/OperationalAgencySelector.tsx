import { useEffect, useId, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { listOperationalAgencies } from "@/lib/api/super-admin-operations";
import type {
  OperationalAgencySummary,
  OperationalFeature,
} from "@/lib/operational-agency/types";

export interface OperationalAgencySelectorProps {
  feature: OperationalFeature;
  selectionMode: "single" | "multiple";
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

function mergeKnownAgencies(
  current: Record<string, OperationalAgencySummary>,
  agencies: readonly OperationalAgencySummary[],
): Record<string, OperationalAgencySummary> {
  if (!agencies.length) return current;
  const next = { ...current };
  for (const agency of agencies) next[agency.id] = agency;
  return next;
}

function sortedAgencies(agencies: readonly OperationalAgencySummary[]): OperationalAgencySummary[] {
  return [...agencies].sort(
    (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
  );
}

function isCancellation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string };
  return candidate.code === "ERR_CANCELED"
    || candidate.name === "CanceledError"
    || candidate.name === "AbortError";
}

export default function OperationalAgencySelector({
  feature,
  selectionMode,
  selectedIds,
  onSelectionChange,
}: OperationalAgencySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [agencies, setAgencies] = useState<OperationalAgencySummary[]>([]);
  const [knownAgencies, setKnownAgencies] = useState<Record<string, OperationalAgencySummary>>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const loadMoreController = useRef<AbortController | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId().replace(/:/g, "");
  const searchInputId = `operational-agency-${feature}-${generatedId}`;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    loadMoreController.current?.abort();
    setLoading(true);
    setError(null);

    void listOperationalAgencies(feature, {
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      limit: PAGE_SIZE,
      signal: controller.signal,
    }).then((page) => {
      if (!active || controller.signal.aborted) return;
      const nextAgencies = sortedAgencies(page.data);
      setAgencies(nextAgencies);
      setKnownAgencies((current) => mergeKnownAgencies(current, nextAgencies));
      setNextCursor(page.nextCursor);
    }).catch((requestError: unknown) => {
      if (!active || controller.signal.aborted || isCancellation(requestError)) return;
      setAgencies([]);
      setNextCursor(null);
      setError("We couldn't load agencies. Try again.");
    }).finally(() => {
      if (active && !controller.signal.aborted) setLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedSearch, feature, retryVersion]);

  const selectedKey = JSON.stringify(selectedIds);
  useEffect(() => {
    const ids = Array.from(new Set(selectedIds.filter(Boolean)));
    if (!ids.length) return undefined;
    const controller = new AbortController();
    let active = true;

    const hydrateSelectedAgencies = async () => {
      const hydratedAgencies: OperationalAgencySummary[] = [];
      for (let start = 0; start < ids.length; start += PAGE_SIZE) {
        if (!active || controller.signal.aborted) return;
        const pageIds = ids.slice(start, start + PAGE_SIZE);
        const page = await listOperationalAgencies(feature, {
          ids: pageIds,
          limit: pageIds.length,
          signal: controller.signal,
        });
        hydratedAgencies.push(...page.data);
      }
      if (!active || controller.signal.aborted) return;
      setKnownAgencies((current) => mergeKnownAgencies(current, hydratedAgencies));
    };

    void hydrateSelectedAgencies().catch((requestError: unknown) => {
      if (!active || controller.signal.aborted || isCancellation(requestError)) return;
    });

    return () => {
      active = false;
      controller.abort();
    };
  // selectedKey intentionally makes equal controlled selections stable across parent renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature, selectedKey]);

  useEffect(() => () => loadMoreController.current?.abort(), []);

  useEffect(() => {
    optionRefs.current.length = agencies.length;
    setActiveOptionIndex((current) => Math.min(current, Math.max(agencies.length - 1, 0)));
  }, [agencies.length]);

  const selectedAgencies = selectedIds.map((id) => knownAgencies[id] || {
    id,
    name: id,
    status: "active",
    supportedClientTypes: [],
    timezone: "",
  });
  const selectedNames = selectedAgencies.map((agency) => agency.name);
  const triggerLabel = selectionMode === "single"
    ? `Select an agency, ${selectedNames[0] ? `${selectedNames[0]} selected` : "none selected"}`
    : `Select agencies, ${selectedNames.length
      ? selectedNames.length === 1
        ? `${selectedNames[0]} selected`
        : `${selectedNames.length} agencies selected`
      : "none selected"}`;

  const toggleAgency = (agencyId: string) => {
    if (selectionMode === "single") {
      onSelectionChange([agencyId]);
      setOpen(false);
      return;
    }
    onSelectionChange(selectedIds.includes(agencyId)
      ? selectedIds.filter((id) => id !== agencyId)
      : [...selectedIds, agencyId]);
  };

  const focusOption = (index: number) => {
    if (!agencies.length) return;
    const normalized = (index + agencies.length) % agencies.length;
    setActiveOptionIndex(normalized);
    optionRefs.current[normalized]?.focus();
  };

  const loadMore = async () => {
    if (!nextCursor || loading) return;
    loadMoreController.current?.abort();
    const controller = new AbortController();
    loadMoreController.current = controller;
    setLoading(true);
    setError(null);
    try {
      const page = await listOperationalAgencies(feature, {
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        cursor: nextCursor,
        limit: PAGE_SIZE,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setKnownAgencies((known) => mergeKnownAgencies(known, page.data));
      setAgencies((current) => {
        const byId = new Map(current.map((agency) => [agency.id, agency]));
        for (const agency of page.data) byId.set(agency.id, agency);
        return sortedAgencies(Array.from(byId.values()));
      });
      setNextCursor(page.nextCursor);
    } catch (requestError) {
      if (!controller.signal.aborted && !isCancellation(requestError)) {
        setError("We couldn't load more agencies. Try again.");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  return (
    <div className="min-w-0 space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={triggerLabel}
            className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-[#cfd7d7] bg-[#fbfcfc] px-3.5 text-left text-[13px] font-medium text-[#273033] transition-colors hover:border-[#8ebabb] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] focus-visible:ring-offset-2"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-[#087f82]" />
              <span className="truncate">
                {selectedNames.length === 0
                  ? selectionMode === "single" ? "Choose one agency" : "Choose agencies"
                  : selectedNames.length === 1 ? selectedNames[0] : `${selectedNames.length} agencies`}
              </span>
            </span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-[#687173]" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[#dce5e5] bg-[#fdfefe] shadow-[0_18px_48px_rgba(21,54,55,0.18)]"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            searchInputRef.current?.focus();
          }}
        >
          <div className="border-b border-[#e5ebeb] p-3">
            <label htmlFor={searchInputId} className="sr-only">Search agencies</label>
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#748082]" />
              <Input
                ref={searchInputRef}
                id={searchInputId}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && agencies.length) {
                    event.preventDefault();
                    focusOption(0);
                  }
                }}
                placeholder="Search by agency name"
                className="h-11 bg-[#f6f9f9] pl-9 text-[13px] focus-visible:ring-[#008f92]/30"
              />
            </div>
            <div className="mt-2 flex min-h-11 items-center justify-between gap-3">
              <span className="text-[11px] font-semibold text-[#5e696b]" aria-hidden="true">
                {selectedIds.length === 0
                  ? "No agencies selected"
                  : `${selectedIds.length} ${selectedIds.length === 1 ? "agency" : "agencies"} selected`}
              </span>
              <div className="flex items-center gap-1">
                {selectionMode === "multiple" && agencies.length > 0 && (
                  <button
                    type="button"
                    aria-label="Select all agencies"
                    onClick={() => onSelectionChange(Array.from(new Set([
                      ...selectedIds,
                      ...agencies.map((agency) => agency.id),
                    ])))}
                    className="min-h-11 rounded-lg px-2.5 text-[11px] font-semibold text-[#087f82] hover:bg-[#eaf7f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92]"
                  >
                    Select all
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Clear agency selection"
                  disabled={selectedIds.length === 0}
                  onClick={() => onSelectionChange([])}
                  className="min-h-11 rounded-lg px-2.5 text-[11px] font-semibold text-[#687173] hover:bg-[#eef2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[min(320px,45vh)] touch-pan-y overflow-y-auto overscroll-contain p-2">
            <div
              role="listbox"
              aria-label="Agency options"
              aria-busy={loading}
              aria-multiselectable={selectionMode === "multiple" || undefined}
            >
              {agencies.map((agency, index) => {
                const selected = selectedIds.includes(agency.id);
                return (
                  <button
                    key={agency.id}
                    ref={(element) => { optionRefs.current[index] = element; }}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    tabIndex={activeOptionIndex === index ? 0 : -1}
                    onFocus={() => setActiveOptionIndex(index)}
                    onClick={() => toggleAgency(agency.id)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        focusOption(index + 1);
                      } else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        focusOption(index - 1);
                      } else if (event.key === "Home") {
                        event.preventDefault();
                        focusOption(0);
                      } else if (event.key === "End") {
                        event.preventDefault();
                        focusOption(agencies.length - 1);
                      }
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-[#eef8f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] focus-visible:ring-inset"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected
                        ? "border-[#087f82] bg-[#087f82] text-white"
                        : "border-[#b7c2c3] bg-white"}`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#20282a]">
                      {agency.name}
                    </span>
                  </button>
                );
              })}
            </div>
            {loading && (
              <div aria-label="Loading agencies" className="space-y-2 p-2">
                {[0, 1, 2].map((item) => <Skeleton key={item} className="h-10 w-full rounded-xl" />)}
              </div>
            )}
            {error && (
              <div role="alert" className="m-2 flex items-center justify-between gap-3 rounded-xl border border-[#efcbc5] bg-[#fff5f3] p-3">
                <span className="text-[11px] font-medium text-[#944236]">{error}</span>
                <button
                  type="button"
                  onClick={() => setRetryVersion((value) => value + 1)}
                  className="min-h-11 shrink-0 rounded-lg border border-[#c98277] px-3 text-[11px] font-semibold text-[#944236] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#944236]"
                >
                  Retry
                </button>
              </div>
            )}
            {!loading && !error && agencies.length === 0 && (
              <p className="px-3 py-8 text-center text-[12px] text-[#687173]">No agencies found.</p>
            )}
            {nextCursor && (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loading}
                className="mt-1 min-h-11 w-full rounded-xl text-[12px] font-semibold text-[#087f82] hover:bg-[#eaf7f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] disabled:opacity-50"
              >
                Load more agencies
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <span role="status" className="sr-only">
        {selectedIds.length === 0
          ? "No agencies selected"
          : `${selectedIds.length} ${selectedIds.length === 1 ? "agency" : "agencies"} selected`}
      </span>

      <div
        className="flex max-h-24 min-w-0 flex-wrap gap-1.5 overflow-y-auto overscroll-contain pr-1"
        aria-label="Selected agencies"
      >
        {selectedAgencies.map((agency) => (
          <span
            key={agency.id}
            className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-full bg-[#e8f5f5] pl-3 pr-0.5 text-[11px] font-semibold text-[#176b6d]"
          >
            <span className="truncate">{agency.name}</span>
            <button
              type="button"
              aria-label={`Remove ${agency.name}`}
              onClick={() => onSelectionChange(selectedIds.filter((id) => id !== agency.id))}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[#cde8e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f82]"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
