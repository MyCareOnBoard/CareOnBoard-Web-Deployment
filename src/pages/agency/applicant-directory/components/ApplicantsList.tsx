import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ChevronLeft, ChevronRight, CheckCircle2, ArrowUpRight } from "lucide-react";
import type { Applicant } from "@/lib/api/applicants";

interface ApplicantsListProps {
  applicants: Applicant[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterPeriod: "today" | "week" | "month";
  onFilterChange: (period: "today" | "week" | "month") => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onApplicantSelect: (applicant: Applicant) => void;
  isLoading?: boolean;
  onViewFullList?: () => void;
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

interface ApplicantRowProps {
  applicant: Applicant;
  onClick: (applicant: Applicant) => void;
}

function ApplicantRow({ applicant, onClick }: ApplicantRowProps) {
  return (
    <div
      key={applicant.id}
      onClick={() => onClick(applicant)}
      className="flex flex-wrap gap-4 md:flex-row md:items-center md:justify-between px-4 py-3 hover:bg-[#f8f9fa] cursor-pointer transition-colors rounded-[20px] w-full"
    >
      <div className="flex flex-wrap items-center gap-4 md:flex-1">
        {/* Avatar */}
        <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
          {(applicant as any).profilePictureUrl && (
            <AvatarImage
              src={(applicant as any).profilePictureUrl}
              alt={applicant.name}
              className="w-full h-full object-cover aspect-auto rounded-[8px]"
            />
          )}
          <AvatarFallback className="w-full h-full rounded-[8px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
            {getInitials(applicant.name)}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-[160px]">
          <h3 className="text-[16px] font-semibold text-[#10141a] leading-[1.6] mb-0.5">
            {applicant.name}
          </h3>
          <p className="text-[14px] font-medium text-[#808081] leading-[1.4]">
            {applicant.role}
          </p>
        </div>

        {/* Stage Pills */}
        <div className="flex flex-wrap gap-2">
          <div
            className={`flex items-center gap-[4px] px-[10px] py-2 rounded-[60px] text-[14px] font-semibold whitespace-nowrap border-[0.5px] ${applicant.profileScreening
              ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
              : "bg-[rgba(128,128,129,0.05)] text-[#525253] border-[#525253]"
              }`}
          >
            <CheckCircle2 className="w-5 h-5" strokeWidth={2.2} />
            Profile & Pre-Screening
          </div>

          <div
            className={`flex items-center gap-[4px] px-[10px] py-2 rounded-[60px] text-[14px] font-semibold whitespace-nowrap border-[0.5px] ${applicant.documents
              ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
              : "bg-[rgba(128,128,129,0.05)] text-[#525253] border-[#525253]"
              }`}
          >
            <CheckCircle2 className="w-5 h-5" strokeWidth={2.2} />
            Documents
          </div>

          <div
            className={`flex items-center gap-[4px] px-[10px] py-2 rounded-[60px] text-[14px] font-semibold whitespace-nowrap border-[0.5px] ${applicant.conditionalHire
              ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
              : "bg-[rgba(128,128,129,0.05)] text-[#525253] border-[#525253]"
              }`}
          >
            <CheckCircle2 className="w-5 h-5" strokeWidth={2.2} />
            Conditional Hire
          </div>

          <div
            className={`flex items-center gap-[4px] px-[10px] py-2 rounded-[60px] text-[14px] font-semibold whitespace-nowrap border-[0.5px] ${applicant.finalAgencyReview
              ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
              : "bg-[rgba(128,128,129,0.05)] text-[#525253] border-[#525253]"
              }`}
          >
            <CheckCircle2 className="w-5 h-5" strokeWidth={2.2} />
            Final Agency Review
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 md:self-auto self-start" onClick={(e) => e.stopPropagation()}>
          <Button
            onClick={() => onClick(applicant)}
            className="bg-[#b2b2b3] border border-[#b2b2b3] hover:bg-[#9ca3af] text-white rounded-[60px] px-6 h-9 text-[14px] font-semibold shadow-none"
          >
            Details
          </Button>
        </div>
      </div>
    </div>
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
  onViewFullList,
}: ApplicantsListProps) {
  console.log(applicants)
  return (
    <div className="bg-white rounded-[30px] border border-[#e5e5e6] p-4 md:p-6 w-full">
      {/* Filters Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-[180px]">
          <h2 className="text-base font-semibold text-[#10141a] mb-1">
            Pending Applicants
          </h2>
          <p className="text-sm text-[#808081]">
            These are your Pending Applicants
          </p>
        </div>

        <div className="flex flex-wrap gap-3 md:flex-row md:items-center md:justify-end md:gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#808081] pointer-events-none" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 h-10 w-full md:w-[280px] border-[#e5e5e6] rounded-lg focus-visible:ring-1 focus-visible:ring-[#2563eb]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["today", "week", "month"] as const).map((period) => (
              <Button
                key={period}
                onClick={() => onFilterChange(period)}
                className={`h-10 rounded-full px-5 text-sm font-medium shadow-none ${filterPeriod === period
                  ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                  : "bg-transparent text-[#808081] border border-[#e5e5e6] hover:bg-[#f8f9fa]"
                  }`}
              >
                {period === "today" && "Today"}
                {period === "week" && "This Week"}
                {period === "month" && "This month"}
              </Button>
            ))}

            {onViewFullList && (
              <button
                type="button"
                className="p-2 text-gray-400 transition-colors rounded-b-full shadow-md cursor-pointer hover:text-gray-600"
                onClick={onViewFullList}
                aria-label="View all pending applicants"
              >
                <ArrowUpRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Applicants List */}
      <div className="space-y-3 mb-6">
        {isLoading && (
          <div className="py-8 space-y-4">
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="flex items-center justify-between p-4 border-b border-[#e5e5e6] last:border-0"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 rounded-full bg-[#e5e7eb] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-[#e5e7eb] rounded-full animate-pulse" />
                    <div className="h-3 w-24 bg-[#e5e7eb] rounded-full animate-pulse" />
                  </div>
                  <div className="flex-1 flex gap-2">
                    {[1, 2, 3, 4].map((pill) => (
                      <div
                        key={pill}
                        className="h-8 flex-1 bg-[#f3f4f6] rounded-full animate-pulse"
                      />
                    ))}
                  </div>
                </div>
                <div className="w-20 h-9 bg-[#e5e7eb] rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && applicants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[#808081]">
            <div className="mb-3 text-3xl">🔍</div>
            <p className="text-sm font-medium mb-1">No applicants found</p>
            <p className="text-xs max-w-xs">
              Try adjusting your search or date filters to see more results.
            </p>
          </div>
        )}

        {!isLoading &&
          applicants.length > 0 &&
          applicants.map((applicant) => (
            <ApplicantRow
              key={applicant.id}
              applicant={applicant}
              onClick={onApplicantSelect}
            />
          ))}
      </div>

      {/* Pagination */}
      {applicants.length > 0 && (
        <div className="flex items-center justify-center gap-4 py-5 border-t border-[#e5e5e6]">
          <span className="text-sm text-[#808081]">
            {currentPage}/{Math.max(totalPages, 1)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e5e5e6] hover:bg-[#f8f9fa] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages || 1, currentPage + 1))}
              disabled={totalPages !== 0 && currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e5e5e6] hover:bg-[#f8f9fa] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
