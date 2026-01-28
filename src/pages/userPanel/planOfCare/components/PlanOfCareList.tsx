import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InlineLoader } from "@/components/ui/loader";
import { Eye } from "lucide-react";
import ServicesAvatar from "@/assets/icons/services-avatar.png";
import type { PlanOfCare } from "../types";
import { getInitials } from "../utils";

interface PlanOfCareListProps {
  plans: PlanOfCare[];
  isLoading: boolean;
  isError: boolean;
  onViewPlan: (plan: PlanOfCare) => void;
}


export function PlanOfCareList({ plans, isLoading, isError, onViewPlan }: PlanOfCareListProps) {
  useEffect(() => {
    console.log("Plan of care response:", plans);
  }, [plans]);

  return (
    <div className="divide-y divide-gray-100">
      {isLoading && (
        <div className="px-6 py-8">
          <InlineLoader text="Loading plans of care..." />
        </div>
      )}

      {!isLoading && isError && (
        <div className="px-6 py-8 text-sm text-red-600">
          Unable to load plans of care. Please try again.
        </div>
      )}

      {!isLoading && !isError && plans.length === 0 && (
        <div className="px-6 py-8 text-sm text-gray-600">No plans of care found.</div>
      )}

      {!isLoading && !isError &&
        plans.map((plan) => (
          <div
            key={plan.id}
            className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-[#e2eaea] transition-colors items-center"
          >
            <div className="col-span-3 flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={ServicesAvatar} alt={plan.clientName} />
                <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                  {getInitials(plan.clientName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {plan.clientName}
                </p>
                <p className="text-xs text-gray-500">Client</p>
              </div>
            </div>

            <div className="col-span-2 flex items-center">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Date</p>
                <p className="text-sm text-gray-900">{plan.date || "—"}</p>
              </div>
            </div>

            <div className="col-span-2 flex items-center">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Location</p>
                <p className="text-sm text-gray-900">{plan.location || "—"}</p>
              </div>
            </div>

            <div className="col-span-3 flex items-center">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Service</p>
                <p className="text-sm text-gray-900">{plan.service || "—"}</p>
              </div>
            </div>

            <div className="col-span-2 flex items-center justify-end">
              <button
                onClick={() => onViewPlan(plan)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-full hover:bg-gray-300 transition-colors hover:cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                View Plan of care
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
