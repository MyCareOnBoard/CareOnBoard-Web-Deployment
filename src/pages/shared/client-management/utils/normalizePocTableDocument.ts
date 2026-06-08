import type {
  ClientPocGenerationResponse,
  PocTableDocument,
  PocTableContact,
} from "../types/clientPocGeneration";

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function emptyClient(): PocTableDocument["client"] {
  return {
    name: "",
    age: "",
    dob: "",
    clientId: "",
    typeOfService: "",
    gender: "",
    address: "",
    city: "",
    stateZipCode: "",
    county: "",
  };
}

function emptyPocTable(): PocTableDocument {
  return {
    client: emptyClient(),
    contacts: [],
    coordination: {
      supportCoordinator: "",
      coordinatorSupervisor: "",
      agency: "",
      phone: "",
      email: "",
    },
    provider: {
      agencyName: "",
      phone: "",
      email: "",
    },
    medical: {
      preferredHospital: [],
      primaryCarePhysician: "",
      diagnosis: "",
      medication: "",
    },
    services: {
      schedule: "",
      hoursDays: "",
      outcomePerIsp: "",
    },
    supportSections: [],
  };
}

function findSection(response: ClientPocGenerationResponse, heading: string) {
  return response.sections?.find(
    (s) => s.heading?.trim().toLowerCase() === heading.toLowerCase(),
  );
}

function sectionItems(section: { body?: string; items?: string[] } | undefined): string[] {
  if (!section) return [];
  const items = section.items?.filter((i) => i.trim()) ?? [];
  if (items.length) return items;
  const body = section.body?.trim();
  return body ? [body] : [];
}

function normalizeContacts(raw: unknown): PocTableContact[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && typeof c === "object")
    .map((c) => {
      const row = c as Record<string, unknown>;
      return {
        name: trim(row.name),
        relationship: trim(row.relationship),
        phone: trim(row.phone),
        email: trim(row.email),
      };
    })
    .filter((c) => c.name || c.phone || c.email);
}

function normalizeSupportSections(raw: unknown): PocTableDocument["supportSections"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s === "object")
    .map((s) => {
      const row = s as Record<string, unknown>;
      const items = Array.isArray(row.items)
        ? row.items.filter((i) => typeof i === "string" && i.trim()).map((i) => String(i).trim())
        : [];
      return {
        heading: trim(row.heading),
        items,
      };
    })
    .filter((s) => s.heading);
}

function deriveFromSections(response: ClientPocGenerationResponse): PocTableDocument {
  const table = emptyPocTable();
  const clientSection = findSection(response, "Client Identifying Information");
  const guardianSection = findSection(response, "Guardian and Care Team Contacts");
  const diagnosisSection = findSection(response, "Diagnosis and Health Information");
  const supportSection = findSection(response, "Person-Centered Preferences and Support Needs");
  const outcomesSection = findSection(response, "Outcomes and Authorized Services");
  const emergencySection = findSection(response, "Emergency Contacts and Medications");

  if (clientSection?.body) {
    table.client.name = clientSection.body.split("\n")[0]?.trim() ?? "";
  }

  const guardianItems = sectionItems(guardianSection);
  table.contacts = guardianItems.map((line) => ({
    name: line,
    relationship: "",
    phone: "",
    email: "",
  }));

  const diagnosisItems = sectionItems(diagnosisSection);
  if (diagnosisItems.length) {
    table.medical.diagnosis = diagnosisItems.join("\n");
  } else if (diagnosisSection?.body) {
    table.medical.diagnosis = diagnosisSection.body.trim();
  }

  const emergencyItems = sectionItems(emergencySection);
  if (emergencyItems.length) {
    table.medical.medication = emergencyItems.join("\n");
  } else if (emergencySection?.body) {
    table.medical.medication = emergencySection.body.trim();
  }

  const outcomeItems = sectionItems(outcomesSection);
  if (outcomeItems.length) {
    table.services.outcomePerIsp = outcomeItems.join("\n");
  } else if (outcomesSection?.body) {
    table.services.outcomePerIsp = outcomesSection.body.trim();
  }

  const supportItems = sectionItems(supportSection);
  if (supportItems.length || supportSection?.body) {
    table.supportSections.push({
      heading: "Person-Centered Preferences and Support Needs",
      items: supportItems.length ? supportItems : [supportSection?.body?.trim() ?? ""].filter(Boolean),
    });
  }

  return table;
}

