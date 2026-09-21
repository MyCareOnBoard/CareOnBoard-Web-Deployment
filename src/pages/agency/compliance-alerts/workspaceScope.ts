export type Source =
  | "document_expiry"
  | "training"
  | "client_documents"
  | "manual_audits"
  | "unsigned_form485"
  | "shift_notes";
export type Section = "staff" | "clients" | "shifts";
export interface ComplianceView {
  initialRunId?: string;
  section?: Section;
  source?: Source;
  mode?: "ddd" | "hha";
  employeeId?: string;
  clientId?: string;
  shiftId?: string;
  search?: string;
  employeeStatus?: string;
  condition?: string;
  status?: string;
  stateGroup?: "unresolved" | "submitted" | "approved" | "inactive" | "all";
  startDate?: string;
  endDate?: string;
  cursor?: string;
  staffCursor?: string;
  auditId?: string;
  auditView?: "follow_up_needed" | "recorded" | "drafts" | "discarded";
}
export type ViewParseResult =
  | { ok: true; view: ComplianceView }
  | { ok: false; message: string };
type ScopeUser =
  | {
      userType?: string;
      profile?: {
        accessList?: unknown;
        agencyModes?: unknown;
        supportedClientTypes?: unknown;
        isActive?: boolean;
        status?: string;
      };
      agency?: { supportedClientTypes?: unknown; status?: string };
    }
  | null
  | undefined;
export const sourceSection: Record<Source, Section> = {
  document_expiry: "staff",
  training: "staff",
  client_documents: "clients",
  manual_audits: "clients",
  unsigned_form485: "clients",
  shift_notes: "shifts",
};
export const sourceLabels: Record<Source, string> = {
  document_expiry: "Document expiry",
  training: "Training assignments",
  client_documents: "Document checklist",
  manual_audits: "Manual audits",
  unsigned_form485: "Unsigned Form 485",
  shift_notes: "Shift notes",
};
const validPrograms = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  new Set(value).size === value.length &&
  value.every((mode) => ["ddd", "hha", "sc"].includes(mode));
export function getComplianceSources(
  user: ScopeUser,
  mode: string | null | undefined,
): Source[] {
  if (
    !user ||
    !mode ||
    !["ddd", "hha", "sc"].includes(mode) ||
    !["agency", "agency_staff"].includes(user.userType || "")
  )
    return [];
  if (
    user.profile?.isActive === false ||
    ["inactive", "suspended", "deleted", "disabled", "archived"].includes(
      user.profile?.status || "",
    ) ||
    ["inactive", "suspended", "deleted", "disabled", "archived"].includes(
      user.agency?.status || "",
    )
  )
    return [];
  const programs =
    user.agency && Object.hasOwn(user.agency, "supportedClientTypes")
      ? user.agency.supportedClientTypes
      : user.profile?.supportedClientTypes;
  if (
    programs !== undefined &&
    (!validPrograms(programs) || !programs.includes(mode))
  )
    return [];
  const grants = user.profile?.agencyModes;
  if (
    grants !== undefined &&
    (!validPrograms(grants) || !grants.includes(mode))
  )
    return [];
  const owner = user.userType === "agency";
  const access = Array.isArray(user.profile?.accessList)
    ? user.profile.accessList
    : [];
  if (!owner && !access.includes("Compliance Alerts")) return [];
  const has = (key: string) => owner || access.includes(key);
  const sources: Source[] = [];
  if (has("DSP Management")) sources.push("document_expiry");
  if (has("Trainings")) sources.push("training");
  if (mode !== "sc" && has("Client Management"))
    sources.push("client_documents");
  if (mode !== "sc" && has("Client Management")) sources.push("manual_audits");
  if (mode === "hha" && has("Client Management"))
    sources.push("unsigned_form485");
  if (
    mode !== "sc" &&
    has("Notes") &&
    (has("Scheduling") || has("Shift Management"))
  )
    sources.push("shift_notes");
  return sources;
}
export const validComplianceId = (value: string) =>
  value.length > 0 && value.length <= 512 && !/[\/\\\x00-\x1f]/.test(value);
