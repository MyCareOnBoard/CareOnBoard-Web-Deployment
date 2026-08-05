import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Building2, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type StaffDirectoryAccountType,
  type StaffDirectoryStaffMember,
  type StaffDirectoryStatus,
  useListStaffDirectoryQuery,
} from "@/lib/api/staff-directory";

const PAGE_SIZE = 20;
const SEARCH_TOKEN_PATTERN = /^[a-z0-9]{2,32}$/;
const SEARCH_GUIDANCE = "Use one 2–32 character name or email token with letters and numbers only.";

function StaffDirectorySkeleton() {
  return (
    <div aria-label="Loading staff directory" aria-busy="true" className="divide-y divide-[#edf1f1]">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          data-testid="staff-directory-skeleton-row"
          className="grid min-w-[920px] grid-cols-[minmax(14rem,1.6fr)_9rem_minmax(11rem,1fr)_8rem_minmax(11rem,1fr)_9rem] items-center gap-4 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="space-y-2"><Skeleton className="h-4 w-36 rounded" /><Skeleton className="h-3 w-44 rounded" /></div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

function accountTypeLabel(accountType: StaffDirectoryAccountType): string {
  if (accountType === "internal_user") return "Internal user";
  if (accountType === "agency_admin") return "Agency admin";
  return "Employee";
}

function accountTypeClass(accountType: StaffDirectoryAccountType): string {
  if (accountType === "internal_user") return "border-[#aec8ec] bg-[#f0f6ff] text-[#2865a2]";
  if (accountType === "agency_admin") return "border-[#efce8b] bg-[#fff9ed] text-[#8a5a10]";
  return "border-[#99d8d5] bg-[#eefafa] text-[#087f82]";
}

function statusLabel(status: StaffDirectoryStatus): string {
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

function statusClass(status: StaffDirectoryStatus): string {
  if (status === "active") return "border-[#9edab7] bg-[#f1fbf4] text-[#237a46]";
  if (status === "suspended") return "border-[#efce8b] bg-[#fff9ed] text-[#9a6511]";
  if (status === "terminated") return "border-[#d5d9da] bg-[#f5f6f6] text-[#687173]";
  return "border-[#e4b5af] bg-[#fff5f3] text-[#9a4038]";
}

function staffRoleLabel(member: StaffDirectoryStaffMember): string {
  if (member.accountType !== "employee") return member.role || "Not assigned";
  const role = member.role?.trim().toLowerCase();
  if (role === "ddd" || role === "dsp") return "DSP";
  if (role === "hha" || role === "caregiver") return "Caregiver";
  return member.role || "Not assigned";
}

function createdDate(value: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : format(date, "MMM d, yyyy");
}

function initialsFor(staff: StaffDirectoryStaffMember): string {
  return staff.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "ST";
}

export default function StaffDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [previousCursors, setPreviousCursors] = useState<Array<string | undefined>>([]);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const hasInvalidSearch = normalizedSearchQuery.length > 0 && !SEARCH_TOKEN_PATTERN.test(normalizedSearchQuery);

  const { data, isLoading: isLoadingStaff, isFetching, isError, refetch } = useListStaffDirectoryQuery({
    agencyId: selectedAgencyId || undefined,
    search: debouncedSearchQuery.trim() || undefined,
    cursor,
    limit: PAGE_SIZE,
  });

  const agencies = useMemo(() => (data?.agencies ?? [])
    .filter((agency) => agency.id && agency.name)
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id)), [data?.agencies]);
  const visibleData = hasInvalidSearch ? undefined : data;
  const staff = visibleData?.staff ?? [];
  const stats = visibleData?.stats;
  const isLoading = !hasInvalidSearch && isLoadingStaff && !data;
  const isLoadingAgencies = isLoadingStaff && !data;
  const showError = !hasInvalidSearch && isError;
  const selectedAgencyName = agencies.find((agency) => agency.id === selectedAgencyId)?.name;
  const currentPage = previousCursors.length + 1;

  useEffect(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    if (hasInvalidSearch) return;
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(normalizedSearchQuery);
      setCursor(undefined);
      setPreviousCursors([]);
    }, 350);
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [hasInvalidSearch, normalizedSearchQuery]);

  const resetPagination = () => {
    setCursor(undefined);
    setPreviousCursors([]);
  };

  const handleNextPage = () => {
    const nextCursor = data?.pagination.nextCursor;
    if (!data?.pagination.hasMore || !nextCursor) return;
    setPreviousCursors((history) => [...history, cursor]);
    setCursor(nextCursor);
  };

  const handlePreviousPage = () => {
    if (previousCursors.length === 0) return;
    setCursor(previousCursors[previousCursors.length - 1]);
    setPreviousCursors((history) => history.slice(0, -1));
  };

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-5 pb-6">
      <header className="rounded-2xl border border-[#dce3e3] bg-[#f9fbfb] px-4 py-4 sm:px-5" aria-labelledby="staff-directory-title">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(0,31rem)] lg:items-end">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5f7778]">Operations</p>
            <h1 id="staff-directory-title" className="mt-1 text-[24px] font-semibold leading-tight text-[#10141a] sm:text-[28px]">Staff directory</h1>
            <p className="mt-2 max-w-xl text-[13px] text-[#687173]">Review staff accounts across the agencies you are authorized to manage.</p>
          </div>
          <div className="min-w-0">
            <label htmlFor="staff-directory-agency" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#687173]">Agency scope</label>
            <div className="relative">
              <Building2 aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#087f82]" />
              <select
                id="staff-directory-agency"
                aria-label="Agency scope"
                value={selectedAgencyId}
                onChange={(event) => { setSelectedAgencyId(event.target.value); resetPagination(); }}
                disabled={isLoadingAgencies}
                className="min-h-11 w-full appearance-none rounded-xl border border-[#cfd7d7] bg-[#fbfcfc] py-2 pl-10 pr-10 text-[13px] font-medium text-[#273033] transition-colors hover:border-[#8ebabb] focus:outline-none focus:ring-2 focus:ring-[#008f92] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                <option value="">All authorized agencies</option>
                {agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      <section aria-label="Staff summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Total staff", value: stats?.total ?? 0, detail: selectedAgencyName ? `Within ${selectedAgencyName}` : "Across all authorized agencies" },
          { label: "Active staff", value: stats?.active ?? 0, detail: "Available active accounts" },
          { label: "Internal users", value: stats?.internalUsers ?? 0, detail: "CareOnboard operations accounts" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#d9e4e4] bg-white p-5 shadow-[0_8px_28px_rgba(33,69,70,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#687173]">{item.label}</p>
            {isLoading ? <Skeleton className="mt-3 h-9 w-16 rounded" /> : <p className="mt-2 text-[32px] font-semibold leading-none text-[#10141a]">{item.value}</p>}
            <p className="mt-2 text-[12px] text-[#687173]">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#dfe6e6] bg-[#fdfefe] shadow-[0_16px_45px_rgba(33,69,70,0.08)]" aria-labelledby="staff-directory-list-title">
        <div className="flex flex-col gap-4 border-b border-[#e6ecec] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 id="staff-directory-list-title" className="text-[18px] font-semibold text-[#10141a]">Staff records</h2>
            <p className="mt-1 text-[12px] text-[#687173]" aria-live="polite">{isLoading ? "Loading staff records" : `${staff.length} record${staff.length === 1 ? "" : "s"} shown`}</p>
          </div>
          <div className="min-w-0 sm:w-[340px]">
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#748082]" />
              <Input
                aria-label="Search staff"
                aria-describedby="staff-directory-search-guidance"
                aria-invalid={hasInvalidSearch || undefined}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search one name or email token"
                className={`h-11 rounded-full bg-[#f6f9f9] pl-10 pr-10 text-[13px] focus-visible:ring-[#008f92]/30 ${hasInvalidSearch ? "border-[#d99b94]" : "border-[#d2dada]"}`}
              />
              {!hasInvalidSearch && isFetching && !isLoading && <Loader2 aria-label="Searching staff" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#748082]" />}
            </div>
            <p id="staff-directory-search-guidance" aria-live="polite" className={`mt-1.5 px-2 text-[11px] leading-4 ${hasInvalidSearch ? "font-medium text-[#9b3e33]" : "text-[#687173]"}`}>{SEARCH_GUIDANCE}</p>
          </div>
        </div>

        {showError ? (
          <div role="alert" className="p-10 text-center">
            <p className="text-[13px] font-semibold text-[#9b3e33]">Could not load staff records.</p>
            <Button type="button" variant="outline" className="mt-4" onClick={() => void refetch()}>Try again</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {isLoading ? <StaffDirectorySkeleton /> : staff.length === 0 ? (
              <div className="p-12 text-center"><p className="text-[14px] font-semibold text-[#273033]">{hasInvalidSearch ? "Enter a valid search token" : "No staff found"}</p><p className="mt-1 text-[12px] text-[#687173]">{hasInvalidSearch ? "Correct the highlighted search to continue." : "Try another search or agency scope."}</p></div>
            ) : (
              <table className="w-full min-w-[920px]">
                <thead className="bg-[#f5f8f8]"><tr>{["Staff member", "Account type", "Role", "Status", "Agency", "Created"].map((label) => <th key={label} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#687173]">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-[#edf1f1]">
                  {staff.map((member) => (
                    <tr key={member.id} className="transition-colors hover:bg-[#f7fbfb]">
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><Avatar className="h-10 w-10 shrink-0 rounded-full"><AvatarImage src={member.avatarUrl ?? undefined} alt="" /><AvatarFallback className="bg-[#087f82] text-xs font-semibold text-white">{initialsFor(member)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-[#20282a]">{member.name}</p><p className="mt-1 truncate text-[11px] text-[#687173]">{member.email || "No email on file"}</p></div></div></td>
                      <td className="px-5 py-4"><Badge variant="outline" className={`border px-2.5 py-1 text-[11px] font-semibold ${accountTypeClass(member.accountType)}`}>{accountTypeLabel(member.accountType)}</Badge></td>
                      <td className="max-w-[190px] px-5 py-4 text-[13px] text-[#4d5a5c]"><span className="block truncate">{staffRoleLabel(member)}</span></td>
                      <td className="px-5 py-4"><Badge variant="outline" className={`border px-2.5 py-1 text-[11px] font-semibold ${statusClass(member.status)}`}>{statusLabel(member.status)}</Badge></td>
                      <td className="max-w-[190px] px-5 py-4 text-[13px] text-[#4d5a5c]"><span className="block truncate">{member.agency.name}</span></td>
                      <td className="px-5 py-4 text-[12px] text-[#4d5a5c]">{createdDate(member.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!isLoading && !showError && staff.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#e6ecec] px-5 py-3">
            <p className="text-[12px] text-[#687173]">Page {currentPage}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="icon" aria-label="Previous page" disabled={previousCursors.length === 0 || isFetching} onClick={handlePreviousPage}><ChevronLeft className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" aria-label="Next page" disabled={!data?.pagination.hasMore || !data.pagination.nextCursor || isFetching} onClick={handleNextPage}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
