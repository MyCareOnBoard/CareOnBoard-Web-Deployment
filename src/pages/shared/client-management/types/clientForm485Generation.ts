export type Form485GenerationWarning = {
  code: string;
  message: string;
};

/** CMS-485 (HCFA-485) fields mapped 1:1 to the numbered boxes on the form. */
export type Form485Document = {
  patientHiClaimNo: string; // 1
  startOfCareDate: string; // 2
  certificationPeriodFrom: string; // 3
  certificationPeriodTo: string; // 3
  medicalRecordNo: string; // 4
  providerNo: string; // 5
  patientName: string; // 6
  patientAddress: string; // 6
  providerName: string; // 7
  providerAddress: string; // 7
  providerPhone: string; // 7
  dateOfBirth: string; // 8
  sex: string; // 9
  medications: string[]; // 10
  principalDiagnosis: string; // 11
  principalDiagnosisDate: string; // 11
  surgicalProcedure: string; // 12
  surgicalProcedureDate: string; // 12
  otherDiagnoses: string[]; // 13
  dmeAndSupplies: string; // 14
  safetyMeasures: string; // 15
  nutritionalRequirements: string; // 16
  allergies: string; // 17
  functionalLimitations: string[]; // 18.A
  activitiesPermitted: string[]; // 18.B
  mentalStatus: string[]; // 19
  prognosis: string; // 20
  ordersForDisciplineAndTreatments: string; // 21
  goalsRehabPotentialDischargePlans: string; // 22
  nurseSignature: string; // 23
  verbalSocDate: string; // 23
  physicianName: string; // 24
  physicianAddress: string; // 24
  dateHhaReceivedSignedPot: string; // 25
  attendingPhysicianSignature: string; // 27
  attendingPhysicianSignatureDate: string; // 27
};

export type ClientForm485GenerationResponse = {
  title: string;
  fileName: string;
  form485: Form485Document;
  sourceSummary: {
    usedPoc: boolean;
    usedClinical: boolean;
    usedFormContext: boolean;
  };
  warnings: Form485GenerationWarning[];
  generationJobId?: string;
};

export type GenerateClientForm485Input = {
  pocFile?: File | null;
  clinicalFile?: File | null;
  pocUrl?: string | null;
  clinicalUrl?: string | null;
  clientId?: string | null;
  formContext: Record<string, unknown>;
};
