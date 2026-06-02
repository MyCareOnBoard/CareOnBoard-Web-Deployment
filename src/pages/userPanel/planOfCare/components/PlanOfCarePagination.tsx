import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGER_BUTTON } from "../planOfCareStyles";

interface PlanOfCarePaginationProps {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function PlanOfCarePagination({
  page,
  totalPages,
  onPrevious,
  onNext,
}: PlanOfCarePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-6 flex items-center justify-center gap-2 px-6 pb-2">
      <span className="text-[16px] font-medium leading-[1.6] text-[#10141a]">
        {page}
        <span className="text-[14px] text-[#808081]">/{totalPages}</span>
      </span>
      <button
        type="button"
        onClick={onPrevious}
        disabled={page <= 1}
        className={PAGER_BUTTON}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5 text-[#10141a]" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages}
        className={PAGER_BUTTON}
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5 text-[#10141a]" />
      </button>
    </div>
  );
}
