import { expect, test } from "vitest";
import { createInitialAddClientFormData } from "../types/formData";
import { attachImportFileToDoc } from "../utils/attachImportFileToDoc";
import { withoutGuessedSlot } from "./ClientImportFromFilePanel";

const file = new File(["%PDF"], "scan.pdf", { type: "application/pdf" });

test("a folder file guessed as ISP moves to the slot the reader detected", () => {
  const formData = attachImportFileToDoc(createInitialAddClientFormData(), "isp", file);
  const next = withoutGuessedSlot(formData, file, "pcpt");
  expect(next.stage3.docs.find(d => d.key === "isp")?.file).toBeUndefined();
});

test("keeps the guessed slot when the reader can't tell the document type", () => {
  const formData = attachImportFileToDoc(createInitialAddClientFormData(), "isp", file);
  expect(withoutGuessedSlot(formData, file, "unknown")).toBe(formData);
});

test("keeps other files in a shared slot", () => {
  const other = new File(["%PDF"], "consent.pdf", { type: "application/pdf" });
  const base = createInitialAddClientFormData();
  const formData = { ...base, stage3: { ...base.stage3, docs: base.stage3.docs.map(d => d.key === "consents" ? { ...d, file, files: [file, other], fileName: "scan.pdf, consent.pdf" } : d) } };
  const consents = withoutGuessedSlot(formData, file, "isp").stage3.docs.find(d => d.key === "consents");
  expect(consents?.file).toBe(other);
  expect(consents?.files).toBeUndefined();
  expect(consents?.fileName).toBe("consent.pdf");
});
