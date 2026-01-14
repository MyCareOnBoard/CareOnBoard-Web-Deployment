export type MetricKey =
  | "totalNotes"
  | "requiredFields"
  | "goalDocumentation"
  | "goalProgress"
  | "aiValidation"
  | "repeatedMissingNotes";

export type Audience = "agencies" | "users";

export type QualityMetric = {
  key: MetricKey;
  title: string;
  value: string;
  description: string;
};

export type RowItem = {
  id: string;
  name: string;
  imageUrl?: string;
  totalNotes: number | null;
  missingRequiredFields: number | null;
  poorGoalDocumentation: number | null;
  aiValidation: number | null;
};

export function getInitials(label: string) {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}
