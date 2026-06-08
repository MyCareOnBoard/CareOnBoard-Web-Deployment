import type {
  ClientExtractionResponse,
  ExtractionAdlSupportNeed,
  ExtractionCareTeamContact,
  ExtractionEmergencyBackupPlan,
  ExtractionGuardianContact,
  ExtractionInsuranceDetail,
  ExtractionMedication,
  ExtractionOutcomeRow,
  ExtractionServiceRow,
  ExtractionTeamMember,
} from "../types/clientExtraction";
import { isDocKeyForImport } from "../types/clientExtraction";
import type {
  AddClientFormData,
  AdlSupportNeed,
  CareTeamContact,
  ClientMedication,
  DocKey,
  EmergencyBackupPlan,
  EmergencyContactRelationship,
  GuardianContact,
  GuardianRelationship,
  InsuranceDetail,
  Outcome,
  Service,
  ServicePayType,
  Stage6EmergencyContact,
  TeamMember,
  YesNo,
} from "../types/formData";
import { groupLoadedServicesIntoOutcomes, type ServiceLoadRow } from "./outcomeServices";
import { applyExtractedAuthorizationFields } from "./normalizeExtractedServiceAuthorization";
import { seedTopLevelFrequencyIntoSdrDetails } from "./mapExtractionSdrFields";
import { EMERGENCY_CONTACT_RELATIONSHIP_VALUES, GUARDIAN_RELATIONSHIP_VALUES } from "../types/formData";

export type MergeExtractionOptions = {
  /** When true, imported values replace non-empty fields. */
  overwrite?: boolean;
  /** Same file used for extraction; attached to the detected docs[…] slot. */
  importFile?: File | null;
};

export type MergeExtractionResult = {
  formData: AddClientFormData;
  localWarnings: string[];
};

/** Missing or invalid extracted emails normalize to "" for optional guardian/care-team fields. */
function normalizeExtractedOptionalEmail(raw: string | undefined): string {
  const s = raw?.trim() ?? "";
  if (!s) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : "";
}

/** Gemini / OCR often emits these when no value exists; treat as absent (leave field empty). */
function isExtractedNoDataToken(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  const t = String(v).trim();
  if (!t) return false;
  const compact = t.replace(/\s+/g, "").toLowerCase();
  if (compact === "n/a" || compact === "n.a." || compact === "n.a") return true;
  if (/^not\s+applicable$/i.test(t)) return true;
  return false;
}

function mergeString(
  current: string,
  incoming: string | undefined,
  overwrite: boolean,
): string {
  if (incoming === undefined || incoming === null) return current;
  if (isExtractedNoDataToken(incoming)) return current;
  const t = String(incoming).trim();
  if (!t) return current;
  if (overwrite || !String(current ?? "").trim()) return t;
  return current;
}

const EMERGENCY_CONTACT_RELATIONSHIP_SET = new Set<string>(
  EMERGENCY_CONTACT_RELATIONSHIP_VALUES,
);

function mergeEmergencyContactRelationship(
  current: string | undefined,
  incoming: string | undefined,
  overwrite: boolean,
): EmergencyContactRelationship | undefined {
  const merged = mergeString(current ?? "", incoming ?? "", overwrite).trim();
  if (!merged) return undefined;
  return EMERGENCY_CONTACT_RELATIONSHIP_SET.has(merged)
    ? (merged as EmergencyContactRelationship)
    : undefined;
}

const GUARDIAN_RELATIONSHIP_SET = new Set<string>(GUARDIAN_RELATIONSHIP_VALUES);

const GUARDIAN_SYNONYM_TO_CANONICAL: Record<string, GuardianRelationship> = {
  mom: "mother",
  mommy: "mother",
  mama: "mother",
  mother: "mother",
  mthr: "mother",
  dad: "father",
  daddy: "father",
  father: "father",
  papa: "father",
  fthr: "father",
  bro: "brother",
  brother: "brother",
  sis: "sister",
  sister: "sister",
  son: "child",
  daughter: "child",
  child: "child",
  grandma: "grandmother",
  grandmother: "grandmother",
  grandpa: "grandfather",
  grandfather: "grandfather",
  grandparent: "grandparent",
  auntie: "aunt",
  aunt: "aunt",
  uncle: "uncle",
  nephew: "nephew",
  niece: "niece",
  cousin: "cousin",
  "step-parent": "step-parent",
  stepmother: "step-parent",
  stepfather: "step-parent",
  stepmom: "step-parent",
  stepdad: "step-parent",
  relative: "relative",
  guardian: "guardian",
  "support-coordinator": "support-coordinator",
  caregiver: "caregiver",
  friend: "friend",
  spouse: "spouse",
  wife: "wife",
  husband: "husband",
  partner: "partner",
  other: "other",
};

function normalizeGuardianRelationship(
  raw: string | undefined,
): GuardianRelationship | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (isExtractedNoDataToken(raw)) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;

  const t = trimmed.toLowerCase().replace(/_/g, "-");

  if (t === "parent") return "relative";

  if (GUARDIAN_RELATIONSHIP_SET.has(t)) return t as GuardianRelationship;

  const hyphenated = t.replace(/\s+/g, "-");
  if (GUARDIAN_RELATIONSHIP_SET.has(hyphenated)) return hyphenated as GuardianRelationship;

  const spaced = t.replace(/\s+/g, " ").trim();
  if (spaced === "support coordinator") return "support-coordinator";
  if (spaced === "domestic partner") return "partner";
  if (spaced === "care giver" || spaced === "caregiver") return "caregiver";

  const synonym =
    GUARDIAN_SYNONYM_TO_CANONICAL[spaced] ?? GUARDIAN_SYNONYM_TO_CANONICAL[hyphenated];
  if (synonym) return synonym;

  const collapsedNoParen = t.replace(/[()]/g, "").trim();
  if (collapsedNoParen.length && GUARDIAN_SYNONYM_TO_CANONICAL[collapsedNoParen]) {
    return GUARDIAN_SYNONYM_TO_CANONICAL[collapsedNoParen];
  }

  return undefined;
}

function mergeGuardianRelationship(
  current: GuardianRelationship | undefined,
  incoming: string | undefined,
  overwrite: boolean,
): GuardianRelationship | undefined {
  const next = normalizeGuardianRelationship(incoming);
  if (next === undefined) {
    if (incoming === undefined || incoming === null) return current;
    if (isExtractedNoDataToken(incoming)) return current;
    if (!String(incoming).trim()) return current;
    return current;
  }
  if (overwrite || !current) return next;
  return current;
}

