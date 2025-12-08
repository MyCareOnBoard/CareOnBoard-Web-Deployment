import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, Check } from "lucide-react";

interface Applicant {
  id: string;
  name: string;
  stages: {
    profilePreScreening: boolean;
    documents: boolean;
    conditionalHire: boolean;
    finalAgencyReview: boolean;
  };
}

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
}: ApplicantsListProps) {
  return (
    <div className="bg-white rounded-[20px] border border-[#e5e5e6] p-6">
      {/* Filters Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-[#10141a] mb-1">
            Applicant Directory
          </h2>
          <p className="text-sm text-[#808081]">
            These are your Pending Billing Approvals
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#808081] pointer-events-none" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 h-10 w-[280px] border-[#e5e5e6] rounded-lg focus-visible:ring-1 focus-visible:ring-[#2563eb]"
            />
          </div>

          <div className="flex items-center gap-2">
            {(["today", "week", "month"] as const).map((period) => (
              <Button
                key={period}
                onClick={() => onFilterChange(period)}
                className={`h-10 rounded-full px-5 text-sm font-medium shadow-none ${
                  filterPeriod === period
                    ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                    : "bg-transparent text-[#808081] border border-[#e5e5e6] hover:bg-[#f8f9fa]"
                }`}
              >
                {period === "today" && "Today"}
                {period === "week" && "This Week"}
                {period === "month" && "This month"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Applicants List */}
      <div className="space-y-0 mb-6">
        {applicants.map((applicant) => (
          <div
            key={applicant.id}
            onClick={() => onApplicantSelect(applicant)}
            className="flex items-center justify-between p-4 hover:bg-[#f8f9fa] border-b border-[#e5e5e6] last:border-0 cursor-pointer transition-colors rounded-lg"
          >
            <div className="flex items-center gap-4 flex-1">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                <img
                  src={`https://i.pravatar.cc/56?img=${applicant.id}`}
                  alt={applicant.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-[180px]">
                <h3 className="text-base font-semibold text-[#10141a] mb-1">
                  {applicant.name}
                </h3>
                <p className="text-sm text-[#808081]">Applicant</p>
              </div>

              {/* Stage Pills */}
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium ${
                    applicant.stages.profilePreScreening
                      ? "bg-[#d1fae5] text-[#10b981]"
                      : "bg-[#f3f4f6] text-[#d1d5db]"
                  }`}
                >
                  {applicant.stages.profilePreScreening && (
                    <div className="w-[14px] h-[14px] rounded-full bg-[#10b981] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  Profile & Pre-Screening
                </div>

                <div
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium ${
                    applicant.stages.documents
                      ? "bg-[#d1fae5] text-[#10b981]"
                      : "bg-[#f3f4f6] text-[#d1d5db]"
                  }`}
                >
                  {applicant.stages.documents && (
                    <div className="w-[14px] h-[14px] rounded-full bg-[#10b981] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  Documents
                </div>

                <div
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium ${
                    applicant.stages.conditionalHire
                      ? "bg-[#d1fae5] text-[#10b981]"
                      : "bg-[#f3f4f6] text-[#d1d5db]"
                  }`}
                >
                  {applicant.stages.conditionalHire && (
                    <div className="w-[14px] h-[14px] rounded-full bg-[#10b981] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  Conditional Hire
                </div>

                <div
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium ${
                    applicant.stages.finalAgencyReview
                      ? "bg-[#d1fae5] text-[#10b981]"
                      : "bg-[#f3f4f6] text-[#d1d5db]"
                  }`}
                >
                  {applicant.stages.finalAgencyReview && (
                    <div className="w-[14px] h-[14px] rounded-full bg-[#10b981] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  Final Agency Review
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  onClick={() => onApplicantSelect(applicant)}
                  className="bg-[#9ca3af] hover:bg-[#6b7280] text-white rounded-full px-5 h-9 text-sm font-medium shadow-none"
                >
                  Details
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4 py-5 border-t border-[#e5e5e6]">
        <span className="text-sm text-[#808081]">
          {currentPage}/{totalPages}
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
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e5e5e6] hover:bg-[#f8f9fa] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
