import type {
	BillingPlanCode,
	BillingSubscriptionStatus,
} from "@/pages/super-admin/agency-billing-monitor/api";

export type BillingStatusTab = "active" | "inactive";

export type BillingOverride = {
	plan?: BillingPlanCode;
	subscriptionStart?: string;
	subscriptionEnd?: string;
	status?: BillingSubscriptionStatus;
};
