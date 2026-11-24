import { describe, expect, it } from "vitest";
import { programNoteDefaults } from "./program-note-defaults";

describe("programNoteDefaults", () => {
  it("fills blank note and goals types for community inclusion and day program services", () => {
    expect(programNoteDefaults("H2015-CI", { notesType: "", goalsType: "" })).toEqual({
      notesType: "community-inclusion",
      goalsType: "community_inclusion_individualized_goals",
    });
    expect(programNoteDefaults("h2015-center", { notesType: "", goalsType: "" })).toEqual({
      notesType: "day-habilitation",
      goalsType: "day_habilitation_individualized_goals",
    });
  });

  it("replaces an earlier preset but keeps a hand-picked type", () => {
    expect(
      programNoteDefaults("H2015", { notesType: "community-inclusion", goalsType: "prevocational_training_services" }),
    ).toEqual({ notesType: "day-habilitation", goalsType: "prevocational_training_services" });
  });

  it("leaves other services alone", () => {
    const current = { notesType: "community-based", goalsType: "" };
    expect(programNoteDefaults("H2021HI", current)).toEqual(current);
  });
});
