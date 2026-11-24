import { CI_PROGRAMS } from "@/lib/api/ci-tracker";

const PROGRAM_PRESETS = Object.values(CI_PROGRAMS);

/**
 * Note and goals type for community inclusion and day program services, so the
 * scheduler doesn't have to pick them. Only fills a blank choice or replaces an
 * earlier preset; a type the scheduler picked by hand is kept.
 */
export function programNoteDefaults(
  serviceCode: string,
  current: { notesType: string; goalsType: string },
): { notesType: string; goalsType: string } {
  const code = serviceCode.trim().toUpperCase();
  const preset = PROGRAM_PRESETS.find((p) => p.serviceCodes.includes(code));
  const wasPreset = (value: string, key: "notesType" | "goalsType") =>
    !value || PROGRAM_PRESETS.some((p) => p[key] === value);
  return {
    notesType: preset && wasPreset(current.notesType, "notesType") ? preset.notesType : current.notesType,
    goalsType: preset && wasPreset(current.goalsType, "goalsType") ? preset.goalsType : current.goalsType,
  };
}
