import { afterEach, describe, expect, test } from "vitest";
import { buildFolderImportFormData, folderImportSession, folderMatchesClientName, groupFolderFiles, guessDocKey } from "./folderImport";

function fileAt(path: string, type = "application/pdf", size = 10): File {
  const name = path.split("/").pop()!;
  const file = new File(["x".repeat(size)], name, { type });
  Object.defineProperty(file, "webkitRelativePath", { value: path });
  return file;
}

afterEach(() => folderImportSession.clear());

describe("groupFolderFiles", () => {
  test("makes one client per subfolder and strips the picked folder name", () => {
    const groups = groupFolderFiles([
      fileAt("Clients/Jane Doe/ISP 2026.pdf"),
      fileAt("Clients/Jane Doe/Consent form.pdf"),
      fileAt("Clients/Bob Ray/scan.png", "image/png"),
      fileAt("Clients/Bob Ray/notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      fileAt("Clients/Jane Doe/.DS_Store", ""),
    ], "ddd");
    expect(groups.map(g => g.name)).toEqual(["Bob Ray", "Jane Doe"]);
    const jane = groups[1];
    expect(jane.files.map(f => [f.path, f.docKey])).toEqual([["Jane Doe/ISP 2026.pdf", "isp"], ["Jane Doe/Consent form.pdf", "consents"]]);
    expect(jane.autofillFiles.file.name).toBe("ISP 2026.pdf");
    expect(groups[0].skipped).toEqual([{ path: "Bob Ray/notes.docx", reason: "Not a PDF, JPEG, PNG, or WebP file" }]);
    expect(groups[0].autofillFiles.file.name).toBe("scan.png");
  });

  test("treats a single client's folder as one client and fills in a missing PDF type", () => {
    const groups = groupFolderFiles([fileAt("Jane Doe/plan_of_care.pdf", ""), fileAt("Jane Doe/clinical-assessment.pdf")], "hha");
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Jane Doe");
    expect(groups[0].files[0].file.type).toBe("application/pdf");
    expect(Object.keys(groups[0].autofillFiles)).toEqual(["poc", "clinicalAssessment"]);
  });

  test("skips oversized and empty files", () => {
    const big = fileAt("A/Client/isp.pdf");
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    const groups = groupFolderFiles([big, fileAt("A/Client/empty.pdf", "application/pdf", 0)], "ddd");
    expect(groups[0].files).toEqual([]);
    expect(groups[0].skipped.map(s => s.reason)).toEqual(["Larger than 10 MB", "Empty file"]);
  });

  test("SC reads up to five files, ISP first", () => {
    const files = ["a.pdf", "b.pdf", "c.pdf", "d.pdf", "e.pdf", "ISP.pdf"].map(name => fileAt(`Root/Client/${name}`));
    const [client] = groupFolderFiles(files, "sc");
    expect(client.files.every(f => f.docKey === null)).toBe(true);
    expect(Object.values(client.autofillFiles).map(f => f.name)).toEqual(["ISP.pdf", "a.pdf", "b.pdf", "c.pdf", "d.pdf"]);
  });
});

test("guessDocKey matches common file names per program", () => {
  expect(guessDocKey("Form 485 signed.pdf", "hha")).toBe("form485");
  expect(guessDocKey("Medicaid_card.jpg", "hha")).toBe("medicaidCard");
  expect(guessDocKey("SDR-report.pdf", "ddd")).toBe("sdr");
  expect(guessDocKey("Behavior support plan.pdf", "ddd")).toBe("bsp");
  expect(guessDocKey("random.pdf", "ddd")).toBeNull();
});

test("buildFolderImportFormData attaches files to their slots and lists the rest", () => {
  const [client] = groupFolderFiles([fileAt("C/Jane/ISP.pdf"), fileAt("C/Jane/consent 1.pdf"), fileAt("C/Jane/consent 2.pdf"), fileAt("C/Jane/misc.pdf")], "ddd");
  const { formData, unattached } = buildFolderImportFormData(client, "ddd");
  expect(formData.type).toBe("ddd");
  const doc = (key: string) => formData.stage3.docs.find(d => d.key === key)!;
  expect(doc("isp").file?.name).toBe("ISP.pdf");
  expect(doc("consents").files?.map(f => f.name)).toEqual(["consent 1.pdf", "consent 2.pdf"]);
  expect(unattached).toEqual(["Jane/misc.pdf"]);
});

test("the autofill file gets the ISP slot when its name matches nothing", () => {
  const [client] = groupFolderFiles([fileAt("C/Jane/scan001.pdf")], "ddd");
  const { formData, unattached } = buildFolderImportFormData(client, "ddd");
  expect(formData.stage3.docs.find(d => d.key === "isp")?.file?.name).toBe("scan001.pdf");
  expect(unattached).toEqual([]);
});

test("folderMatchesClientName ignores case, punctuation and word order", () => {
  expect(folderMatchesClientName("doe, jane", ["Jane Doe"])).toBe(true);
  expect(folderMatchesClientName("Jane_Doe", ["Janet Doe"])).toBe(false);
});

test("the session only hands a client to the same user and program", () => {
  const groups = groupFolderFiles([fileAt("C/Jane/ISP.pdf")], "ddd");
  folderImportSession.start("user-a", "ddd", "C", groups);
  expect(folderImportSession.client("user-a", "client-0", "ddd")?.name).toBe("Jane");
  expect(folderImportSession.client("user-a", "client-0", "hha")).toBeNull();
  expect(folderImportSession.client("user-b", "client-0", "ddd")).toBeNull();
  expect(folderImportSession.get(undefined)).toBeNull();
  folderImportSession.markCreated("client-0", "abc");
  expect(folderImportSession.get("user-a")?.created).toEqual({ "client-0": "abc" });
});
