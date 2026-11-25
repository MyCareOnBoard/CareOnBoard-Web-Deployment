import type { ReactNode } from "react";
import { ChevronRight, Circle, CircleCheck } from "lucide-react";
import type { Applicant, PeriodFilter } from "@/lib/api/applicants";
import { cn } from "@/lib/utils";
import { AgencyProgressBar } from "@/components/agency/AgencyShell";
import {
  AgencyListCard, AgencyPagination, AgencyPerson, AgencySearchField, AgencySegmented, agencyRowLink,
  agencyTd, agencyTh, agencyTheadRow, agencyTr,
} from "@/components/agency/AgencyListKit";

interface ApplicantsListProps {
  applicants: Applicant[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterPeriod: PeriodFilter;
  onFilterChange: (period: PeriodFilter) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onApplicantSelect: (applicant: Applicant) => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
  /** Shown at the start of the toolbar (the Pending / All switch). */
  nav?: ReactNode;
}

const STAGES: { key: keyof Pick<Applicant, "profileScreening" | "documents" | "conditionalHire" | "finalAgencyReview" | "officialHire">; label: string }[] = [
  { key: "profileScreening", label: "Profile & Pre-Screening" },
  { key: "documents", label: "Documents" },
  { key: "conditionalHire", label: "Conditional Hire" },
  { key: "finalAgencyReview", label: "Final Agency Review" },
  { key: "officialHire", label: "Official Hire" },
];

const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

function StageChip({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={cn(
      "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-[6px] px-2 text-[12px] font-medium",
      done
        ? "bg-[#e6f6ec] text-[#1a7f37] dark:bg-[#30a46c]/15 dark:text-[#7ee2a8]"
        : "border border-[#e4e7ea] text-[#6b737a] dark:border-white/15 dark:text-[#9aa4a8]",
    )}>
      {done ? <CircleCheck aria-hidden="true" className="h-3.5 w-3.5" /> : <Circle aria-hidden="true" className="h-3.5 w-3.5" />}
      {label}
      <span className="sr-only">{done ? "(complete)" : "(not complete)"}</span>
    </span>
  );
}

export function ApplicantsList({
  applicants,
  searchQuery,
  onSearchChange,
  filterPeriod,
  onFilterChange,
  currentPage,
  totalPages,
  onPageChange,
  onApplicantSelect,
  isLoading,
  title = "All Applicants",
  description = "Browse and review applicants assigned to your agency.",
  nav,
}: ApplicantsListProps) {
  return (
    <div className="mt-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {nav}
          <AgencySegmented label="Applied" value={filterPeriod} onChange={onFilterChange} options={PERIODS} />
        </div>
        <AgencySearchField
          label="Search applicants"
          placeholder="Search applicants"
          value={searchQuery}
          onChange={onSearchChange}
          className="w-full lg:w-[280px]"
        />
      </div>

      <AgencyListCard label={title} className="mt-4">
        <div className="p-4">
          <h2 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">{title}</h2>
          <p className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">{description}</p>
        </div>

        {isLoading && (
          <div role="status" aria-label="Loading applicants" className="space-y-px border-t border-[#eceef0] dark:border-white/10">
            {[1, 2, 3].map((key) => <div key={key} aria-hidden="true" className="h-[62px] animate-pulse bg-[#f8f9fa] dark:bg-white/5" />)}
          </div>
        )}

        {!isLoading && applicants.length === 0 && (
          <div className="border-t border-[#eceef0] px-6 py-14 text-center dark:border-white/10">
            <p className="text-[16px] font-medium text-[#10141a] dark:text-[#f4f6f7]">No applicants found</p>
            <p className="mx-auto mt-1 max-w-xs text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
              Try adjusting your search or date filters to see more results.
            </p>
          </div>
        )}

        {!isLoading && applicants.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className={agencyTheadRow}>
                  <th scope="col" className={agencyTh}>Applicant</th>
                  <th scope="col" className={agencyTh}>Progress</th>
                  <th scope="col" className={agencyTh}>Stages</th>
                  <th scope="col" className={agencyTh}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((applicant) => {
                  const done = STAGES.filter((stage) => applicant[stage.key]).length;
                  return (
                    <tr key={applicant.id} onClick={() => onApplicantSelect(applicant)} className={cn(agencyTr, "cursor-pointer")}>
                      <td className={cn(agencyTd, "w-[260px]")}>
                        <AgencyPerson name={applicant.name} detail={applicant.role} imageUrl={applicant.profilePictureUrl} />
                      </td>
                      <td className={cn(agencyTd, "w-[130px]")}>
                        <span className="block text-[13px] font-medium tabular-nums">{done} of {STAGES.length}</span>
                        <AgencyProgressBar value={(done / STAGES.length) * 100} label={`${applicant.name} completed ${done} of ${STAGES.length} stages`} className="mt-1.5 w-[90px]" />
                      </td>
                      <td className={agencyTd}>
                        <div className="flex flex-wrap gap-1.5">
                          {STAGES.map((stage) => <StageChip key={stage.key} done={!!applicant[stage.key]} label={stage.label} />)}
                        </div>
                      </td>
                      <td className={cn(agencyTd, "text-right")} onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => onApplicantSelect(applicant)} className={agencyRowLink}
                          aria-label={`Details for ${applicant.name}`}>
                          Details<ChevronRight aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {applicants.length > 0 && (
          <AgencyPagination
            summary={`Page ${currentPage} of ${Math.max(totalPages, 1)}`}
            page={currentPage}
            pages={Math.max(totalPages, 1)}
            onPage={onPageChange}
          />
        )}
      </AgencyListCard>
    </div>
  );
}
