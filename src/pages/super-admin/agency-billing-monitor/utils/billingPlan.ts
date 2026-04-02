import type { BillingPlanCode } from "@/pages/super-admin/agency-billing-monitor/api";

export type PlanName = "Basic Plan" | "Pro Plan" | "Enterprise";

export const PLAN_OPTIONS: { label: PlanName; value: BillingPlanCode }[] = [
	{ label: "Basic Plan", value: "basic" },
	{ label: "Pro Plan", value: "pro" },
	{ label: "Enterprise", value: "enterprise" },
];

export function normalizePlanLabel(plan?: string): PlanName {
	const p = (plan || "").toLowerCase();
	if (p === "enterprise") return "Enterprise";
	if (p === "pro") return "Pro Plan";
	return "Basic Plan";
}

export function planCodeFromLabel(label: PlanName): BillingPlanCode {
	if (label === "Enterprise") return "enterprise";
	if (label === "Pro Plan") return "pro";
	return "basic";
}