function normalizeFromPocTable(raw: unknown): PocTableDocument {
  const table = emptyPocTable();
  if (!raw || typeof raw !== "object") return table;

  const obj = raw as Record<string, unknown>;
  const client = obj.client && typeof obj.client === "object" ? (obj.client as Record<string, unknown>) : {};
  const coordination =
    obj.coordination && typeof obj.coordination === "object"
      ? (obj.coordination as Record<string, unknown>)
      : {};
  const provider =
    obj.provider && typeof obj.provider === "object" ? (obj.provider as Record<string, unknown>) : {};
  const medical =
    obj.medical && typeof obj.medical === "object" ? (obj.medical as Record<string, unknown>) : {};
  const services =
    obj.services && typeof obj.services === "object" ? (obj.services as Record<string, unknown>) : {};

  table.client = {
    name: trim(client.name),
    age: trim(client.age),
    dob: trim(client.dob),
    clientId: trim(client.clientId),
    typeOfService: trim(client.typeOfService),
    gender: trim(client.gender),
    address: trim(client.address),
    city: trim(client.city),
    stateZipCode: trim(client.stateZipCode),
    county: trim(client.county),
  };
  table.contacts = normalizeContacts(obj.contacts);
  table.coordination = {
    supportCoordinator: trim(coordination.supportCoordinator),
    coordinatorSupervisor: trim(coordination.coordinatorSupervisor),
    agency: trim(coordination.agency),
    phone: trim(coordination.phone),
    email: trim(coordination.email),
  };
  table.provider = {
    agencyName: trim(provider.agencyName),
    phone: trim(provider.phone),
    email: trim(provider.email),
  };
  table.medical = {
    preferredHospital: Array.isArray(medical.preferredHospital)
      ? medical.preferredHospital
          .filter((line) => typeof line === "string" && line.trim())
          .map((line) => String(line).trim())
      : [],
    primaryCarePhysician: trim(medical.primaryCarePhysician),
    diagnosis: trim(medical.diagnosis),
    medication: trim(medical.medication),
  };
  table.services = {
    schedule: trim(services.schedule),
    hoursDays: trim(services.hoursDays),
    outcomePerIsp: trim(services.outcomePerIsp),
  };
  table.supportSections = normalizeSupportSections(obj.supportSections);

  return table;
}

function hasMeaningfulData(table: PocTableDocument): boolean {
  const clientFilled = Object.values(table.client).some((v) => v.trim());
  return (
    clientFilled ||
    table.contacts.length > 0 ||
    table.supportSections.length > 0 ||
    Object.values(table.coordination).some((v) => v.trim()) ||
    Object.values(table.provider).some((v) => v.trim()) ||
    Object.values(table.medical).some((v) =>
      Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim(),
    ) ||
    Object.values(table.services).some((v) => v.trim())
  );
}

/** Normalize API response into a stable Emergency Plan of Care table document. */
export function normalizePocTableDocument(
  response: ClientPocGenerationResponse,
): PocTableDocument {
  const fromTable = normalizeFromPocTable(response.pocTable);
  if (hasMeaningfulData(fromTable)) return fromTable;
  return deriveFromSections(response);
}

export function displayValue(value: string, fallback = "NA"): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function formatContactPhoneEmail(contact: PocTableContact): string {
  const parts: string[] = [];
  if (contact.phone.trim()) parts.push(`P: ${contact.phone.trim()}`);
  if (contact.email.trim()) parts.push(`E: ${contact.email.trim()}`);
  return parts.join("\n") || "NA";
}
