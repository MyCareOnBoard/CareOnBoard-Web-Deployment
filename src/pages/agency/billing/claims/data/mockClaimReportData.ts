export type ClaimReportServiceLine = {
  duration: string;
  placeOfService: string;
  emg: string;
  cptHcpcs: string;
  modifier: string;
  diagnosisPointer: string;
  charges: string;
  epsotFamilyPlan: string;
  idQual1: string;
  idQual2: string;
};

export type ClaimReportSummary = {
  totalClaimsProcessed: number;
  totalUnitsBilled: string;
  totalAuthorizedHours: string;
  totalClaimAmount: string;
};

export type ClaimSignaturePayload = {
  signatureType: "type" | "draw" | "upload";
  signatureData: string;
};

export type ClaimReportFormState = {
  clientName: string;
  clientAvatarUrl?: string;
  dateOfBirth: string;
  serviceCode: string;
  patientSex: string;
  patientAddress: string;
  city: string;
  state: string;
  zipCode: string;
  conditionEmployment: boolean;
  conditionAutoAccident: boolean;
  conditionOtherAccident: boolean;
  outsideLab: "yes" | "no";
  serviceDateIso: string;
  signedSignature: ClaimSignaturePayload | null;
  currentIllnessDateIso: string;
  qualCode: string;
  diagnosisCodes: Record<string, string>;
  hospitalizationInitialIso: string;
  hospitalizationEndIso: string;
  chargesCurrency: string;
  chargesAmount: string;
  priorAuthDateIso: string;
  physicianSignature: ClaimSignaturePayload | null;
  signatureDateIso: string;
  paNumber: string;
  serviceLines: ClaimReportServiceLine[];
  summary: ClaimReportSummary;
};

export const CLAIM_REPORT_AGREEMENT_TEXT =
  "PATIENTS OR AUTHORIZED PERSONS SIGNATURE. I authorize the release any medical or other information necessary to process this claim. I also request payment of government benefits either to myself or the party who accepts assignment below.";

export const DIAGNOSIS_CODE_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

const DEFAULT_DIAGNOSIS_CODES: Record<string, string> = Object.fromEntries(
  DIAGNOSIS_CODE_LETTERS.map((letter) => [letter, ""])
);

export const DEFAULT_SERVICE_LINES: ClaimReportServiceLine[] = [
  {
    duration: "04/21/2026 → 04/21/2026",
    placeOfService: "99",
    emg: "-",
    cptHcpcs: "H2016",
    modifier: "HI",
    diagnosisPointer: "A",
    charges: "$650",
    epsotFamilyPlan: "-",
    idQual1: "NPI",
    idQual2: "826",
  },
  {
    duration: "04/21/2026 → 04/21/2026",
    placeOfService: "99",
    emg: "-",
    cptHcpcs: "H2016",
    modifier: "HI",
    diagnosisPointer: "A",
    charges: "$650",
    epsotFamilyPlan: "-",
    idQual1: "NPI",
    idQual2: "826",
  },
  {
    duration: "04/22/2026 → 04/22/2026",
    placeOfService: "99",
    emg: "-",
    cptHcpcs: "H2016",
    modifier: "HI",
    diagnosisPointer: "A",
    charges: "$650",
    epsotFamilyPlan: "-",
    idQual1: "NPI",
    idQual2: "826",
  },
  {
    duration: "04/23/2026 → 04/23/2026",
    placeOfService: "99",
    emg: "-",
    cptHcpcs: "H2016",
    modifier: "HI",
    diagnosisPointer: "A",
    charges: "$650",
    epsotFamilyPlan: "-",
    idQual1: "NPI",
    idQual2: "826",
  },
];

export const DEFAULT_CLAIM_REPORT_SUMMARY: ClaimReportSummary = {
  totalClaimsProcessed: 24,
  totalUnitsBilled: "4,820",
  totalAuthorizedHours: "5,000 hrs",
  totalClaimAmount: "$216,700",
};

export const DEFAULT_CLAIM_REPORT: ClaimReportFormState = {
  clientName: "Cameron Williamson",
  clientAvatarUrl: "/placeholder-avatar.jpg",
  dateOfBirth: "21 APRIL 1947",
  serviceCode: "LE1 4NR",
  patientSex: "Male",
  patientAddress: "3517 W. Gray St. Utica...",
  city: "Overland Park, KS",
  state: "Martin Van Buren",
  zipCode: "90004",
  conditionEmployment: true,
  conditionAutoAccident: false,
  conditionOtherAccident: false,
  outsideLab: "yes",
  serviceDateIso: "2026-04-07",
  signedSignature: null,
  currentIllnessDateIso: "2026-04-07",
  qualCode: "",
  diagnosisCodes: { ...DEFAULT_DIAGNOSIS_CODES },
  hospitalizationInitialIso: "2026-05-24",
  hospitalizationEndIso: "2026-04-30",
  chargesCurrency: "USD",
  chargesAmount: "0.00",
  priorAuthDateIso: "2026-04-30",
  physicianSignature: null,
  signatureDateIso: "2026-04-07",
  paNumber: "HA9 9HF",
  serviceLines: DEFAULT_SERVICE_LINES,
  summary: DEFAULT_CLAIM_REPORT_SUMMARY,
};

export const CLAIM_REPORT_TABLE_COLUMNS = [
  "Duration of service",
  "Place of service",
  "EMG",
  "CPT/HCPCS",
  "MODIFIER",
  "Diagnosis pointer",
  "Charges",
  "EPSOT family plan",
  "ID QUAL",
  "ID QUAL",
] as const;

export const CLAIM_REPORT_TABLE_GRID =
  "grid grid-cols-[minmax(140px,1.4fr)_minmax(60px,0.7fr)_minmax(40px,0.5fr)_minmax(70px,0.8fr)_minmax(60px,0.7fr)_minmax(70px,0.8fr)_minmax(60px,0.7fr)_minmax(80px,0.9fr)_minmax(50px,0.6fr)_minmax(50px,0.6fr)] items-center gap-2";
