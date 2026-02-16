import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InlineLoader } from "@/components/ui/loader";
import { X } from "lucide-react";
import ServicesAvatar from "@/assets/icons/services-avatar.png";
import type { PlanOfCare } from "../types";
import { getInitials } from "../utils";

interface PlanOfCareModalProps {
  open: boolean;
  isLoading: boolean;
  plan: PlanOfCare | null;
  onClose: () => void;
}

export function PlanOfCareModal({
  open,
  isLoading,
  plan,
  onClose,
}: PlanOfCareModalProps) {
  if (!open) {
    return null;
  }

  console.log(plan)

  const displayName = plan?.clientName || "Client";

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">Plan of care</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              Here is a plan o care you can read
            </p>
          </div>
          <div className="flex items-center gap-4 ml-4">
            <div className="flex items-center text-right gap-3">
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500">Client</p>
              </div>
              <Avatar className="h-12 w-12">
                <AvatarImage src={ServicesAvatar} alt={displayName} />
                <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading && <InlineLoader text="Loading plan of care..." />}

          {!isLoading && plan && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Date</p>
                  <p className="text-sm text-gray-900">{plan.date || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Location</p>
                  <p className="text-sm text-gray-900">{plan.location || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Service</p>
                  <p className="text-sm text-gray-900">{plan.service || plan.serviceCode}</p>
                </div>
              </div>
              {plan.planOfCare?.url ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <iframe
                    src={plan.planOfCare.url}
                    title={plan.planOfCare.title || "Plan of Care PDF"}
                    className="w-full h-[60vh] border-0"
                  />
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {plan.content || "No plan of care content available."}
                  </p>
                </div>
              )}
            </div>
          )}

          {!isLoading && !plan && (
            <p className="text-sm text-gray-600">No plan of care details available.</p>
          )}
        </div>

        <div className="flex items-center justify-center px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2 bg-gray-400 text-white text-sm rounded-full hover:bg-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