function parseIsoOrUsDate(s: string | undefined): Date | undefined {
  if (!s || !String(s).trim()) return undefined;
  if (isExtractedNoDataToken(s)) return undefined;
  const str = String(s).trim();
  const iso = Date.parse(str);
  if (!Number.isNaN(iso)) return new Date(iso);
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

function toYesNo(v: unknown): YesNo {
  if (isExtractedNoDataToken(v)) return "";
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (s === "yes" || s === "y" || s === "true" || s === "1") return "yes";
  if (s === "no" || s === "n" || s === "false" || s === "0") return "no";
  return "";
}

function applyYesNo(current: YesNo, incoming: string | undefined, overwrite: boolean): YesNo {
  const n = toYesNo(incoming);
  if (!n) return current;
  if (overwrite || !current) return n;
  return current;
}

function newOutcomeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `outcome-${crypto.randomUUID()}`
    : `outcome-${Math.random().toString(16).slice(2)}`;
}

function newServiceId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `service-${crypto.randomUUID()}`
    : `service-${Math.random().toString(16).slice(2)}`;
}

function parseExtractedOutcomeStrings(row: Record<string, unknown>): string[] {
  const raw = row.outcomes;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .map((x) => String(x ?? "").trim())
    .filter((s) => Boolean(s) && !isExtractedNoDataToken(s));
}

function mapRowToService(row: Record<string, unknown>): Service {
  const r = row as ExtractionServiceRow;
  const strOrUndef = (x: string | undefined) => {
    const v = x?.trim();
    if (!v || isExtractedNoDataToken(x)) return undefined;
    return v;
  };
  const authPatch = applyExtractedAuthorizationFields(r);

  return seedTopLevelFrequencyIntoSdrDetails({
    id: newServiceId(),
    name: strOrUndef(r.name),
    code: strOrUndef(r.code),
    hours: mergeString("", r.hours, true),
    staffRate: "",
    /** Staff pay type is agency-defined; do not map from document extraction. */
    payType: undefined,
    ispEffectiveDate: parseIsoOrUsDate(r.ispEffectiveDate),
    startAuthDate: parseIsoOrUsDate(r.startAuthDate),
    endAuthDate: parseIsoOrUsDate(r.endAuthDate),
    pcptDate: parseIsoOrUsDate(r.pcptDate),
    sdrStartDate: parseIsoOrUsDate(r.sdrStartDate),
    sdrEndDate: parseIsoOrUsDate(r.sdrEndDate),
    provider: strOrUndef(r.provider),
    location: strOrUndef(r.location),
    claimsSource: strOrUndef(r.claimsSource),
    frequency: strOrUndef(r.frequency),
    evvStatus: strOrUndef(r.evvStatus),
    evvDescription: strOrUndef(r.evvDescription),
    narrative: strOrUndef(r.narrative),
    ...authPatch,
  });
}

function normalizeGenderForForm(
  raw: string | undefined,
): { value: string | undefined; warning?: string } {
  if (!raw?.trim() || isExtractedNoDataToken(raw)) return { value: undefined };
  const x = raw.trim().toLowerCase();
  if (
    x === "male" ||
    x === "female" ||
    x === "other" ||
    x === "non-binary" ||
    x === "prefer-not-to-say"
  ) {
    return { value: x };
  }
  if (x === "nonbinary") return { value: "non-binary" };
  if (x === "prefer not to say") return { value: "prefer-not-to-say" };
  if (x === "prefer_not_to_say") return { value: "prefer-not-to-say" };
  if (x === "m") return { value: "male" };
  if (x === "f") return { value: "female" };
  return {
    value: undefined,
    warning: `Imported gender "${raw}" wasn't recognized. Pick one manually.`,
  };
}

function mergeUniqueStrings(
  current: string[],
  incoming: string[] | undefined,
  overwrite: boolean,
): string[] {
  if (!incoming?.length) return current;
  const cleaned = incoming
    .map((s) => String(s).trim())
    .filter((s) => Boolean(s) && !isExtractedNoDataToken(s));
  if (!cleaned.length) return current;
  if (overwrite) {
    const set = new Set(cleaned);
    return [...set];
  }
  const next = [...current];
  for (const c of cleaned) {
    if (!next.includes(c)) next.push(c);
  }
  return next;
}

function isServiceRowEmpty(s: Service): boolean {
  return (
    !String(s.name ?? "").trim() &&
    !String(s.code ?? "").trim() &&
    !String(s.hours ?? "").trim() &&
    !String(s.staffRate ?? "").trim() &&
    !String(s.clientRate ?? "").trim()
  );
}

function serviceDedupeKey(s: Pick<Service, "name" | "code">): string {
  const code = String(s.code ?? "").trim().toLowerCase();
  if (code) return `c:${code}`;
  const name = String(s.name ?? "").trim().toLowerCase();
  if (name) return `n:${name}`;
  return "";
}

