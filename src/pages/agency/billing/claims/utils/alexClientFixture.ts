import type { Client } from "@/lib/api/clients";
import type { ClientService } from "@/lib/api/clients";

export const alexClientFixture: Client = {
  id: "yM6mXlT2O29x9pyZQ1hf",
  firstName: "Alex",
  lastName: "Bran-Monzon",
  gender: "male",
  dateOfBirth: { _seconds: 1073347200, _nanoseconds: 0 },
  medicaidId: "112081536401",
  primaryAddress: {
    address: "AP-7, 8, 46680 Algemesí, Valencia, Spain",
    countyState: "Valencia / Comunidad Valenciana",
    zipCode: "46680",
  },
  primaryDiagnosis: "F84.0 - Autism Spectrum Disorder",
  outcomes: [],
};

export const alexMatchedServiceFixture: ClientService = {
  id: "service-45a70edf-687f-4894-9da8-35bfa85da888",
  name: "Community Based Supports",
  code: "H2021HI",
  location: "Community",
  clientRate: "$9.61",
  clientPayType: "15-min",
  totalApprovedHours: "75.75",
  sdrPriorAuthorization: {
    paNumber: "1553253313",
  },
};

export const alexShiftTimingFixture = {
  serviceDate: "June 7, 2026",
  durationStart: "9:00 AM",
  durationEnd: "2:45 PM",
  totalHours: "5.75",
  serviceCode: "H2021HI",
  paNumber: "1553253313",
};
