import type {
  Client,
  ClientInsuranceDetail,
  ClientMedicationRow,
} from "@/lib/api/clients";
import { collectUniqueAssignedDspsForClient } from "@/lib/countUniqueAssignedDsps";

export type ProfileFieldIcon =
  | "user"
  | "mail"
  | "phone"
  | "mapPin"
  | "calendar"
  | "layers"
  | "fileText"
  | "heart"
  | "target"
  | "users"
  | "idCard"
  | "clipboard"
  | "globe"
  | "message"
  | "shield";

export type ProfileField = {
  label: string;
  value: string;
  icon?: ProfileFieldIcon;
  muted?: boolean;
  multiline?: boolean;
  /** Span full width in md 2-col grid */
  fullWidth?: boolean;
};

export type ProfileInsuranceRow = {
  type: string;
  name: string;
  idGroup: string;
  caseManager: string;
  contact: string;
};

export type ProfileMedicationRow = {
  name: string;
  dosage: string;
  frequency: string;
  notes: string;
  selfAdminister: string;
};

export type ProfileSection = {
  id: string;
  title: string;
  subtitle?: string;
  fields: ProfileField[];
  insuranceRows?: ProfileInsuranceRow[];
  medicationRows?: ProfileMedicationRow[];
  listItems?: string[];
  emptyMessage?: string;
  /** Outcomes section: structured list instead of cramped field rows */
  outcomeStatements?: string[];
  outcomeMoreCount?: number;
  outcomeNarrative?: string;
};

export type FormatClientDateFn = (
  dateValue?: string | { _seconds?: number; _nanoseconds?: number } | Date,
) => string;

function trimOrEmpty(v?: string | null): string {
  return (v ?? "").trim();
}

function field(
  label: string,
  value: string,
  opts?: Partial<Omit<ProfileField, "label" | "value">>,
): ProfileField {
  return { label, value, ...opts };
}

function fieldIfPresent(
  label: string,
  raw: string | undefined,
  icon?: ProfileFieldIcon,
): ProfileField | null {
  const v = trimOrEmpty(raw);
  if (!v) return null;
  return field(label, v, { icon });
}

export function formatGender(gender?: string): string {
  if (!gender) return "Not specified";
  return gender.charAt(0).toUpperCase() + gender.slice(1).replace(/-/g, " ");
}

export function formatCommunicationMethod(method?: string): string {
  const m = trimOrEmpty(method);
  if (!m) return "Not specified";
  return m.charAt(0).toUpperCase() + m.slice(1);
}

export function formatLanguagePreference(lang?: string): string {
  const l = trimOrEmpty(lang);
  if (!l) return "Not specified";
  return l.charAt(0).toUpperCase() + l.slice(1);
}

export function formatClientAddress(client: Client): string {
  if (client.primaryAddress) {
    const parts = [
      client.primaryAddress.address,
      client.primaryAddress.countyState,
      client.primaryAddress.zipCode,
    ].filter(Boolean);
    if (parts.length > 0) {
      const primary = parts.join(", ");
      if (client.secondaryAddress) {
        const secondaryParts = [
          client.secondaryAddress.address,
          client.secondaryAddress.countyState,
          client.secondaryAddress.zipCode,
        ].filter(Boolean);
        if (secondaryParts.length > 0) {
          return `${primary} (Primary); ${secondaryParts.join(", ")} (Secondary)`;
        }
      }
      return primary;
    }
  }

  const legacy = [client.address, client.city, client.state, client.zipCode].filter(Boolean);
  return legacy.length > 0 ? legacy.join(", ") : "Address not provided";
}

function mapInsuranceRows(details?: ClientInsuranceDetail[]): ProfileInsuranceRow[] {
  if (!details?.length) return [];
  return details
    .map((d) => ({
      type: trimOrEmpty(d.type) || "—",
      name: trimOrEmpty(d.name) || "—",
      idGroup: trimOrEmpty(d.idGroup) || "—",
      caseManager: trimOrEmpty(d.caseManager) || "—",
      contact: trimOrEmpty(d.contact) || "—",
    }))
    .filter(
      (r) =>
        r.type !== "—" ||
        r.name !== "—" ||
        r.idGroup !== "—" ||
        r.caseManager !== "—" ||
        r.contact !== "—",
    );
}

