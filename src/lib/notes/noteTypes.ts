import { Routes } from '@/routes/constants';
/**
 * Single source of truth for note (activity-log) types.
 *
 * Note ids are persisted as `activityType` on activity logs and `notesType` on
 * shifts. Keep ids stable. DDD types map to the New Jersey DDD activity logs;
 * HHA types are the two home-care notes (personal care vs. everything else).
 */

export type NoteClientType = "ddd" | "hha";

export type NoteTypeId =
  | "career-planning"
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
  {id:"career-planning",title:"Career Planning",shortLabel:"Career Planning",clientType:"ddd"},
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

export const NOTE_ROUTES: Record<NoteTypeId, string> = {
  "career-planning": Routes.userPanel.notes.careerPlanning,
  "community-based": Routes.userPanel.notes.communityBased,
  "community-inclusion": Routes.userPanel.notes.communityInclusion,
  "day-habilitation": Routes.userPanel.notes.dayHabilitation,
  "prevocational-training": Routes.userPanel.notes.preVocationalTraining,
  "supported-employment-intervention": Routes.userPanel.notes.supportedEmploymentIntervention,
  "supported-employment-pre": Routes.userPanel.notes.supportedEmploymentPre,
  "respite-log": Routes.userPanel.notes.respiteLog,
  "hha-personal-care": Routes.userPanel.notes.hhaPersonalCare,
  "hha-service-log": Routes.userPanel.notes.hhaServiceActivityLog,
};

/** Date-only note evidence includes the legacy exact UTC-midnight encoding. */
export function noteServiceDate(value?: string | null): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(value)) return undefined;
  const key = value.slice(0, 10);
  const date = new Date(key + 'T12:00:00');
  return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(key.slice(0, 4)) && date.getMonth() + 1 === Number(key.slice(5, 7)) && date.getDate() === Number(key.slice(8, 10)) ? date : undefined;
}

/** Naive times already belong to the agency; instants must be displayed there. */
export function noteTimedFields(value: string, timezone?: string | null): {date: Date | undefined; time: string} {
  const naive = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::00(?:\.000)?)?$/.exec(value);
  if (naive) return {date: noteServiceDate(naive[1]), time: naive[2]};
  if (timezone && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value))) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date(value));
      const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
      return {date: noteServiceDate(`${part('year')}-${part('month')}-${part('day')}`), time: `${part('hour')}:${part('minute')}`};
    } catch { /* Invalid agency timezone requires review, never a guessed date. */ }
  }
  return {date: undefined, time: ''};
}

/** Advance only within the server-confirmed overnight service dates. */
export function noteEndDate(date: Date, start: string, end: string, serviceDates: string[] = []): string {
  const key = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const startDate = key(date);
  const next = new Date(date); next.setDate(next.getDate() + 1);
  return start && end && end < start && serviceDates.includes(startDate) && serviceDates.includes(key(next)) ? key(next) : startDate;
}