function mergeServiceIntoExisting(
  existing: Service,
  incoming: Service,
  overwrite: boolean,
): Service {
  const str = (cur: string | undefined, inc: string | undefined) =>
    mergeString(cur ?? "", inc ?? "", overwrite).trim() || undefined;

  const date = (cur: Date | undefined, inc: Date | undefined) =>
    overwrite && inc ? inc : cur ?? inc;

  const pay = (cur: ServicePayType | undefined, inc: ServicePayType | undefined) =>
    overwrite && inc ? inc : cur ?? inc;

  const optStr = (cur: string | undefined, inc: string | undefined) => {
    const merged = mergeString(cur ?? "", inc ?? "", overwrite).trim();
    return merged || undefined;
  };

  return seedTopLevelFrequencyIntoSdrDetails({
    ...existing,
    id: existing.id,
    name: str(existing.name, incoming.name),
    code: str(existing.code, incoming.code),
    hours: mergeString(existing.hours ?? "", incoming.hours ?? "", overwrite),
    totalHours: mergeString(
      existing.totalHours ?? "",
      incoming.totalHours ?? "",
      overwrite,
    ),
    staffRate: mergeString(existing.staffRate ?? "", incoming.staffRate ?? "", overwrite),
    payType: pay(existing.payType, incoming.payType),
    clientRate: mergeString(existing.clientRate ?? "", incoming.clientRate ?? "", overwrite),
    clientPayType: pay(existing.clientPayType, incoming.clientPayType),
    ispEffectiveDate: date(existing.ispEffectiveDate, incoming.ispEffectiveDate),
    startAuthDate: date(existing.startAuthDate, incoming.startAuthDate),
    endAuthDate: date(existing.endAuthDate, incoming.endAuthDate),
    pcptDate: date(existing.pcptDate, incoming.pcptDate),
    sdrStartDate: date(existing.sdrStartDate, incoming.sdrStartDate),
    sdrEndDate: date(existing.sdrEndDate, incoming.sdrEndDate),
    provider: optStr(existing.provider, incoming.provider),
    location: optStr(existing.location, incoming.location),
    claimsSource: optStr(existing.claimsSource, incoming.claimsSource),
    unitType: optStr(existing.unitType, incoming.unitType),
    frequency: optStr(existing.frequency, incoming.frequency),
    totalUnits: optStr(existing.totalUnits, incoming.totalUnits),
    totalCost: optStr(existing.totalCost, incoming.totalCost),
    evvStatus: optStr(existing.evvStatus, incoming.evvStatus),
    evvDescription: optStr(existing.evvDescription, incoming.evvDescription),
    narrative: optStr(existing.narrative, incoming.narrative),
    assignedDsps:
      incoming.assignedDsps !== undefined && incoming.assignedDsps.length > 0
        ? [...incoming.assignedDsps]
        : [...(existing.assignedDsps ?? [])],
  });
}

function applyImportedServices(
  currentServices: Service[],
  mapped: Service[],
  overwrite: boolean,
): Service[] {
  const onlyBlankDefault =
    currentServices.length === 1 && isServiceRowEmpty(currentServices[0]);

  const pool = currentServices.map((s) => ({ ...s }));

  const processIncoming = (inc: Service) => {
    const k = serviceDedupeKey(inc);
    const idx = k ? pool.findIndex((s) => serviceDedupeKey(s) === k) : -1;
    if (idx >= 0) {
      pool[idx] = mergeServiceIntoExisting(pool[idx], inc, overwrite);
    } else {
      pool.push(inc);
    }
  };

  if (onlyBlankDefault && mapped.length > 0) {
    pool[0] = mergeServiceIntoExisting(pool[0], mapped[0], overwrite);
    for (const inc of mapped.slice(1)) {
      processIncoming(inc);
    }
  } else {
    for (const inc of mapped) {
      processIncoming(inc);
    }
  }

  return pool;
}