const date = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export function parseComplianceView(params: URLSearchParams): ViewParseResult {
  const fail = (): ViewParseResult => ({
    ok: false,
    message:
      "These filters are not valid for this source. Reset the view to continue.",
  });
  const raw = Object.fromEntries(params);
  if ([...params.keys()].some((key) => params.getAll(key).length !== 1))
    return fail();
  if (raw.mode !== undefined && !["ddd", "hha"].includes(raw.mode))
    return fail();
  if (raw.initialRunId !== undefined) return validComplianceId(raw.initialRunId) && Object.keys(raw).every(key=>['initialRunId','mode'].includes(key)) ? {ok:true,view:raw as ComplianceView} : fail();
  if (!raw.source && raw.shiftId && !raw.section) {
    raw.source = "shift_notes";
    raw.section = "shifts";
  }
  if (!raw.source)
    return Object.keys(raw).every((key) => key === "mode")
      ? { ok: true, view: raw as ComplianceView }
      : fail();
  if (!Object.hasOwn(sourceSection, raw.source)) return fail();
  const source = raw.source as Source;
  if (raw.section && raw.section !== sourceSection[source]) return fail();
  const allowed = [
    "section",
    "source",
    "mode",
    "cursor",
    ...(source === "document_expiry"
      ? ["employeeId", "search", "employeeStatus", "condition"]
      : source === "training"
        ? ["employeeId", "search", "staffCursor"]
        : source === "client_documents"
          ? ["clientId", "search", "status"]
          : source === "manual_audits"
            ? ["clientId", "auditId", "auditView"]
          : source === "unsigned_form485"
            ? ["clientId"]
            : ["employeeId", "shiftId", "stateGroup", "startDate", "endDate"]),
  ];
  if (Object.keys(raw).some((key) => !allowed.includes(key) || raw[key] === ""))
    return fail();
  if (raw.clientId && !raw.clientId.trim()) return fail();
  if (
    ["employeeId", "clientId", "shiftId", "auditId"].some(
      (key) => raw[key] !== undefined && !validComplianceId(raw[key]),
    )
  )
    return fail();
  if (
    ["cursor", "staffCursor"].some(
      (key) =>
        raw[key] !== undefined &&
        (raw[key].length > 4096 || !/^[\w-]+$/.test(raw[key])),
    )
  )
    return fail();
  if (raw.search && raw.search.trim().length > 100) return fail();
  if (
    raw.employeeStatus &&
    !["all", "active", "inactive"].includes(raw.employeeStatus)
  )
    return fail();
  if (
    raw.status &&
    !["all", "active", "inactive", "pending", "archived"].includes(raw.status)
  )
    return fail();
  if (
    raw.condition &&
    ![
      "active",
      "all",
      "current",
      "expiring",
      "due_today",
      "expired",
      "needs_review",
      "not_applicable",
    ].includes(raw.condition)
  )
    return fail();
  if (
    raw.stateGroup &&
    !["unresolved", "submitted", "approved", "inactive", "all"].includes(
      raw.stateGroup,
    )
  )
    return fail();
  if (
    ["startDate", "endDate"].some((key) => raw[key] && !date(raw[key])) ||
    (raw.startDate && raw.endDate && raw.startDate > raw.endDate)
  )
    return fail();
  if (source === "unsigned_form485" && raw.mode && raw.mode !== "hha")
    return fail();
  if (raw.auditView && !["follow_up_needed", "recorded", "drafts", "discarded"].includes(raw.auditView)) return fail();
  if (source === "manual_audits" && ((raw.auditId && !raw.clientId) || (raw.auditId && raw.cursor))) return fail();
  if (
    source !== "manual_audits" && raw.clientId &&
    ["cursor", "search", "status"].some((key) => raw[key] !== undefined)
  )
    return fail();
  if (source === "training" && raw.cursor && !raw.employeeId) return fail();
  return {
    ok: true,
    view: { ...raw, source, section: sourceSection[source] } as ComplianceView,
  };
}
export function complianceHref(view: ComplianceView): string {
  const params = new URLSearchParams();
  const { cursor: _cursor, staffCursor: _staffCursor, ...selection } = view;
  for (const [key, value] of Object.entries({
    section: selection.section,
    source: selection.source,
    ...selection,
  }))
    if (value) params.set(key, value);
  return (
    "/agency/compliance-alerts" + (params.size ? "?" + params.toString() : "")
  );
}
