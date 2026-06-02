import { memo, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAppDispatch } from "@/store/redux/hooks";
import { Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Routes } from "@/routes/constants";
import { planOfCareApi } from "../api";
import type { PlanOfCare } from "../types";
import { PlanOfCareClientAvatar } from "./PlanOfCareClientAvatar";
import {
  CLIENT_NAME,
  CLIENT_ROLE,
  META_LABEL,
  META_VALUE,
  ROW_CARD,
} from "../planOfCareStyles";

const goalsTypeRouteMap: Record<string, string> = {
  natural_supports_training: Routes.userPanel.goalsAndDocuments.naturalSupportsTraining,
  community_inclusion_services: Routes.userPanel.goalsAndDocuments.communityInclusionServices,
  community_inclusion_individualized_goals:
    Routes.userPanel.goalsAndDocuments.communityInclusionIndividualizedGoals,
  day_habilitation_services: Routes.userPanel.goalsAndDocuments.dayHabilitationServices,
  day_habilitation_individualized_goals:
    Routes.userPanel.goalsAndDocuments.dayHabilitationIndividualizedGoals,
  prevocational_training_services:
    Routes.userPanel.goalsAndDocuments.prevocationalTrainingServices,
  prevocational_training_individualized_goals:
    Routes.userPanel.goalsAndDocuments.prevocationalTrainingIndividualizedGoals,
};

interface PlanOfCareListRowProps {
  plan: PlanOfCare;
  onViewPlan: (plan: PlanOfCare) => void;
}

function PlanOfCareListRowInner({ plan, onViewPlan }: PlanOfCareListRowProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = plan.location?.trim() || "—";

  const prefetchDetailIfNeeded = useCallback(() => {
    if (plan.planOfCare?.url) return;
    dispatch(
      planOfCareApi.util.prefetch("getPlanOfCareById", plan.clientId, {
        force: false,
      })
    );
  }, [dispatch, plan.clientId, plan.planOfCare?.url]);
  const serviceLabel =
    plan.serviceName || plan.service || plan.serviceCode || "—";
  const showGoals =
    plan.goalsAndDocumentId &&
    plan.goalsType &&
    goalsTypeRouteMap[plan.goalsType];

  return (
    <div className={ROW_CARD}>
      <div className="flex items-center gap-4 w-full sm:w-[220px] shrink-0 min-w-0">
        <PlanOfCareClientAvatar
          name={plan.clientName}
          imageUrl={plan.clientImage}
          size="list"
        />
        <div className="min-w-0 flex-1">
          <p className={CLIENT_NAME}>{plan.clientName}</p>
          <p className={CLIENT_ROLE}>Client</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1 min-w-0">
        <div>
          <p className={META_LABEL}>Date</p>
          <p className={META_VALUE}>{plan.date || "—"}</p>
        </div>
        <div className="min-w-0">
          <p className={META_LABEL}>Location</p>
          <p
            className={`${META_VALUE} truncate max-w-[200px] sm:max-w-none`}
            title={location !== "—" ? location : undefined}
          >
            {location}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className={META_LABEL}>Service</p>
          <p className={`${META_VALUE} truncate`} title={serviceLabel}>
            {serviceLabel}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
        {showGoals && (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto min-h-[44px] sm:min-h-9 h-auto px-4 text-sm font-semibold border-[#00B4B8] text-[#00B4B8] hover:bg-[#00B4B8]/10"
            onClick={() => {
              const route = goalsTypeRouteMap[plan.goalsType!];
              navigate(
                `${route}?firebaseId=${encodeURIComponent(plan.goalsAndDocumentId!)}&fromList=true`
              );
            }}
          >
            <Eye className="w-4 h-4" />
            View goals
          </Button>
        )}
        <Button
          type="button"
          className="w-full sm:w-auto min-h-[44px] sm:min-h-9 h-auto px-4 text-sm font-semibold bg-[#00B4B8] hover:bg-[#00A0A4] text-white"
          onMouseEnter={prefetchDetailIfNeeded}
          onFocus={prefetchDetailIfNeeded}
          onClick={() => onViewPlan(plan)}
        >
          <FileText className="w-4 h-4" />
          View plan of care
        </Button>
      </div>
    </div>
  );
}

export const PlanOfCareListRow = memo(PlanOfCareListRowInner);
