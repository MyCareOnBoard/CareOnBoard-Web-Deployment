import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { Routes } from "@/routes/constants";
import { shortClientId } from "@/pages/userPanel/dashboard/components/UpcomingTasks";
import type { PlanOfCare } from "./types";
import { isAllowedStorageUrl } from "./utils/storageUrl";

export type PlanStatus = "active" | "review_due" | "expired" | "missing";

/** A plan whose document expires within this many days is due for review. */
export const REVIEW_WINDOW_DAYS = 30;

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  active: "Active",
  review_due: "Review due",
  expired: "Expired",
  missing: "Not uploaded",
};

export const PLAN_STATUS_TONE = { active: "green", review_due: "amber", expired: "red", missing: "neutral" } as const satisfies Record<PlanStatus, string>;

export const GOALS_ROUTES: Record<string, string> = {
  natural_supports_training: Routes.userPanel.goalsAndDocuments.naturalSupportsTraining,
  community_inclusion_services: Routes.userPanel.goalsAndDocuments.communityInclusionServices,
  community_inclusion_individualized_goals: Routes.userPanel.goalsAndDocuments.communityInclusionIndividualizedGoals,
  day_habilitation_services: Routes.userPanel.goalsAndDocuments.dayHabilitationServices,
  day_habilitation_individualized_goals: Routes.userPanel.goalsAndDocuments.dayHabilitationIndividualizedGoals,
  prevocational_training_services: Routes.userPanel.goalsAndDocuments.prevocationalTrainingServices,
  prevocational_training_individualized_goals: Routes.userPanel.goalsAndDocuments.prevocationalTrainingIndividualizedGoals,
};

/** Link to the goals document from the client's latest shift, when it has one. */
export function goalsHref(plan: PlanOfCare) {
  const route = plan.goalsType ? GOALS_ROUTES[plan.goalsType] : undefined;
  if (!route || !plan.goalsAndDocumentId) return null;
  return `${route}?firebaseId=${encodeURIComponent(plan.goalsAndDocumentId)}&fromList=true`;
}

export function parseDate(value: string | null | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const iso = parseISO(trimmed);
  if (isValid(iso)) return iso;
  const loose = new Date(trimmed);
  return isValid(loose) ? loose : null;
}

export function formatDate(value: string | null | undefined): string | null {
  const date = parseDate(value);
  return date ? format(date, "MMM d, yyyy") : null;
}

export function planStatus(plan: PlanOfCare, now: Date = new Date()): PlanStatus {
  // A link the viewer would refuse to show counts as not uploaded.
  if (!isAllowedStorageUrl(plan.planOfCare?.url)) return "missing";
  const expiry = parseDate(plan.planOfCare?.expiryDate);
  if (!expiry) return "active";
  const daysLeft = differenceInCalendarDays(expiry, now);
  if (daysLeft < 0) return "expired";
  return daysLeft <= REVIEW_WINDOW_DAYS ? "review_due" : "active";
}

/** Field staff see a short client id only; support coordinators may see names. */
export function clientLabel(plan: PlanOfCare, showNames: boolean) {
  const name = plan.clientName?.trim();
  if (showNames && name) return name;
  return `Client #${shortClientId(plan.clientId) ?? "—"}`;
}

export const serviceLabel = (plan: PlanOfCare) => plan.serviceName || plan.service || plan.serviceCode || null;

export function planOverview(plans: PlanOfCare[], now: Date = new Date()) {
  const counts = { active: 0, review_due: 0, expired: 0, missing: 0 };
  for (const plan of plans) counts[planStatus(plan, now)] += 1;
  return {
    clients: plans.length,
    activePlans: counts.active + counts.review_due,
    reviewsDue: counts.review_due + counts.expired,
    missing: counts.missing,
  };
}

export function filterPlans(plans: PlanOfCare[], search: string, showNames: boolean) {
  const query = search.trim().toLowerCase();
  if (!query) return plans;
  return plans.filter((plan) => [clientLabel(plan, showNames), serviceLabel(plan), plan.serviceCode, plan.location, PLAN_STATUS_LABEL[planStatus(plan)]]
    .some((text) => text?.toLowerCase().includes(query)));
}
