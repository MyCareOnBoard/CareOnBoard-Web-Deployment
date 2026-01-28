import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PlanOfCarePaginationProps {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onPageChange: (page: number) => void;
}

export function PlanOfCarePagination({
  page,
  totalPages,
  onPrevious,
  onNext,
  onPageChange,
}: PlanOfCarePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-gray-100">
      <Button
        variant="ghost"
        size="sm"
        onClick={onPrevious}
        disabled={page === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (page <= 3) {
            pageNum = i + 1;
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = page - 2 + i;
          }

          return (
            <Button
              key={pageNum}
              variant={page === pageNum ? "default" : "ghost"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              className={`h-8 w-8 p-0 ${
                page === pageNum
                  ? "bg-[#00B4B8] text-white hover:bg-[#00A0A4]"
                  : "text-gray-700"
              }`}
            >
              {pageNum}
            </Button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onNext}
        disabled={page === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
