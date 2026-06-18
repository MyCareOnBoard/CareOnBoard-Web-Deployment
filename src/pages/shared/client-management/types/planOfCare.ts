/**
 * Plan of Care / Personal Care Services form model (CHHA).
 * Mirrors the paper form so it can be filled on a tablet/phone, exported to PDF
 * (filled or blank), and attached as the client's POC document.
 */

export type PocTaskOption = { key: string; label: string };
export type PocTaskDef = {
  id: string;
  label: string;
  options: PocTaskOption[];
};

/** Data-driven task list — drives both the form UI and the PDF. */
export const POC_TASKS: PocTaskDef[] = [
  {
    id: "ambulation",
    label: "Ambulation",
    options: [
      { key: "assistCane", label: "Assist Cane" },
      { key: "walker", label: "Walker" },
      { key: "wheelchair", label: "Wheelchair" },
      { key: "bedrest", label: "Bedrest" },
    ],
  },
  {
    id: "feeding",
    label: "Feeding",
    options: [
      { key: "mealPrep", label: "Meal Prep" },
      { key: "feed", label: "Feed" },
      { key: "breakfast", label: "Breakfast" },
      { key: "lunch", label: "Lunch" },
      { key: "dinner", label: "Dinner" },
    ],
  },
  {
    id: "bathing",
    label: "Bathing",
    options: [
      { key: "tub", label: "Tub" },
      { key: "shower", label: "Shower" },
      { key: "chair", label: "Chair" },
      { key: "bed", label: "Bed" },
    ],
  },
  {
    id: "shampoo",
    label: "Shampoo",
    options: [
      { key: "inSink", label: "In Sink" },
      { key: "inShower", label: "In Shower" },
      { key: "inBed", label: "In Bed" },
    ],
  },
  {
    id: "oralCare",
    label: "Oral Care",
    options: [
      { key: "dentures", label: "Dentures" },
      { key: "brushing", label: "Brushing" },
    ],
  },
  {
    id: "nailCare",
    label: "Nail Care",
    options: [
      { key: "clean", label: "Clean" },
      { key: "file", label: "File (Do not cut)" },
    ],
  },
  {
    id: "footCare",
    label: "Foot Care",
    options: [
      { key: "soak", label: "Soak" },
      { key: "applyLotion", label: "Apply Lotion" },
    ],
  },
  {
    id: "skinCare",
    label: "Skin Care",
    options: [{ key: "applyLotion", label: "Apply Lotion" }],
  },
  {
    id: "hairCare",
    label: "Hair Care",
    options: [
      { key: "shampoo", label: "Shampoo" },
      { key: "combBrush", label: "Comb / Brush" },
    ],
  },
  {
    id: "shaving",
    label: "Shaving",
    options: [{ key: "electricRazor", label: "Electric Razor" }],
  },
  {
    id: "transfer",
    label: "Transfer",
    options: [
      { key: "assistBedToChair", label: "Assist Bed to Chair" },
      { key: "pivot", label: "Pivot" },
      { key: "hoyerLift", label: "Hoyer Lift" },
    ],
  },
  {
    id: "dress",
    label: "Dress",
    options: [
      { key: "assist", label: "Assist" },
      { key: "complete", label: "Complete" },
    ],
  },
  {
    id: "elimination",
    label: "Elimination",
    options: [
      { key: "assistToBathroom", label: "Assist to Bathroom" },
      { key: "commode", label: "Commode" },
      { key: "toilet", label: "Toilet" },
      { key: "urinal", label: "Urinal" },
      { key: "bedpan", label: "Bedpan" },
      { key: "changeBriefs", label: "Change Briefs / Pads / Diaper" },
      { key: "periCare", label: "Peri Care — Keep Clean and Dry" },
    ],
  },
  { id: "positioning", label: "Positioning", options: [] },
  {
    id: "romExercises",
    label: "ROM Exercises",
    options: [
      { key: "active", label: "Active" },
      { key: "passive", label: "Passive" },
    ],
  },
  { id: "lightHousekeeping", label: "Light Housekeeping", options: [] },
  { id: "changeLinens", label: "Change Linens", options: [] },
  { id: "laundry", label: "Laundry", options: [] },
  { id: "keepPatientAreaClean", label: "Keep patient area clean and neat", options: [] },
  { id: "shopping", label: "Shopping", options: [] },
  { id: "assistWithMedications", label: "Assist with Medications", options: [] },
];

export type PocTaskState = {
  options: Record<string, boolean>;
  frequency: string;
};

export type PocAdvanceDirective = "" | "no" | "yes";

export type PocSignatureType = "type" | "draw" | "upload";

export type PlanOfCareFormData = {
  dateOfInitialPoc?: Date;
  clientName: string;
  startOfCare?: Date;
  medicalNursingDx: string;
  allergies: string;
  daysHoursOfService: string;
  advanceDirective: PocAdvanceDirective;
  advanceDirectiveCopyObtained: boolean;
  advanceDirectiveInfoGiven: boolean;
  advanceDirectiveInfoRefused: boolean;
  tasks: Record<string, PocTaskState>;
  shortTermGoals: { personalCareMet: boolean; freeFromInjury: boolean; other: string };
  longTermGoals: { maxIndependence: boolean; safeEnvironment: boolean; other: string };
  dischargePlan: {
    adequateFunctioning: boolean;
    independentManagement: boolean;
    other: string;
  };
  changesToReportToRn: [string, string];
  rnName: string;
  rnSignature: string;
  rnSignatureType?: PocSignatureType;
  rnDate?: Date;
  clientRepName: string;
  clientRepRelationship: string;
  clientRepSignature: string;
  clientRepSignatureType?: PocSignatureType;
  clientRepDate?: Date;
};

export function createEmptyPlanOfCareForm(
  prefill: Partial<PlanOfCareFormData> = {},
): PlanOfCareFormData {
  const tasks: Record<string, PocTaskState> = {};
  for (const t of POC_TASKS) {
    const options: Record<string, boolean> = {};
    for (const o of t.options) options[o.key] = false;
    tasks[t.id] = { options, frequency: "" };
  }
  return {
    dateOfInitialPoc: undefined,
    clientName: "",
    startOfCare: undefined,
    medicalNursingDx: "",
    allergies: "",
    daysHoursOfService: "",
    advanceDirective: "",
    advanceDirectiveCopyObtained: false,
    advanceDirectiveInfoGiven: false,
    advanceDirectiveInfoRefused: false,
    tasks,
    shortTermGoals: { personalCareMet: false, freeFromInjury: false, other: "" },
    longTermGoals: { maxIndependence: false, safeEnvironment: false, other: "" },
    dischargePlan: { adequateFunctioning: false, independentManagement: false, other: "" },
    changesToReportToRn: ["", ""],
    rnName: "",
    rnSignature: "",
    rnDate: undefined,
    clientRepName: "",
    clientRepRelationship: "",
    clientRepSignature: "",
    clientRepDate: undefined,
    ...prefill,
  };
}

export function buildPlanOfCareFileName(clientName: string): string {
  const safe =
    clientName.trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "") || "client";
  return `${safe}_plan_of_care.pdf`;
}
