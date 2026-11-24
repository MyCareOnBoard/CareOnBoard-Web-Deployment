/** Dashboard chart palette from the agency design: teal, dark teal, amber, then neutrals. */
export const CHART = {
    teal: "#12b5b0",
    dark: "#0b3b3c",
    amber: "#e0b400",
    violet: "#7c6fd6",
    grey: "#b9bec2",
    track: "#eef1f3",
} as const;

/** Risk indicator series keyed by the analytics summary's breakdown and trend keys. */
export const RISK_COLORS: Record<string, string> = {
    expiredCertification: CHART.teal,
    expired: CHART.teal,
    overtimeRisk: CHART.dark,
    overtime: CHART.dark,
    missingDocuments: CHART.amber,
    missingDocument: CHART.amber,
    missing: CHART.amber,
    unsignedForm485: CHART.violet,
    other: CHART.grey,
};

/** Billing segments in order: billed, pending, not billable. */
export const BILLING_COLORS = [CHART.teal, CHART.amber, CHART.grey];
