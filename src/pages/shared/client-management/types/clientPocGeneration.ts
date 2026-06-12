export type PocGenerationSection = {
  heading: string;
  body: string;
  items?: string[];
};

export type PocGenerationWarning = {
  code: string;
  message: string;
};

export type PocTableClient = {
  name: string;
  age: string;
  dob: string;
  clientId: string;
  typeOfService: string;
  gender: string;
  address: string;
  city: string;
  stateZipCode: string;
  county: string;
};

export type PocTableContact = {
  name: string;
  relationship: string;
  phone: string;
  email: string;
};

export type PocTableDocument = {
  client: PocTableClient;
  contacts: PocTableContact[];
  coordination: {
    supportCoordinator: string;
    coordinatorSupervisor: string;
    agency: string;
    phone: string;
    email: string;
  };
  provider: {
    agencyName: string;
    phone: string;
    email: string;
  };
  medical: {
    preferredHospital: string[];
    primaryCarePhysician: string;
    diagnosis: string;
    medication: string;
  };
  services: {
    schedule: string;
    hoursDays: string;
    outcomePerIsp: string;
  };
  supportSections: Array<{
    heading: string;
    items: string[];
  }>;
};

export type ClientPocGenerationResponse = {
  title: string;
  fileName: string;
  pocTable?: PocTableDocument;
  sections: PocGenerationSection[];
  sourceSummary: {
    usedIsp: boolean;
    usedPcpt: boolean;
    usedFormContext: boolean;
  };
  warnings: PocGenerationWarning[];
  generationJobId?: string;
};

export type GenerateClientPocInput = {
  ispFile?: File | null;
  pcptFile?: File | null;
  ispUrl?: string | null;
  pcptUrl?: string | null;
  clientId?: string | null;
  formContext: Record<string, unknown>;
};