function normalizeOutcomeStatementKey(s: string | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function mergeTwoOutcomeRows(
  existing: Outcome,
  incoming: Outcome,
  overwrite: boolean,
): Outcome {
  return {
    ...existing,
    id: existing.id,
    statement:
      mergeString(existing.statement ?? "", incoming.statement ?? "", overwrite).trim() ||
      existing.statement,
    services: applyImportedServices(existing.services, incoming.services, overwrite),
  };
}

function mergeOutcomeGroups(
  current: Outcome[],
  incoming: Outcome[],
  overwrite: boolean,
): Outcome[] {
  const pool = current.map((o) => ({
    ...o,
    services: o.services.map((s) => ({ ...s })),
  }));

  for (const inc of incoming) {
    const key = normalizeOutcomeStatementKey(inc.statement);
    const idx =
      key.length > 0
        ? pool.findIndex((o) => normalizeOutcomeStatementKey(o.statement) === key)
        : -1;
    if (idx < 0) {
      pool.push({
        ...inc,
        id: inc.id || newOutcomeId(),
        services: inc.services.map((s) => ({ ...s })),
      });
    } else {
      pool[idx] = mergeTwoOutcomeRows(pool[idx], inc, overwrite);
    }
  }
  return pool;
}

function applyImportedOutcomeGroups(
  current: Outcome[],
  extracted: ExtractionOutcomeRow[],
  overwrite: boolean,
): Outcome[] {
  const incoming: Outcome[] = extracted
    .filter(
      (e) =>
        String(e.statement ?? "").trim().length > 0 || (e.services?.length ?? 0) > 0,
    )
    .map((e) => ({
      id: newOutcomeId(),
      statement: mergeString("", e.statement ?? "", true).trim(),
      services: (e.services ?? []).map((r) =>
        mapRowToService(r as unknown as Record<string, unknown>),
      ),
    }));
  if (!incoming.length) return current;
  return mergeOutcomeGroups(current, incoming, overwrite);
}

function mergeInsuranceDetails(
  current: InsuranceDetail[],
  incoming: ExtractionInsuranceDetail[] | undefined,
  overwrite: boolean,
): InsuranceDetail[] {
  if (!incoming?.length) return current;
  const mapped: InsuranceDetail[] = incoming
    .map((i) => ({
      type: mergeString("", i.type ?? "", true).trim() || undefined,
      name: mergeString("", i.name ?? "", true).trim() || undefined,
      idGroup: mergeString("", i.idGroup ?? "", true).trim() || undefined,
      caseManager: mergeString("", i.caseManager ?? "", true).trim() || undefined,
      contact: mergeString("", i.contact ?? "", true).trim() || undefined,
    }))
    .filter(
      (r) =>
        (Boolean(r.type) || Boolean(r.name) || Boolean(r.contact)) &&
        !isExtractedNoDataToken(r.name) &&
        !isExtractedNoDataToken(r.type),
    );
  if (!mapped.length) return current;
  if (overwrite) return mapped;
  const key = (x: InsuranceDetail) => `${x.type ?? ""}|${x.name ?? ""}|${x.idGroup ?? ""}`;
  const seen = new Set(current.map(key));
  const next = [...current];
  for (const m of mapped) {
    const k = key(m);
    if (!seen.has(k)) {
      next.push(m);
      seen.add(k);
    }
  }
  return next;
}

function mergeGuardianContacts(
  current: GuardianContact[],
  incoming: ExtractionGuardianContact[] | undefined,
  overwrite: boolean,
): GuardianContact[] {
  if (!incoming?.length) return current;
  const mapped: GuardianContact[] = incoming
    .map((g) => ({
      name: mergeString("", g.name ?? "", true).trim() || undefined,
      relationship: mergeGuardianRelationship(undefined, g.relationship, true),
      email: normalizeExtractedOptionalEmail(
        mergeString("", g.email ?? "", true),
      ),
      primaryPhone: mergeString("", g.primaryPhone ?? "", true).trim() || undefined,
      secondaryPhone: mergeString("", g.secondaryPhone ?? "", true).trim() || undefined,
      address: mergeString("", g.address ?? "", true).trim() || undefined,
      priority: g.priority
        ? Number.parseInt(String(g.priority).trim(), 10)
        : undefined,
    }))
    .filter((g) => Boolean(g.name) && !isExtractedNoDataToken(g.name));
  if (!mapped.length) return current;
  if (overwrite) return mapped;
  const key = (g: GuardianContact) => `${g.name}|${g.primaryPhone ?? ""}`;
  const seen = new Set(current.map(key));
  const next = [...current];
  for (const m of mapped) {
    const k = key(m);
    if (!seen.has(k)) {
      next.push(m);
      seen.add(k);
    }
  }
  return next;
}

function mergeCareTeamContacts(
  current: CareTeamContact[],
  incoming: ExtractionCareTeamContact[] | undefined,
  overwrite: boolean,
): CareTeamContact[] {
  if (!incoming?.length) return current;
  const mapped: CareTeamContact[] = incoming
    .map((c) => ({
      role: mergeString("", c.role ?? "", true).trim() || undefined,
      name: mergeString("", c.name ?? "", true).trim() || undefined,
      agency: mergeString("", c.agency ?? "", true).trim() || undefined,
      phone: mergeString("", c.phone ?? "", true).trim() || undefined,
      email: normalizeExtractedOptionalEmail(
        mergeString("", c.email ?? "", true),
      ),
      address: mergeString("", c.address ?? "", true).trim() || undefined,
    }))
    .filter(
      (c) =>
        (Boolean(c.role) || Boolean(c.name) || Boolean(c.phone)) &&
        !isExtractedNoDataToken(c.name),
    );
  if (!mapped.length) return current;
  if (overwrite) return mapped;
  const key = (c: CareTeamContact) => `${c.role ?? ""}|${c.name ?? ""}|${c.phone ?? ""}`;
  const seen = new Set(current.map(key));
  const next = [...current];
  for (const m of mapped) {
    const k = key(m);
    if (!seen.has(k)) {
      next.push(m);
      seen.add(k);
    }
  }
  return next;
}

function mergeAdlSupportNeeds(
  current: AdlSupportNeed[],
  incoming: ExtractionAdlSupportNeed[] | undefined,
  overwrite: boolean,
): AdlSupportNeed[] {
  if (!incoming?.length) return current;
  const mapped: AdlSupportNeed[] = incoming
    .map((a) => ({
      domain: mergeString("", a.domain ?? "", true).trim() || undefined,
      levelOfSupport: mergeString("", a.levelOfSupport ?? "", true).trim() || undefined,
      notes: mergeString("", a.notes ?? "", true).trim() || undefined,
    }))
    .filter((a) => (Boolean(a.domain) || Boolean(a.notes)) && !isExtractedNoDataToken(a.domain));
  if (!mapped.length) return current;
  if (overwrite) return mapped;
  const key = (a: AdlSupportNeed) => `${a.domain ?? ""}|${a.levelOfSupport ?? ""}`;
  const seen = new Set(current.map(key));
  const next = [...current];
  for (const m of mapped) {
    const k = key(m);
    if (!seen.has(k)) {
      next.push(m);
      seen.add(k);
    }
  }
  return next;
}

function parseSelfAdminister(raw: string | undefined): boolean | undefined {
  if (!raw?.trim() || isExtractedNoDataToken(raw)) return undefined;
  const x = String(raw).trim().toLowerCase();
  if (x === "yes" || x === "y" || x === "true" || x === "1") return true;
  if (x === "no" || x === "n" || x === "false" || x === "0") return false;
  return undefined;
}

function mergeMedications(
  current: ClientMedication[],
  incoming: ExtractionMedication[] | undefined,
  overwrite: boolean,
): ClientMedication[] {
  if (!incoming?.length) return current;
  const mapped: ClientMedication[] = incoming
    .map((m) => ({
      name: mergeString("", m.name ?? "", true).trim() || undefined,
      dosage: mergeString("", m.dosage ?? "", true).trim() || undefined,
      frequency: mergeString("", m.frequency ?? "", true).trim() || undefined,
      notes: mergeString("", m.notes ?? "", true).trim() || undefined,
      selfAdminister: parseSelfAdminister(m.selfAdminister as string | undefined),
    }))
    .filter((m) => (Boolean(m.name) || Boolean(m.dosage)) && !isExtractedNoDataToken(m.name));
  if (!mapped.length) return current;
  if (overwrite) return mapped;
  const key = (m: ClientMedication) =>
    `${m.name ?? ""}|${m.dosage ?? ""}|${m.frequency ?? ""}`;
  const seen = new Set(current.map(key));
  const next = [...current];
  for (const m of mapped) {
    const kk = key(m);
    if (!seen.has(kk)) {
      next.push(m);
      seen.add(kk);
    }
  }
  return next;
}

function mergeEmergencyBackupPlan(
  current: EmergencyBackupPlan | undefined,
  incoming: ExtractionEmergencyBackupPlan | undefined,
  overwrite: boolean,
): EmergencyBackupPlan | undefined {
  if (!incoming) return current;
  const base: EmergencyBackupPlan = { ...(current ?? {}) };
  const mergeYn = (cur: YesNo | undefined, inc: string | undefined): YesNo | undefined => {
    const n = toYesNo(inc);
    if (!n) return cur;
    if (overwrite || !cur) return n;
    return cur;
  };
  return {
    pers: mergeYn(base.pers, incoming.pers),
    providerManagedSetting: mergeYn(base.providerManagedSetting, incoming.providerManagedSetting),
    advanceDirective: mergeYn(base.advanceDirective, incoming.advanceDirective),
    proxyDecisionMaker: mergeYn(base.proxyDecisionMaker, incoming.proxyDecisionMaker),
    narrative: mergeString(base.narrative ?? "", incoming.narrative, overwrite).trim() || undefined,
  };
}

function mergeEmergencyContactRows(
  current: Stage6EmergencyContact[],
  incoming:
    | {
        name?: string;
        relationship?: string;
        primaryPhone?: string;
        secondaryPhone?: string;
        priority?: string;
      }[]
    | undefined,
  overwrite: boolean,
): Stage6EmergencyContact[] {
  if (!incoming?.length) return current;
  const mapped: Stage6EmergencyContact[] = incoming
    .map((e) => ({
      name: mergeString("", e.name ?? "", true).trim() || undefined,
      relationship: mergeEmergencyContactRelationship(undefined, e.relationship, true),
      primaryPhone: mergeString("", e.primaryPhone ?? "", true).trim() || undefined,
      secondaryPhone: mergeString("", e.secondaryPhone ?? "", true).trim() || undefined,
      hospitalPreference: mergeString("", (e as { hospitalPreference?: string }).hospitalPreference ?? "", true).trim() || undefined,
      emergencyProtocol: mergeString("", (e as { emergencyProtocol?: string }).emergencyProtocol ?? "", true).trim() || undefined,
      priority: e.priority
        ? Number.parseInt(String(e.priority).trim(), 10)
        : undefined,
    }))
    .filter((e) => Boolean(e.name) && !isExtractedNoDataToken(e.name));
  if (!mapped.length) return current;
  const sorted = [...mapped].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  if (overwrite) return sorted;
  const key = (e: Stage6EmergencyContact) => `${e.name}|${e.primaryPhone ?? ""}`;
  const seen = new Set(current.map(key));
  const next = [...current];
  for (const m of sorted) {
    const k = key(m);
    if (!seen.has(k)) {
      next.push(m);
      seen.add(k);
    }
  }
  return next.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
}

function mergeTeamMembers(
  current: TeamMember[],
  incoming: ExtractionTeamMember[] | undefined,
  overwrite: boolean,
): TeamMember[] {
  if (!incoming?.length) return current;
  const mapped: TeamMember[] = incoming
    .map((t) => ({
      name: mergeString("", t.name ?? "", true).trim() || undefined,
      relationship: mergeString("", t.relationship ?? "", true).trim() || undefined,
      contact: mergeString("", t.contact ?? "", true).trim() || undefined,
    }))
    .filter((t) => Boolean(t.name) && !isExtractedNoDataToken(t.name));
  if (!mapped.length) return current;
  if (overwrite) return mapped;
  const key = (t: TeamMember) => `${t.name}|${t.contact ?? ""}`;
  const seen = new Set(current.map(key));
  const next = [...current];
  for (const m of mapped) {
    const k = key(m);
    if (!seen.has(k)) {
      next.push(m);
      seen.add(k);
    }
  }
  return next;
}

/**
 * Merges a Gemini extraction response into wizard state.
 */
export function mergeExtractionDraft(
  prev: AddClientFormData,
  extraction: ClientExtractionResponse,
  options: MergeExtractionOptions = {},
): MergeExtractionResult {
  const overwrite = options.overwrite ?? false;
  const draft = extraction.draft ?? {};
  const localWarnings: string[] = [];

  const next: AddClientFormData = {
    ...prev,
    stage1: { ...prev.stage1 },
    stage2: {
      ...prev.stage2,
      outcomes: prev.stage2.outcomes.map((o) => ({
        ...o,
        services: o.services.map((s) => ({
          ...s,
          assignedDsps: [...(s.assignedDsps ?? [])],
        })),
      })),
      guardians: prev.stage2.guardians?.map((g) => ({ ...g })) ?? [],
      careTeam: prev.stage2.careTeam?.map((c) => ({ ...c })) ?? [],
    },
    stage3: {
      ...prev.stage3,
      medicalConditions: [...prev.stage3.medicalConditions],
      allergies: [...prev.stage3.allergies],
      dietaryRestrictions: [...prev.stage3.dietaryRestrictions],
      mobilitySupportNeeds: [...prev.stage3.mobilitySupportNeeds],
      communicationNeeds: [...prev.stage3.communicationNeeds],
      selfCareNeeds: prev.stage3.selfCareNeeds?.map((a) => ({ ...a })) ?? [],
      docs: prev.stage3.docs.map((d) => ({ ...d })),
    },
    stage4: { ...prev.stage4 },
    stage5: {
      ...prev.stage5,
      autoChecks: { ...prev.stage5.autoChecks },
    },
    stage6: {
      ...prev.stage6,
      medications: prev.stage6.medications?.map((m) => ({ ...m })) ?? [],
      emergencyContacts: prev.stage6.emergencyContacts?.map((e) => ({ ...e })) ?? [],
      emergencyBackupPlan: prev.stage6.emergencyBackupPlan
        ? { ...prev.stage6.emergencyBackupPlan }
        : undefined,
    },
    stage7: {
      ...prev.stage7,
      teamMembers: prev.stage7.teamMembers?.map((t) => ({ ...t })) ?? [],
    },
  };

  const s1 = draft.stage1;
  if (s1) {
    next.stage1.firstName = mergeString(next.stage1.firstName, s1.firstName, overwrite);
    next.stage1.lastName = mergeString(next.stage1.lastName, s1.lastName, overwrite);
    next.stage1.middleName = mergeString(next.stage1.middleName, s1.middleName, overwrite);

    const g = normalizeGenderForForm(s1.gender);
    if (g.warning) localWarnings.push(g.warning);
    if (g.value) {
      if (
        next.stage1.gender &&
        next.stage1.gender !== g.value &&
        !overwrite
      ) {
        localWarnings.push("Gender was not overwritten — existing value kept.");
      } else {
        next.stage1.gender = g.value;
      }
    }

    const dob = parseIsoOrUsDate(s1.dob);
    if (dob && (!next.stage1.dob || overwrite)) next.stage1.dob = dob;

    next.stage1.medicaidId = mergeString(next.stage1.medicaidId, s1.medicaidId, overwrite);
    next.stage1.dddId = mergeString(next.stage1.dddId, s1.dddId, overwrite);
    next.stage1.ssn = mergeString(next.stage1.ssn, s1.ssn, overwrite);
    next.stage1.tier = mergeString(next.stage1.tier ?? "", s1.tier, overwrite) || undefined;

    next.stage1.address = mergeString(next.stage1.address, s1.address, overwrite);
    next.stage1.countyState = mergeString(next.stage1.countyState, s1.countyState, overwrite);
    next.stage1.zipCode = mergeString(next.stage1.zipCode, s1.zipCode, overwrite);
    next.stage1.secondaryAddress = mergeString(
      next.stage1.secondaryAddress,
      s1.secondaryAddress,
      overwrite,
    );
    next.stage1.secondaryCountyState = mergeString(
      next.stage1.secondaryCountyState,
      s1.secondaryCountyState,
      overwrite,
    );
    next.stage1.secondaryZipCode = mergeString(
      next.stage1.secondaryZipCode,
      s1.secondaryZipCode,
      overwrite,
    );
    next.stage1.phone = mergeString(next.stage1.phone, s1.phone, overwrite);
    next.stage1.email = mergeString(next.stage1.email, s1.email, overwrite);
    next.stage1.language = mergeString(
      next.stage1.language ?? "",
      s1.language,
      overwrite,
    ) || undefined;
    next.stage1.communicationMethod = mergeString(
      next.stage1.communicationMethod ?? "",
      s1.communicationMethod,
      overwrite,
    ) || undefined;

    next.stage1.planId = mergeString(next.stage1.planId ?? "", s1.planId, overwrite) || undefined;
    next.stage1.planType = mergeString(next.stage1.planType ?? "", s1.planType, overwrite) || undefined;
    next.stage1.program = mergeString(next.stage1.program ?? "", s1.program, overwrite) || undefined;
    next.stage1.dddStatus = mergeString(next.stage1.dddStatus ?? "", s1.dddStatus, overwrite) || undefined;
    next.stage1.medicaidType = mergeString(next.stage1.medicaidType ?? "", s1.medicaidType, overwrite) || undefined;

    const planPrint = parseIsoOrUsDate(s1.planPrintDate);
    if (planPrint && (!next.stage1.planPrintDate || overwrite)) next.stage1.planPrintDate = planPrint;

    const waiver = parseIsoOrUsDate(s1.waiverEnrollmentDate);
    if (waiver && (!next.stage1.waiverEnrollmentDate || overwrite))
      next.stage1.waiverEnrollmentDate = waiver;

    next.stage1.insuranceDetails = mergeInsuranceDetails(
      next.stage1.insuranceDetails ?? [],
      s1.insuranceDetails,
      overwrite,
    );

    if (
      String(s1.address ?? "").trim() &&
      String(next.stage1.address ?? "").trim() &&
      !next.stage1.location?.lat
    ) {
      next._pendingImportedPrimaryGeocode = true;
    }
  }

  const s2 = draft.stage2;
  if (s2) {
    next.stage2.guardianName = mergeString(next.stage2.guardianName, s2.guardianName, overwrite);
    next.stage2.guardianRelationship = mergeGuardianRelationship(
      next.stage2.guardianRelationship,
      s2.guardianRelationship,
      overwrite,
    );
    next.stage2.guardianEmail = normalizeExtractedOptionalEmail(
      mergeString(next.stage2.guardianEmail, s2.guardianEmail, overwrite),
    );
    next.stage2.guardianPhone = mergeString(
      next.stage2.guardianPhone,
      s2.guardianPhone,
      overwrite,
    );
    next.stage2.guardianAddress = mergeString(
      next.stage2.guardianAddress,
      s2.guardianAddress,
      overwrite,
    );
    next.stage2.supportCoordinatorName = mergeString(
      next.stage2.supportCoordinatorName,
      s2.supportCoordinatorName,
      overwrite,
    );
    next.stage2.supportCoordinatorAgency = mergeString(
      next.stage2.supportCoordinatorAgency,
      s2.supportCoordinatorAgency,
      overwrite,
    );
    next.stage2.supportCoordinatorContact = mergeString(
      next.stage2.supportCoordinatorContact,
      s2.supportCoordinatorContact,
      overwrite,
    );

    next.stage2.guardians = mergeGuardianContacts(
      next.stage2.guardians ?? [],
      s2.guardians,
      overwrite,
    );
    if (!next.stage2.guardians?.length) {
      const r = next.stage2;
      const hasRow =
        (r.guardianName?.trim() ?? "") ||
        (r.guardianEmail?.trim() ?? "") ||
        (r.guardianPhone?.trim() ?? "") ||
        (r.guardianAddress?.trim() ?? "") ||
        (r.supportCoordinatorName?.trim() ?? "") ||
        (r.supportCoordinatorAgency?.trim() ?? "") ||
        (r.supportCoordinatorContact?.trim() ?? "") ||
        r.guardianRelationship;
      if (hasRow) {
        next.stage2.guardians = [
          {
            name: r.guardianName?.trim() || undefined,
            relationship: r.guardianRelationship,
            email: normalizeExtractedOptionalEmail(r.guardianEmail),
            primaryPhone: r.guardianPhone?.trim() || undefined,
            address: r.guardianAddress?.trim() || undefined,
            supportCoordinatorName: r.supportCoordinatorName?.trim() || undefined,
            supportCoordinatorAgency: r.supportCoordinatorAgency?.trim() || undefined,
            supportCoordinatorContact: r.supportCoordinatorContact?.trim() || undefined,
          },
        ];
      }
    }
    next.stage2.careTeam = mergeCareTeamContacts(
      next.stage2.careTeam ?? [],
      s2.careTeam,
      overwrite,
    );

    if (s2.outcomes?.length) {
      next.stage2.outcomes = applyImportedOutcomeGroups(
        next.stage2.outcomes,
        s2.outcomes,
        overwrite,
      );
      localWarnings.push(
        "Review each imported service code and name against the ISP and your billing setup before saving.",
      );
    } else if (s2.services?.length) {
      const rows: ServiceLoadRow[] = s2.services.map((row) => ({
        svc: mapRowToService(row as unknown as Record<string, unknown>),
        outcomeTags: parseExtractedOutcomeStrings(row as unknown as Record<string, unknown>),
      }));
      const legacyOutcomes = groupLoadedServicesIntoOutcomes(rows);
      next.stage2.outcomes = mergeOutcomeGroups(
        next.stage2.outcomes,
        legacyOutcomes,
        overwrite,
      );
      localWarnings.push(
        "Review each imported service code and name against the ISP and your billing setup before saving.",
      );
    }
  }

  const s3 = draft.stage3;
  if (s3) {
    next.stage3.medicalConditions = mergeUniqueStrings(
      next.stage3.medicalConditions,
      s3.medicalConditions,
      overwrite,
    );
    next.stage3.allergies = mergeUniqueStrings(next.stage3.allergies, s3.allergies, overwrite);
    next.stage3.dietaryRestrictions = mergeUniqueStrings(
      next.stage3.dietaryRestrictions,
      s3.dietaryRestrictions,
      overwrite,
    );
    next.stage3.seizurePlan = mergeString(next.stage3.seizurePlan, s3.seizurePlan, overwrite);
    next.stage3.mobilitySupportNeeds = mergeUniqueStrings(
      next.stage3.mobilitySupportNeeds,
      s3.mobilitySupportNeeds,
      overwrite,
    );
    next.stage3.behaviorSupportPlan = mergeString(
      next.stage3.behaviorSupportPlan,
      s3.behaviorSupportPlan,
      overwrite,
    );
    next.stage3.communicationNeeds = mergeUniqueStrings(
      next.stage3.communicationNeeds,
      s3.communicationNeeds,
      overwrite,
    );
    next.stage3.emergencyProtocols = mergeString(
      next.stage3.emergencyProtocols,
      s3.emergencyProtocols,
      overwrite,
    );

    next.stage3.diagnosis =
      mergeString(next.stage3.diagnosis ?? "", s3.diagnosis, overwrite) || undefined;
    next.stage3.healthHazards = mergeString(
      next.stage3.healthHazards ?? "",
      s3.healthHazards,
      overwrite,
    ) || undefined;
    next.stage3.nutritionNotes = mergeString(
      next.stage3.nutritionNotes ?? "",
      s3.nutritionNotes,
      overwrite,
    ) || undefined;
    next.stage3.selfCareNeeds = mergeAdlSupportNeeds(
      next.stage3.selfCareNeeds ?? [],
      s3.selfCareNeeds,
      overwrite,
    );

    if (s3.preferredHospital?.trim() && !isExtractedNoDataToken(s3.preferredHospital)) {
      next.stage6.hospitalPreference = mergeString(
        next.stage6.hospitalPreference,
        s3.preferredHospital,
        overwrite,
      );
    }
    if (s3.primaryCarePhysician?.trim() && !isExtractedNoDataToken(s3.primaryCarePhysician)) {
      const line = `Primary care: ${s3.primaryCarePhysician}`;
      next.stage6.hospitalPreference = mergeString(
        next.stage6.hospitalPreference,
        line,
        overwrite,
      );
    }
  }

  const s4 = draft.stage4;
  if (s4) {
    next.stage4.evvRequirement = applyYesNo(
      next.stage4.evvRequirement,
      s4.evvRequirement,
      overwrite,
    );
    next.stage4.primaryVisitLocationGps = applyYesNo(
      next.stage4.primaryVisitLocationGps,
      s4.primaryVisitLocationGps,
      overwrite,
    );
    next.stage4.allowedSecondaryLocations = applyYesNo(
      next.stage4.allowedSecondaryLocations,
      s4.allowedSecondaryLocations,
      overwrite,
    );
    next.stage4.minShiftLength = mergeString(
      next.stage4.minShiftLength,
      s4.minShiftLength,
      overwrite,
    );
    next.stage4.maxShiftLength = mergeString(
      next.stage4.maxShiftLength,
      s4.maxShiftLength,
      overwrite,
    );
    next.stage4.backToBackAllowed = applyYesNo(
      next.stage4.backToBackAllowed,
      s4.backToBackAllowed,
      overwrite,
    );
    next.stage4.travelTimeAllowed = applyYesNo(
      next.stage4.travelTimeAllowed,
      s4.travelTimeAllowed,
      overwrite,
    );
  }

  const s5 = draft.stage5;
  if (s5) {
    next.stage5.genderPreference = mergeString(
      next.stage5.genderPreference ?? "",
      s5.genderPreference,
      overwrite,
    ) || undefined;
    next.stage5.requiredCertifications = mergeString(
      next.stage5.requiredCertifications,
      s5.requiredCertifications,
      overwrite,
    );
    next.stage5.specialConditions = mergeString(
      next.stage5.specialConditions,
      s5.specialConditions,
      overwrite,
    );
    next.stage5.prefersFamiliar = applyYesNo(
      next.stage5.prefersFamiliar,
      s5.prefersFamiliar,
      overwrite,
    );
    next.stage5.noMaleFemaleStaff = applyYesNo(
      next.stage5.noMaleFemaleStaff,
      s5.noMaleFemaleStaff,
      overwrite,
    );
    next.stage5.medicalRestrictionsTrained = applyYesNo(
      next.stage5.medicalRestrictionsTrained,
      s5.medicalRestrictionsTrained,
      overwrite,
    );
  }

  const s6 = draft.stage6;
  if (s6) {
    next.stage6.clientGoals = mergeString(next.stage6.clientGoals, s6.clientGoals, overwrite);
    next.stage6.communityGoals = mergeString(
      next.stage6.communityGoals,
      s6.communityGoals,
      overwrite,
    );
    next.stage6.dailyLivingGoals = mergeString(
      next.stage6.dailyLivingGoals,
      s6.dailyLivingGoals,
      overwrite,
    );
    next.stage6.behavioralGoals = mergeString(
      next.stage6.behavioralGoals,
      s6.behavioralGoals,
      overwrite,
    );
    next.stage6.skillBuildingGoals = mergeString(
      next.stage6.skillBuildingGoals,
      s6.skillBuildingGoals,
      overwrite,
    );
    next.stage6.ispOutcomes = mergeString(next.stage6.ispOutcomes, s6.ispOutcomes, overwrite);
    next.stage6.targetBehaviors = mergeString(
      next.stage6.targetBehaviors,
      s6.targetBehaviors,
      overwrite,
    );
    next.stage6.supportStrategies = mergeString(
      next.stage6.supportStrategies,
      s6.supportStrategies,
      overwrite,
    );
    next.stage6.emergencyName = mergeString(
      next.stage6.emergencyName,
      s6.emergencyName,
      overwrite,
    );
    next.stage6.emergencyRelationship = mergeEmergencyContactRelationship(
      next.stage6.emergencyRelationship,
      s6.emergencyRelationship,
      overwrite,
    );
    next.stage6.primaryPhone = mergeString(
      next.stage6.primaryPhone,
      s6.primaryPhone,
      overwrite,
    );
    next.stage6.secondaryPhone = mergeString(
      next.stage6.secondaryPhone,
      s6.secondaryPhone,
      overwrite,
    );
    next.stage6.hospitalPreference = mergeString(
      next.stage6.hospitalPreference,
      s6.hospitalPreference,
      overwrite,
    );
    next.stage6.emergencyProtocol = mergeString(
      next.stage6.emergencyProtocol,
      s6.emergencyProtocol,
      overwrite,
    );
    next.stage6.medicationList = mergeString(
      next.stage6.medicationList,
      s6.medicationList,
      overwrite,
    );

    next.stage6.medications = mergeMedications(
      next.stage6.medications ?? [],
      s6.medications,
      overwrite,
    );
    next.stage6.emergencyBackupPlan = mergeEmergencyBackupPlan(
      next.stage6.emergencyBackupPlan,
      s6.emergencyBackupPlan,
      overwrite,
    );
    next.stage6.emergencyContacts = mergeEmergencyContactRows(
      next.stage6.emergencyContacts ?? [],
      s6.emergencyContacts,
      overwrite,
    );
    next.stage6.employmentStatus = mergeString(
      next.stage6.employmentStatus ?? "",
      s6.employmentStatus,
      overwrite,
    ) || undefined;
    next.stage6.employmentPlan = mergeString(
      next.stage6.employmentPlan ?? "",
      s6.employmentPlan,
      overwrite,
    ) || undefined;
    next.stage6.votingPlan = mergeString(
      next.stage6.votingPlan ?? "",
      s6.votingPlan,
      overwrite,
    ) || undefined;

    if (s6.emergencyContacts?.length) {
      const sorted = [...s6.emergencyContacts].sort(
        (a, b) =>
          Number.parseInt(String(a.priority ?? "0"), 10) -
          Number.parseInt(String(b.priority ?? "0"), 10),
      );
      const first = sorted[0];
      if (first?.name?.trim() && !isExtractedNoDataToken(first.name)) {
        if (!next.stage6.emergencyName?.trim() || overwrite) {
          next.stage6.emergencyName = mergeString(
            next.stage6.emergencyName,
            first.name,
            true,
          );
        }
        if (first.relationship?.trim() && !isExtractedNoDataToken(first.relationship)) {
          next.stage6.emergencyRelationship = mergeEmergencyContactRelationship(
            next.stage6.emergencyRelationship,
            first.relationship,
            !next.stage6.emergencyRelationship?.trim() || overwrite,
          );
        }
        if (first.primaryPhone?.trim() && !isExtractedNoDataToken(first.primaryPhone)) {
          next.stage6.primaryPhone = mergeString(
            next.stage6.primaryPhone,
            first.primaryPhone,
            !next.stage6.primaryPhone?.trim() || overwrite,
          );
        }
        if (first.secondaryPhone?.trim() && !isExtractedNoDataToken(first.secondaryPhone)) {
          next.stage6.secondaryPhone = mergeString(
            next.stage6.secondaryPhone,
            first.secondaryPhone,
            !next.stage6.secondaryPhone?.trim() || overwrite,
          );
        }
        const firstH = (first as Stage6EmergencyContact).hospitalPreference;
        if (firstH?.trim() && !isExtractedNoDataToken(firstH)) {
          next.stage6.hospitalPreference = mergeString(
            next.stage6.hospitalPreference,
            firstH,
            !next.stage6.hospitalPreference?.trim() || overwrite,
          );
        }
        const firstP = (first as Stage6EmergencyContact).emergencyProtocol;
        if (firstP?.trim() && !isExtractedNoDataToken(firstP)) {
          next.stage6.emergencyProtocol = mergeString(
            next.stage6.emergencyProtocol,
            firstP,
            !next.stage6.emergencyProtocol?.trim() || overwrite,
          );
        }
      }
    }
  }

  const s7 = draft.stage7;
  if (s7) {
    const applyBool = (cur: boolean, v: boolean | undefined) => {
      if (typeof v !== "boolean") return cur;
      if (overwrite) return v;
      return cur;
    };
    next.stage7.aiNotesReview = applyBool(next.stage7.aiNotesReview, s7.aiNotesReview);
    next.stage7.aiPlanOfCareBuilder = applyBool(
      next.stage7.aiPlanOfCareBuilder,
      s7.aiPlanOfCareBuilder,
    );
    next.stage7.aiGoalTracking = applyBool(next.stage7.aiGoalTracking, s7.aiGoalTracking);
    next.stage7.expiringDocsReminder = applyBool(
      next.stage7.expiringDocsReminder,
      s7.expiringDocsReminder,
    );
    next.stage7.renewalsReminder = applyBool(next.stage7.renewalsReminder, s7.renewalsReminder);

    const ac = s7.auditCycle?.trim().toLowerCase();
    if ((ac === "monthly" || ac === "quarterly") && overwrite) {
      next.stage7.auditCycle = ac;
    }

    next.stage7.assignedQaStaff = mergeString(
      next.stage7.assignedQaStaff,
      s7.assignedQaStaff,
      overwrite,
    );
    next.stage7.requiredVisitDocumentation = mergeString(
      next.stage7.requiredVisitDocumentation,
      s7.requiredVisitDocumentation,
      overwrite,
    );
    next.stage7.notesReviewRules = mergeString(
      next.stage7.notesReviewRules,
      s7.notesReviewRules,
      overwrite,
    );
    next.stage7.billingValidationRules = mergeString(
      next.stage7.billingValidationRules,
      s7.billingValidationRules,
      overwrite,
    );

    next.stage7.teamMembers = mergeTeamMembers(
      next.stage7.teamMembers ?? [],
      s7.teamMembers,
      overwrite,
    );
  }

  const slot = extraction.detectedDocumentType;
  const file = options.importFile ?? null;
  if (file && isDocKeyForImport(slot)) {
    const key: DocKey = slot;
    next.stage3.docs = next.stage3.docs.map((d) =>
      d.key === key
        ? { ...d, file, fileName: file.name }
        : d,
    );
  } else if (file && slot === "unknown") {
    localWarnings.push(
      "We couldn't tell what kind of document this was. Open Healthcare and Documents and attach the file under the right slot.",
    );
  }

  return { formData: next, localWarnings };
}