function buildContactSection(client: Client, formatDate: FormatClientDateFn): ProfileSection {
  const dob = client.dateOfBirth ? formatDate(client.dateOfBirth) : "Not specified";
  const dobMuted = !client.dateOfBirth;

  return {
    id: "contact",
    title: "Contact & profile",
    subtitle: "Demographics and how to reach this client",
    fields: [
      field("Gender", formatGender(client.gender), { icon: "user" }),
      field(client.email ? "Email" : "Email", client.email || "Email not provided", {
        icon: "mail",
        muted: !client.email,
      }),
      field(client.phone ? "Phone number" : "Phone number", client.phone || "Phone not provided", {
        icon: "phone",
        muted: !client.phone,
      }),
      field("Address", formatClientAddress(client), {
        icon: "mapPin",
        multiline: true,
        fullWidth: true,
        muted: formatClientAddress(client) === "Address not provided",
      }),
      field("Date of birth", dob, { icon: "calendar", muted: dobMuted }),
      field("Language preference", formatLanguagePreference(client.languagePreference), {
        icon: "globe",
        muted: !trimOrEmpty(client.languagePreference),
      }),
      field(
        "Preferred communication",
        formatCommunicationMethod(client.communicationMethod),
        { icon: "message", muted: !trimOrEmpty(client.communicationMethod) },
      ),
      field(
        "Tier",
        client.tier ? `Tier ${client.tier}` : "Not specified",
        { icon: "layers", muted: !client.tier },
      ),
      field("Joining date", formatDate(client.createdAt), { icon: "calendar" }),
    ],
  };
}

function buildIspPlanSection(client: Client, formatDate: FormatClientDateFn): ProfileSection | null {
  const meta = client.ispMetadata;
  const fields: ProfileField[] = [
    fieldIfPresent("Plan ID", meta?.planId, "clipboard"),
    fieldIfPresent("Plan type", meta?.planType, "fileText"),
    fieldIfPresent("Program", meta?.program, "layers"),
    meta?.planPrintDate
      ? field("Plan print date", formatDate(meta.planPrintDate), { icon: "calendar" })
      : null,
    meta?.waiverEnrollmentDate
      ? field("Waiver enrollment date", formatDate(meta.waiverEnrollmentDate), { icon: "calendar" })
      : null,
    fieldIfPresent("DDD status", meta?.dddStatus, "idCard"),
    fieldIfPresent("Medicaid type", meta?.medicaidType, "shield"),
  ].filter((f): f is ProfileField => f !== null);

  if (fields.length === 0) {
    return {
      id: "isp-plan",
      title: "ISP plan",
      subtitle: "From the approved Individual Service Plan when available",
      fields: [],
      emptyMessage: "No ISP plan details on file.",
    };
  }

  return {
    id: "isp-plan",
    title: "ISP plan",
    subtitle: "From the approved Individual Service Plan when available",
    fields,
  };
}

function buildIdentifiersSection(client: Client): ProfileSection | null {
  const fields: ProfileField[] = [
    fieldIfPresent("Medicaid ID", client.medicaidId, "idCard"),
    fieldIfPresent("DDD ID", client.dddId, "idCard"),
    fieldIfPresent("Billing rate", client.billingRate, "layers"),
  ].filter((f): f is ProfileField => f !== null);

  if (fields.length === 0) return null;

  return {
    id: "identifiers",
    title: "Coverage & identifiers",
    subtitle: "Medicaid and program identifiers from the ISP",
    fields,
  };
}

function buildInsuranceSection(client: Client): ProfileSection | null {
  const insuranceRows = mapInsuranceRows(client.ispMetadata?.insuranceDetails);
  const hasMedicaidId = !!trimOrEmpty(client.medicaidId);

  if (insuranceRows.length === 0 && !hasMedicaidId) return null;

  return {
    id: "insurance",
    title: "Insurance",
    subtitle: "Payer and insurance details from the ISP",
    fields: [],
    insuranceRows: insuranceRows.length ? insuranceRows : undefined,
    emptyMessage:
      insuranceRows.length === 0 ? "No insurance entries on file." : undefined,
  };
}

