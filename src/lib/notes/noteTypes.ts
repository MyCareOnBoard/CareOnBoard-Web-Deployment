/**
 * Single source of truth for note (activity-log) types.
 *
 * Note ids are persisted as `activityType` on activity logs and `notesType` on
 * shifts. Keep ids stable. DDD types map to the New Jersey DDD activity logs;
 * HHA types are the two home-care notes (personal care vs. everything else).
 */

export type NoteClientType = "ddd" | "hha";

export type NoteTypeId =
  | "community-based"
  | "community-inclusion"
  | "day-habilitation"
  | "prevocational-training"
  | "supported-employment-intervention"
  | "supported-employment-pre"
  | "respite-log"
  | "hha-personal-care"
  | "hha-service-log";

export interface NoteTypeDef {
  id: NoteTypeId;
  /** Full title shown as the note/document heading and in pickers. */
  title: string;
  /** Compact label for filter chips, pills, and report dropdowns. */
  shortLabel: string;
  clientType: NoteClientType;
}

export const HHA_PERSONAL_CARE: NoteTypeId = "hha-personal-care";
export const HHA_SERVICE_LOG: NoteTypeId = "hha-service-log";

export const NOTE_TYPES: NoteTypeDef[] = [
  {
    id: "community-based",
    title: "Community Based / Individual Supports",
    shortLabel: "Community Based",
    clientType: "ddd",
  },
  {
    id: "community-inclusion",
    title: "Community Inclusion Services – Activities Log",
    shortLabel: "Community Inclusion",
    clientType: "ddd",
  },
  {
    id: "day-habilitation",
    title: "Day Habilitation Services – Activities Log",
    shortLabel: "Day Habilitation",
    clientType: "ddd",
  },
  {
    id: "prevocational-training",
    title: "Prevocational Training Services – Activities Log",
    shortLabel: "Prevocational",
    clientType: "ddd",
  },
  {
    id: "supported-employment-intervention",
    title: "Supported Employment Services – Intervention Plan and Service Log",
    shortLabel: "Supported Employment",
    clientType: "ddd",
  },
  {
    id: "supported-employment-pre",
    title: "Supported Employment Services – Pre‐Employment Service Log",
    shortLabel: "Employment Pre",
    clientType: "ddd",
  },
  {
    id: "respite-log",
    title: "Respite Log",
    shortLabel: "Respite Log",
    clientType: "ddd",
  },
  {
    id: "hha-personal-care",
    title: "Personal Care Service Note",
    shortLabel: "Personal Care",
    clientType: "hha",
  },
  {
    id: "hha-service-log",
    title: "HHA Service Activity Log",
    shortLabel: "HHA Service Log",
    clientType: "hha",
  },
];

const NOTE_TYPE_BY_ID = new Map<string, NoteTypeDef>(
  NOTE_TYPES.map((noteType) => [noteType.id, noteType]),
);

export function getNoteType(id: string | undefined | null): NoteTypeDef | undefined {
  if (!id) return undefined;
  return NOTE_TYPE_BY_ID.get(id);
}

/** Full title; falls back to the raw id for unknown/legacy types. */
export function getNoteTitle(id: string): string {
  return NOTE_TYPE_BY_ID.get(id)?.title ?? id;
}

/** Compact label; falls back to the raw id for unknown/legacy types. */
export function getNoteShortLabel(id: string): string {
  return NOTE_TYPE_BY_ID.get(id)?.shortLabel ?? id;
}

export function noteTypesForClientType(clientType: NoteClientType): NoteTypeDef[] {
  return NOTE_TYPES.filter((noteType) => noteType.clientType === clientType);
}
