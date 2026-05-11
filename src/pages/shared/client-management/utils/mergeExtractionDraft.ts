import type { ClientExtractionResponse } from "../types/clientExtraction";
import { isDocKeyForImport } from "../types/clientExtraction";
import type {
  AddClientFormData,
  DocKey,
  EmergencyContactRelationship,
  Service,
  ServicePayType,
  YesNo,
} from "../types/formData";
import { EMERGENCY_CONTACT_RELATIONSHIP_VALUES } from "../types/formData";

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

function normalizePayType(raw: string | undefined): ServicePayType | undefined {
  if (!raw?.trim() || isExtractedNoDataToken(raw)) return undefined;
  const t = raw.toLowerCase();
  if (t === "hourly" || t === "15-min" || t === "daily") {
    return t as ServicePayType;
  }
  if (t.includes("15") && t.includes("min")) return "15-min";
  if (t.includes("hour") || t === "hr" || (t.includes("unit") && t.includes("hour")))
    return "hourly";
  if (t.includes("day")) return "daily";
  return undefined;
}

function newServiceId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `service-${crypto.randomUUID()}`
    : `service-${Math.random().toString(16).slice(2)}`;
}

function mapRowToService(row: Record<string, unknown>): Service {
  const r = row as Record<string, string | undefined>;
  const strOrUndef = (x: string | undefined) => {
    const v = x?.trim();
    if (!v || isExtractedNoDataToken(x)) return undefined;
    return v;
  };
  return {
    id: newServiceId(),
    name: strOrUndef(r.name),
    code: strOrUndef(r.code),
    hours: mergeString("", r.hours, true),
    totalApprovedHours: mergeString("", r.totalApprovedHours, true),
    rate: mergeString("", r.rate, true),
    payType: normalizePayType(r.payType) ?? normalizePayType(r.unitType),
    clientRate: mergeString("", r.clientRate, true),
    clientPayType: normalizePayType(r.clientPayType),
    ispEffectiveDate: parseIsoOrUsDate(r.ispEffectiveDate),
    startAuthDate: parseIsoOrUsDate(r.startAuthDate),
    endAuthDate: parseIsoOrUsDate(r.endAuthDate),
    pcptDate: parseIsoOrUsDate(r.pcptDate),
    sdrStartDate: parseIsoOrUsDate(r.sdrStartDate),
    sdrEndDate: parseIsoOrUsDate(r.sdrEndDate),
  };
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
    !String(s.rate ?? "").trim()
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

  return {
    ...existing,
    id: existing.id,
    name: str(existing.name, incoming.name),
    code: str(existing.code, incoming.code),
    hours: mergeString(existing.hours ?? "", incoming.hours ?? "", overwrite),
    totalApprovedHours: mergeString(
      existing.totalApprovedHours ?? "",
      incoming.totalApprovedHours ?? "",
      overwrite,
    ),
    rate: mergeString(existing.rate ?? "", incoming.rate ?? "", overwrite),
    payType: pay(existing.payType, incoming.payType),
    clientRate: mergeString(existing.clientRate ?? "", incoming.clientRate ?? "", overwrite),
    clientPayType: pay(existing.clientPayType, incoming.clientPayType),
    ispEffectiveDate: date(existing.ispEffectiveDate, incoming.ispEffectiveDate),
    startAuthDate: date(existing.startAuthDate, incoming.startAuthDate),
    endAuthDate: date(existing.endAuthDate, incoming.endAuthDate),
    pcptDate: date(existing.pcptDate, incoming.pcptDate),
    sdrStartDate: date(existing.sdrStartDate, incoming.sdrStartDate),
    sdrEndDate: date(existing.sdrEndDate, incoming.sdrEndDate),
  };
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
      services: prev.stage2.services.map((s) => ({ ...s })),
    },
    stage3: {
      ...prev.stage3,
      medicalConditions: [...prev.stage3.medicalConditions],
      allergies: [...prev.stage3.allergies],
      dietaryRestrictions: [...prev.stage3.dietaryRestrictions],
      mobilitySupportNeeds: [...prev.stage3.mobilitySupportNeeds],
      communicationNeeds: [...prev.stage3.communicationNeeds],
      docs: prev.stage3.docs.map((d) => ({ ...d })),
    },
    stage4: { ...prev.stage4 },
    stage5: {
      ...prev.stage5,
      secondaryDsps: [...prev.stage5.secondaryDsps],
      autoChecks: { ...prev.stage5.autoChecks },
    },
    stage6: { ...prev.stage6 },
    stage7: { ...prev.stage7 },
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
    next.stage2.guardianRelationship = mergeString(
      next.stage2.guardianRelationship ?? "",
      s2.guardianRelationship,
      overwrite,
    ) || undefined;
    next.stage2.guardianEmail = mergeString(
      next.stage2.guardianEmail,
      s2.guardianEmail,
      overwrite,
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

    if (s2.services?.length) {
      const mapped = s2.services.map((row) =>
        mapRowToService(row as unknown as Record<string, unknown>),
      );
      next.stage2.services = applyImportedServices(
        next.stage2.services,
        mapped,
        overwrite,
      );
      localWarnings.push(
        "Confirm each imported service matches your agency's service list before saving.",
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