function collectTrimmedStringList(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((s) => trimOrEmpty(s)).filter(Boolean);
}

function collectMedicalConditions(client: Client): string[] {
  return collectTrimmedStringList(
    client.healthcareSafety?.medicalConditions ?? client.medicalConditions,
  );
}

function collectAllergies(client: Client): string[] {
  return collectTrimmedStringList(client.healthcareSafety?.allergies ?? client.allergies);
}

function collectMedicationSource(client: Client): ClientMedicationRow[] {
  const raw = client.goalsAndEmergency?.medications ?? client.medications;
  return Array.isArray(raw) ? raw : [];
}

function mapMedicationRows(rows: ClientMedicationRow[]): ProfileMedicationRow[] {
  return rows
    .filter(
      (m) =>
        trimOrEmpty(m.name) ||
        trimOrEmpty(m.dosage) ||
        trimOrEmpty(m.frequency) ||
        trimOrEmpty(m.notes) ||
        typeof m.selfAdminister === "boolean",
    )
    .map((m) => ({
      name: trimOrEmpty(m.name) || "—",
      dosage: trimOrEmpty(m.dosage) || "—",
      frequency: trimOrEmpty(m.frequency) || "—",
      notes: trimOrEmpty(m.notes) || "—",
      selfAdminister:
        typeof m.selfAdminister === "boolean" ? (m.selfAdminister ? "Yes" : "No") : "—",
    }));
}

function buildStringListSection(
  id: string,
  title: string,
  subtitle: string,
  items: string[],
): ProfileSection | null {
  if (items.length === 0) return null;
  return {
    id,
    title,
    subtitle,
    fields: [],
    listItems: items,
  };
}

function buildMedicalConditionsSection(client: Client): ProfileSection | null {
  return buildStringListSection(
    "medical-conditions",
    "Medical conditions",
    "Documented medical conditions",
    collectMedicalConditions(client),
  );
}

function buildAllergiesSection(client: Client): ProfileSection | null {
  return buildStringListSection(
    "allergies",
    "Allergies",
    "Known allergies and sensitivities",
    collectAllergies(client),
  );
}

function buildMedicationsSection(client: Client): ProfileSection | null {
  const medicationRows = mapMedicationRows(collectMedicationSource(client));
  if (medicationRows.length === 0) return null;

  return {
    id: "medications",
    title: "Medications",
    subtitle: "Current medications and administration details",
    fields: [],
    medicationRows,
  };
}

function buildClinicalSection(client: Client): ProfileSection | null {
  const diagnosis =
    trimOrEmpty(client.healthcareSafety?.diagnosis) || trimOrEmpty(client.diagnosis);

  const fields: ProfileField[] = [];
  if (diagnosis) {
    fields.push(field("Diagnosis", diagnosis, { multiline: true }));
  }

  if (fields.length === 0) return null;

  return {
    id: "clinical",
    title: "Clinical (ISP-related)",
    subtitle: "Diagnoses referenced on the ISP",
    fields,
  };
}

function buildOutcomesSection(client: Client): ProfileSection | null {
  const allStatements = (client.outcomes ?? [])
    .map((o) => trimOrEmpty(o.statement))
    .filter(Boolean);
  const narrative =
    trimOrEmpty(client.goalsAndEmergency?.ispOutcomes) || trimOrEmpty(client.ispOutcomes);

  if (allStatements.length === 0 && !narrative) return null;

  const preview = allStatements.slice(0, 3);
  const moreCount = Math.max(0, allStatements.length - preview.length);

  return {
    id: "outcomes",
    title: "Outcomes & goals",
    subtitle: "Outcome statements and goals from the ISP",
    fields: [],
    outcomeStatements: preview,
    outcomeMoreCount: moreCount,
    ...(narrative ? { outcomeNarrative: narrative } : {}),
  };
}

