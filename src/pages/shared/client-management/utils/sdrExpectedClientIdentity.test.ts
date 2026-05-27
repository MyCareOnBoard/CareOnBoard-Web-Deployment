import { describe, expect, it } from "vitest";
import {
  buildExpectedClientIdentityJson,
  hasClientIdentityAnchors,
} from "./sdrExpectedClientIdentity";
import type { Stage1ClientIdentityAndContactData } from "../types/formData";

const emptyStage1: Stage1ClientIdentityAndContactData = {
  firstName: "",
  lastName: "",
  middleName: "",
  medicaidId: "",
  dddId: "",
  ssn: "",
  address: "",
  countyState: "",
  zipCode: "",
  secondaryAddress: "",
  secondaryCountyState: "",
  secondaryZipCode: "",
  phone: "",
  email: "",
};

describe("sdrExpectedClientIdentity", () => {
  it("returns false when stage1 has no anchors", () => {
    expect(hasClientIdentityAnchors(emptyStage1)).toBe(false);
    expect(buildExpectedClientIdentityJson(emptyStage1)).toBeUndefined();
  });

  it("detects dddId anchor and builds JSON", () => {
    const stage1 = { ...emptyStage1, dddId: "692235" };
    expect(hasClientIdentityAnchors(stage1)).toBe(true);
    expect(buildExpectedClientIdentityJson(stage1)).toBe(JSON.stringify({ dddId: "692235" }));
  });

  it("detects full name anchor", () => {
    const stage1 = { ...emptyStage1, firstName: "Jane", lastName: "Doe" };
    expect(hasClientIdentityAnchors(stage1)).toBe(true);
    expect(buildExpectedClientIdentityJson(stage1)).toBe(
      JSON.stringify({ firstName: "Jane", lastName: "Doe" }),
    );
  });
});
