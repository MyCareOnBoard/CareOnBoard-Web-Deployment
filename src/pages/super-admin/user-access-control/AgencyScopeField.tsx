import React, { useRef, useState } from "react";
import { Building2, Check, ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencyScopeMode } from "@/lib/api/super-admin-users";

interface AgencyOption {
  id: string;
  name: string;
  status?: string;
}

interface AgencyScopeFieldProps {
  agencies: AgencyOption[];
  canAssignAllAgencies: boolean;
  isLoading: boolean;
  hasMore: boolean;
  search: string;
  value: { agencyScope: AgencyScopeMode; agencyIds: string[] };
  disabled: boolean;
  popoverContainer?: HTMLElement | null;
  pageError?: string;
  hydrationError?: string;
  onSearchChange: (search: string) => void;
  onLoadMore: () => void;
  onRetryPage?: () => void;
  onRetryHydration?: () => void;
  onChange: (value: {
    agencyScope: AgencyScopeMode;
    agencyIds: string[];
  }) => void;
}

export default function AgencyScopeField({
  agencies,
  canAssignAllAgencies,
  isLoading,
  hasMore,
  search,
  value,
  disabled,
  popoverContainer,
  pageError,
  hydrationError,
  onSearchChange,
  onLoadMore,
  onRetryPage,
  onRetryHydration,
  onChange,
}: AgencyScopeFieldProps) {
  const [open, setOpen] = useState(false);
  const agencyCache = useRef(new Map<string, AgencyOption>());

  agencies.forEach((agency) => agencyCache.current.set(agency.id, agency));

  const selected = value.agencyIds.map(
    (id) => agencyCache.current.get(id) || { id, name: id },
  );
  const toggle = (id: string) => {
    const ids = value.agencyIds.includes(id)
      ? value.agencyIds.filter((selectedId) => selectedId !== id)
      : [...value.agencyIds, id];
    onChange({ agencyScope: "selected", agencyIds: Array.from(new Set(ids)) });
  };

  return (
    <section className="space-y-3" aria-labelledby="agency-access-label">
      <div>
        <Label
          id="agency-access-label"
          className="text-[12px] font-semibold text-[#10141a]"
        >
          Agency access
        </Label>
        <p className="mt-1 text-[12px] leading-5 text-[#687173]">
          Choose which agencies this user can view and manage.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {canAssignAllAgencies && (
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${value.agencyScope === "all" ? "border-[#087f82] bg-[#edfafa]" : "border-[#dce3e3] bg-[#fbfcfc]"}`}
          >
            <input
              type="radio"
              name="agency-scope"
              aria-label="All agencies"
              checked={value.agencyScope === "all"}
              disabled={disabled}
              onChange={() => onChange({ agencyScope: "all", agencyIds: [] })}
              className="mt-1 accent-[#087f82]"
            />
            <span>
              <span className="block text-[13px] font-semibold text-[#182022]">
                All agencies
              </span>
              <span className="block text-[11px] leading-4 text-[#687173]">
                Current and future agencies
              </span>
            </span>
          </label>
        )}
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${value.agencyScope === "selected" ? "border-[#087f82] bg-[#edfafa]" : "border-[#dce3e3] bg-[#fbfcfc]"}`}
        >
          <input
            type="radio"
            name="agency-scope"
            aria-label="Selected agencies"
            checked={value.agencyScope === "selected"}
            disabled={disabled}
            onChange={() =>
              onChange({ agencyScope: "selected", agencyIds: value.agencyIds })
            }
            className="mt-1 accent-[#087f82]"
          />
          <span>
            <span className="block text-[13px] font-semibold text-[#182022]">
              Selected agencies
            </span>
            <span className="block text-[11px] leading-4 text-[#687173]">
              Only the agencies chosen below
            </span>
          </span>
        </label>
      </div>

      {value.agencyScope === "selected" && (
        <div className="space-y-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className="flex min-h-11 w-full items-center justify-between rounded-xl border border-[#cfd7d7] bg-[#fbfcfc] px-4 text-left text-[13px] text-[#273033] hover:border-[#8ebabb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92]/30 disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#087f82]" />
                  Choose agencies
                </span>
                <ChevronDown className="h-4 w-4 text-[#687173]" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              portalContainer={popoverContainer}
              className="w-[min(440px,calc(100vw-40px))] overflow-hidden rounded-2xl border border-[#dce5e5] bg-[#fdfefe] shadow-[0_18px_48px_rgba(21,54,55,0.18)]"
            >
              <div className="border-b border-[#e5ebeb] p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#748082]" />
                  <Input
                    aria-label="Search agencies"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Search agencies"
                    className="h-10 rounded-xl border-[#d2dada] bg-[#f6f9f9] pl-9 text-[13px] focus-visible:ring-[#008f92]/30"
                  />
                </div>
              </div>
              <div
                role="group"
                aria-label="Agency options"
                className="max-h-[min(320px,45vh)] touch-pan-y overflow-y-auto overscroll-contain p-2"
              >
                {agencies.map((agency) => {
                  const checked = value.agencyIds.includes(agency.id);
                  return (
                    <label
                      key={agency.id}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-[#eef8f8]"
                    >
                      <input
                        type="checkbox"
                        aria-label={`${agency.name}${agency.status === "inactive" ? " inactive" : ""}`}
                        checked={checked}
                        onChange={() => toggle(agency.id)}
                        className="sr-only"
                      />
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? "border-[#087f82] bg-[#087f82] text-white" : "border-[#b7c2c3] bg-white"}`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#20282a]">
                        {agency.name}
                      </span>
                      {agency.status === "inactive" && (
                        <span className="rounded-full bg-[#f4e9e7] px-2 py-1 text-[10px] font-semibold text-[#9a493d]">
                          Inactive
                        </span>
                      )}
                    </label>
                  );
                })}
                {isLoading && (
                  <div
                    role="status"
                    aria-label="Loading agencies"
                    className="space-y-2 p-2"
                  >
                    {[0, 1, 2].map((item) => (
                      <Skeleton
                        key={item}
                        className="h-10 w-full rounded-xl bg-[#e7eeee]"
                      />
                    ))}
                  </div>
                )}
                {pageError && (
                  <div
                    role="alert"
                    className="mx-2 my-2 flex items-center justify-between gap-3 rounded-xl border border-[#efcbc5] bg-[#fff5f3] p-3"
                  >
                    <span className="text-[11px] font-medium text-[#944236]">
                      {pageError}
                    </span>
                    {onRetryPage && (
                      <button
                        type="button"
                        aria-label="Retry agency search"
                        onClick={onRetryPage}
                        className="shrink-0 rounded-full border border-[#c98277] px-3 py-1.5 text-[10px] font-semibold text-[#944236]"
                      >
                        Retry search
                      </button>
                    )}
                  </div>
                )}
                {hydrationError && (
                  <div role="alert" className="mx-2 my-2 flex items-center justify-between gap-3 rounded-xl border border-[#efcbc5] bg-[#fff5f3] p-3">
                    <span className="text-[11px] font-medium text-[#944236]">{hydrationError}</span>
                    {onRetryHydration && <button type="button" aria-label="Retry selected agencies" onClick={onRetryHydration} className="shrink-0 rounded-full border border-[#c98277] px-3 py-1.5 text-[10px] font-semibold text-[#944236]">Retry selected</button>}
                  </div>
                )}
                {!isLoading && agencies.length === 0 && (
                  <p className="px-3 py-8 text-center text-[12px] text-[#687173]">
                    No agencies found.
                  </p>
                )}
                {hasMore && (
                  <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={isLoading}
                    className="mt-1 min-h-10 w-full rounded-xl text-[12px] font-semibold text-[#087f82] hover:bg-[#eaf7f7] disabled:opacity-50"
                  >
                    Load more agencies
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <div
            className="flex max-w-full flex-wrap gap-2"
            data-testid="selected-agency-chips"
          >
            {selected.map((agency) => (
              <span
                key={agency.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#e8f5f5] py-1.5 pl-3 pr-1.5 text-[11px] font-semibold text-[#176b6d]"
              >
                <span className="truncate">{agency.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${agency.name}`}
                  disabled={disabled}
                  onClick={() => toggle(agency.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-[#cde8e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f82]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          {value.agencyIds.length === 0 && (
            <p role="alert" className="text-[11px] font-medium text-[#a44638]">
              Select at least one agency.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export type { AgencyScopeFieldProps };