function buildAssignedDspsSection(client: Client): ProfileSection {
  const names = collectUniqueAssignedDspsForClient(client)
    .map((d) => trimOrEmpty(d.name))
    .filter(Boolean);

  if (names.length === 0) {
    return {
      id: "assigned-dsps",
      title: "Assigned DSPs",
      subtitle: "Direct support professionals assigned to this client",
      fields: [],
      emptyMessage: "No staff assigned yet. Assign staff on the Services tab.",
    };
  }

  return {
    id: "assigned-dsps",
    title: "Assigned DSPs",
    subtitle: "Direct support professionals assigned to this client",
    fields: [],
    listItems: names,
  };
}

function buildGuardianSection(client: Client): ProfileSection | null {
  const g = client.guardians?.[0];
  const gi = client.guardianInfo;

  const name =
    trimOrEmpty(g?.name) ||
    trimOrEmpty(gi?.guardianName) ||
    trimOrEmpty(client.guardianName);
  const relationship =
    trimOrEmpty(g?.relationship) ||
    trimOrEmpty(gi?.guardianRelationship) ||
    trimOrEmpty(client.guardianRelationship);
  const phone =
    trimOrEmpty(g?.primaryPhone) ||
    trimOrEmpty(gi?.guardianPhone) ||
    trimOrEmpty(client.guardianPhone);
  const email =
    trimOrEmpty(g?.email) || trimOrEmpty(gi?.guardianEmail) || trimOrEmpty(client.guardianEmail);

  const scName =
    trimOrEmpty(g?.supportCoordinatorName) ||
    trimOrEmpty(gi?.supportCoordinatorName) ||
    trimOrEmpty(client.supportCoordinatorName);
  const scAgency =
    trimOrEmpty(g?.supportCoordinatorAgency) ||
    trimOrEmpty(gi?.supportCoordinatorAgency) ||
    trimOrEmpty(client.supportCoordinatorAgency);
  const scContact =
    trimOrEmpty(g?.supportCoordinatorContact) ||
    trimOrEmpty(gi?.supportCoordinatorContact) ||
    trimOrEmpty(client.supportCoordinatorContact);

  const fields: ProfileField[] = [
    fieldIfPresent("Guardian", name, "users"),
    fieldIfPresent("Relationship", relationship, "user"),
    fieldIfPresent("Guardian phone", phone, "phone"),
    fieldIfPresent("Guardian email", email, "mail"),
    fieldIfPresent("Support coordinator", scName, "users"),
    fieldIfPresent("SC agency", scAgency, "layers"),
    fieldIfPresent("SC contact", scContact, "phone"),
  ].filter((f): f is ProfileField => f !== null);

  if (fields.length === 0) return null;

  return {
    id: "guardian",
    title: "Guardian & care team",
    subtitle: "Primary guardian and support coordinator",
    fields,
  };
}

export function buildProfileSections(
  client: Client,
  formatDate: FormatClientDateFn,
): ProfileSection[] {
  const sections: ProfileSection[] = [buildContactSection(client, formatDate)];

  const ispPlan = buildIspPlanSection(client, formatDate);
  if (ispPlan) sections.push(ispPlan);

  sections.push(buildAssignedDspsSection(client));

  const insurance = buildInsuranceSection(client);
  if (insurance) sections.push(insurance);

  const clinical = buildClinicalSection(client);
  if (clinical) sections.push(clinical);

  const medicalConditions = buildMedicalConditionsSection(client);
  if (medicalConditions) sections.push(medicalConditions);

  const allergies = buildAllergiesSection(client);
  if (allergies) sections.push(allergies);

  const identifiers = buildIdentifiersSection(client);
  if (identifiers) sections.push(identifiers);

  const medications = buildMedicationsSection(client);
  if (medications) sections.push(medications);

  const outcomes = buildOutcomesSection(client);
  if (outcomes) sections.push(outcomes);

  const guardian = buildGuardianSection(client);
  if (guardian) sections.push(guardian);

  return sections;
}
