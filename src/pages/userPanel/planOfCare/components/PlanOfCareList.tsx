import { Loader2 } from "lucide-react";
import type { PlanOfCare } from "../types";
import { PlanOfCareListRow } from "./PlanOfCareListRow";

interface PlanOfCareListProps {
  plans: PlanOfCare[];
  isLoading: boolean;
  isFetching?: boolean;
  isError: boolean;
  onViewPlan: (plan: PlanOfCare) => void;
}

export function PlanOfCareList({
  plans,
  isLoading,
  isFetching = false,
  isError,
  onViewPlan,
}: PlanOfCareListProps) {
  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#808081]" />
        <p className="text-[14px] font-medium text-[#808081]">
          Loading your plans of care...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center px-4">
        <p className="text-[14px] font-medium text-red-600">
          Couldn&apos;t load plans of care.
        </p>
        <p className="text-[14px] font-medium text-[#808081] mt-1">
          Check your connection and try again.
        </p>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="py-12 text-center px-4">
        <p className="text-[14px] font-medium text-[#10141a]">
          No plans of care yet.
        </p>
        <p className="text-[14px] font-medium text-[#808081] mt-1">
          When you have assigned clients or shifts, they will show up here.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`space-y-3 transition-opacity ${isFetching ? "opacity-60" : ""}`}
    >
      {plans.map((plan) => (
        <PlanOfCareListRow key={plan.id} plan={plan} onViewPlan={onViewPlan} />
      ))}
    </div>
  );
}
