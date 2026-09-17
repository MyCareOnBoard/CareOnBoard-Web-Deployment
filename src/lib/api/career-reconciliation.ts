export type FindingCode =
  | "no_notes"
  | "notes_unapproved"
  | "units_invalid"
  | "signature_invalid"
  | "linked_record_unavailable"
  | "authorization_needs_review"
  | "clock_missing"
  | "clock_invalid"
  | "time_difference"
  | "note_overlap"
  | "shift_status_review"
  | "claim_units_invalid"
  | "claim_unit_basis_missing"
  | "claim_link_invalid"
  | "mixed_authorizations";
export type Finding = { code: FindingCode };
export type Units = { value: number | null; complete: boolean };
export type NoteSummary = {
  approved: Units;
  submitted: Units;
  draft: Units;
  approvedRowCount: number;
  submittedRowCount: number;
  draftRowCount: number;
  complete: boolean;
  findings: Finding[];
};
export type AttendanceSummary = {
  status: "match" | "review" | "unavailable";
  clockStart: string | null;
  clockEnd: string | null;
  clockSeconds: number | null;
  documentedSeconds: number | null;
  recordedSeconds: number | null;
  findings: Finding[];
  intervals: Array<{ serviceDate: string | null; start: string; end: string }>;
};
export type ShiftReview = {
  shiftId: string;
  date: string;
  status: string;
  employeeName: string | null;
  authorizationId: string | null;
  authorizationLabel: string | null;
  authorizationNeedsReview: boolean;
  notes: NoteSummary;
  attendance: AttendanceSummary;
  sources: {
    activityLogId?: string;
    submissionIds?: string[];
    planId?: string;
    shiftId?: string;
  };
  claimId?: string; // Absent, not null, when billing is denied.
};
export type ClaimSummary = { id: string; claimNumber: string; status: string };
export type ReviewOverview = {
  evaluatedAt: string;
  timezone: string;
  clientId: string;
  filters: {
    startDate: string;
    endDate: string;
    authorization: "all" | "exact" | "needs_review";
    serviceAuthorizationId?: string;
  };
  authorizationChoices: Array<{ id: string; label: string }>;
  coverage: {
    selection: "shift_start_date";
    undatedExcluded: true;
    orphanClaimsChecked: false;
  };
  totals: NoteSummary;
  shifts: ShiftReview[];
  billing:
    | { access: "denied" }
    | { access: "allowed"; claims: ClaimSummary[]; findings: Finding[] };
};
export type ClaimReview = {
  evaluatedAt: string;
  clientId: string;
  claim: ClaimSummary;
  startDate: string | null;
  endDate: string | null; // Whole bundle's shift dates.
  savedUnits: number | null;
  unitBasis: "not_recorded";
  approvedUnits: number | null;
  complete: boolean;
  mixedAuthorizations: boolean;
  shifts: ShiftReview[];
  findings: Finding[];
};
export type CareerOverviewArgs = ReviewOverview["filters"] & {
  scopeKey: string;
  agencyId?: string;
  clientId: string;
};
export type CareerClaimArgs = {
  scopeKey: string;
  agencyId?: string;
  clientId: string;
  claimId: string;
};

export function canReviewCareer(
  user:
    | {
        userType?: string;
        profile?: {
          accessList?: string[];
          isActive?: boolean;
          status?: string;
          agencyModes?: string[];
        };
      }
    | null
    | undefined,
) {
  if (
    !user ||
    user.profile?.isActive === false ||
    ["inactive", "suspended", "disabled", "deleted"].includes(
      user.profile?.status ?? "",
    )
  )
    return false;
  const access = user.profile?.accessList ?? [];
  if (user.userType === "agency") return true;
  if (user.userType === "super_admin")
    return (
      (!user.profile?.agencyModes ||
        user.profile.agencyModes.includes("ddd")) &&
      ["Clients Directory", "Notes"].every((p) => access.includes(p))
    );
  return (
    user.userType === "agency_staff" &&
    (!user.profile?.agencyModes || user.profile.agencyModes.includes("ddd")) &&
    ["Client Management", "Notes"].every((p) => access.includes(p)) &&
    ["Shift Management", "Scheduling"].some((p) => access.includes(p))
  );
}
export function defaultReviewFilters(
  timezone: string,
  now = new Date(),
): ReviewOverview["filters"] {
  const endDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const start = new Date(endDate + "T00:00:00Z");
  start.setUTCDate(start.getUTCDate() - 29);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate,
    authorization: "all",
  };
}
export function validCareerReviewId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 512 &&
    !/[\/\\\x00-\x1f]/.test(value)
  );
}
export function validReviewFilters(filters: ReviewOverview["filters"]) {
  const validDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  const days =
    (Date.parse(filters.endDate) - Date.parse(filters.startDate)) / 86400000;
  return (
    validDate(filters.startDate) &&
    validDate(filters.endDate) &&
    days >= 0 &&
    days < 90 &&
    ["all", "exact", "needs_review"].includes(filters.authorization) &&
    (filters.authorization === "exact"
      ? validCareerReviewId(filters.serviceAuthorizationId)
      : filters.serviceAuthorizationId === undefined)
  );
}
export const careerFindingCopy: Record<FindingCode, string> = {
  no_notes: "No notes recorded. Open shift notes.",
  notes_unapproved: "Notes are not fully approved. Open notes for review.",
  units_invalid: "Recorded note units are invalid or unavailable.",
  signature_invalid: "Signed note evidence could not be verified.",
  linked_record_unavailable:
    "Linked record unavailable. Ask an agency administrator to review it.",
  authorization_needs_review: "Authorization needs review.",
  clock_missing: "Clock-in or clock-out is missing. Open the shift.",
  clock_invalid: "Clock records are invalid or unavailable.",
  time_difference:
    "Recorded time differs from clock records. Review the highlighted intervals.",
  note_overlap: "Approved note intervals overlap. Review these notes.",
  shift_status_review: "Shift status requires review.",
  claim_units_invalid: "Saved claim units are invalid or unavailable.",
  claim_unit_basis_missing:
    "Saved claim units have no recorded unit basis. Open the billing report for manual review.",
  claim_link_invalid:
    "Linked claim unavailable. Ask an agency administrator to review it.",
  mixed_authorizations:
    "This claim contains multiple authorizations. The whole bundle is shown.",
};
