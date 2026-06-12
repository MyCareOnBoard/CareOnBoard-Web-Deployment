import { describe, expect, it } from "vitest";
import { createInitialAddClientFormData } from "../types/formData";
import { withGeneratedPocFile } from "./withGeneratedPocFile";

describe("withGeneratedPocFile", () => {
  it("returns next form data with POC file without mutating input", () => {
    const formData = createInitialAddClientFormData();
    const file = new File(["%PDF"], "generated-poc.pdf", { type: "application/pdf" });
    const issuedOn = new Date("2026-06-08");

    const next = withGeneratedPocFile(formData, {
      file,
      fileName: "generated-poc.pdf",
      issuedOnDate: issuedOn,
    });

    const pocBefore = formData.stage3.docs.find((d) => d.key === "poc");
    const pocAfter = next.stage3.docs.find((d) => d.key === "poc");

    expect(pocBefore?.file).toBeUndefined();
    expect(pocAfter?.file).toBe(file);
    expect(pocAfter?.fileName).toBe("generated-poc.pdf");
    expect(pocAfter?.issuedOnDate).toBe(issuedOn);
  });
});
