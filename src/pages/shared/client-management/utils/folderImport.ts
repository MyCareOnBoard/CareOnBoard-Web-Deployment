import { createInitialAddClientFormData, createInitialDocs, type AddClientFormData, type DocKey } from "../types/formData";

export type FolderImportMode = "ddd" | "hha" | "sc";

export const FOLDER_IMPORT_MAX_BYTES = 10 * 1024 * 1024;
export const FOLDER_IMPORT_MAX_CLIENTS = 50;
/** The SC extractor reads at most 5 files per run. */
export const SC_AUTOFILL_MAX_FILES = 5;

const SUPPORTED_TYPES = new Set(["application/pdf", "application/x-pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"]);
const EXTENSION_TYPES: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const IGNORED_NAME = /^(\.|~\$)|^(thumbs\.db|desktop\.ini)$/i;

export type FolderImportFile = { file: File; path: string; docKey: DocKey | null };
export type FolderImportSkipped = { path: string; reason: string };
export type FolderImportClient = {
  id: string;
  /** Subfolder name, used as the client's label until documents are read. */
  name: string;
  files: FolderImportFile[];
  skipped: FolderImportSkipped[];
  /** Files sent to the extractor, keyed by the import slot id the mode's panel expects. */
  autofillFiles: Record<string, File>;
};

/** Relative path of a picked file: webkitRelativePath for folder pickers, the name otherwise. */
export function relativePathOf(file: File & { relativePath?: string }): string {
  return (file.relativePath || file.webkitRelativePath || file.name).replace(/\\/g, "/").replace(/^\/+/, "");
}

/** Browsers sometimes leave `type` empty for PDFs picked from a folder; fall back to the extension. */
function withMimeType(file: File): File {
  if (file.type) return file;
  const type = EXTENSION_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""];
  return type ? new File([file], file.name, { type, lastModified: file.lastModified }) : file;
}

function rules(mode: FolderImportMode): Array<[RegExp, DocKey]> {
  const common: Array<[RegExp, DocKey]> = [
    [/consent|release|hipaa|authori[sz]ation.?to/i, "consents"],
  ];
  if (mode === "hha") return [
    [/(plan.?of.?care|\bpoc\b)/i, "poc"],
    [/\b485\b|cms.?485|form.?485/i, "form485"],
    [/clinical|assessment|oasis|nursing.?eval/i, "clinicalAssessment"],
    [/physician|doctor|\border/i, "physicianOrders"],
    [/medicaid/i, "medicaidCard"],
    [/medicare/i, "medicareCard"],
    [/insurance/i, "insuranceCards"],
    [/guardian|\bpoa\b|power.?of.?attorney/i, "guardianshipDocs"],
    [/discharge|hospital/i, "hospitalDischarge"],
    [/\bid\b|license|identification/i, "idCard"],
    ...common,
  ];
  return [
    [/\bisp\b|individuali[sz]ed.?service.?plan/i, "isp"],
    [/\bpcpt\b|person.?centered/i, "pcpt"],
    [/\bsdr\b|service.?detail/i, "sdr"],
    [/\bbsp\b|behavio/i, "bsp"],
    [/(plan.?of.?care|\bpoc\b)/i, "poc"],
    [/\baenf\b/i, "aenf"],
    [/medical|allerg|seizure|medication/i, "medicalDocs"],
    ...common,
  ];
}

/** Guess the wizard document slot from a file name. SC uploads have no fixed slots. */
export function guessDocKey(fileName: string, mode: FolderImportMode): DocKey | null {
  if (mode === "sc") return null;
  const name = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  return rules(mode).find(([pattern]) => pattern.test(name))?.[1] ?? null;
}

function pickAutofillFiles(files: FolderImportFile[], mode: FolderImportMode): Record<string, File> {
  if (mode === "hha") {
    const out: Record<string, File> = {};
    const poc = files.find(f => f.docKey === "poc") ?? files.find(f => f.docKey === "form485");
    const clinical = files.find(f => f.docKey === "clinicalAssessment");
    if (poc) out.poc = poc.file;
    if (clinical) out.clinicalAssessment = clinical.file;
    // Nothing named like a POC: read the first PDF as the plan of care.
    if (!poc && !clinical) {
      const first = files.find(f => /pdf/.test(f.file.type)) ?? files[0];
      if (first) out.poc = first.file;
    }
    return out;
  }
  if (mode === "sc") {
    const ordered = [...files].sort((a, b) => Number(/isp|service.?plan/i.test(b.file.name)) - Number(/isp|service.?plan/i.test(a.file.name)));
    return Object.fromEntries(ordered.slice(0, SC_AUTOFILL_MAX_FILES).map((f, index) => [`file-${index}`, f.file]));
  }
  const isp = files.find(f => f.docKey === "isp") ?? files.find(f => f.docKey === "poc") ?? files.find(f => /pdf/.test(f.file.type)) ?? files[0];
  return isp ? { file: isp.file } : {};
}

/**
 * Group the files of a picked folder into one client per first-level subfolder.
 * Files at the top level become one client named after the folder, so picking a
 * single client's folder also works. Unsupported or oversized files are listed as skipped.
 */
export function groupFolderFiles(input: File[], mode: FolderImportMode): FolderImportClient[] {
  const groups = new Map<string, { name: string; files: FolderImportFile[]; skipped: FolderImportSkipped[] }>();
  const paths = input.map(file => relativePathOf(file).split("/").filter(Boolean));
  // Folder pickers prefix every path with the picked folder's name; strip it when shared.
  const root = paths.length && paths.every(parts => parts.length > 1 && parts[0] === paths[0][0]) ? paths[0][0] : "";
  input.forEach((raw, index) => {
    const parts = root ? paths[index].slice(1) : paths[index];
    const fileName = parts[parts.length - 1] ?? raw.name;
    if (parts.some(part => IGNORED_NAME.test(part) || part === "__MACOSX")) return;
    const groupName = parts.length > 1 ? parts[0] : (root || "Selected files");
    const group = groups.get(groupName) ?? { name: groupName, files: [], skipped: [] };
    groups.set(groupName, group);
    const path = parts.join("/");
    const file = withMimeType(raw);
    if (!SUPPORTED_TYPES.has(file.type.toLowerCase())) group.skipped.push({ path, reason: "Not a PDF, JPEG, PNG, or WebP file" });
    else if (!file.size) group.skipped.push({ path, reason: "Empty file" });
    else if (file.size > FOLDER_IMPORT_MAX_BYTES) group.skipped.push({ path, reason: "Larger than 10 MB" });
    else group.files.push({ file, path, docKey: guessDocKey(fileName, mode) });
  });
  return [...groups.values()]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((group, index) => ({ ...group, id: `client-${index}`, autofillFiles: pickAutofillFiles(group.files, mode) }));
}

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean).sort().join(" ");

/** True when a folder name reads like an existing client's name, in any word order. */
export function folderMatchesClientName(folderName: string, clientNames: string[]): boolean {
  const key = normalizeName(folderName);
  return Boolean(key) && clientNames.some(name => normalizeName(name) === key);
}

/* In-memory hand-off between the folder dialog and the add-client wizards. Files
 * can't survive a page reload, so a reload simply drops the queue. The batch belongs
 * to the signed-in user, so another account in the same tab never sees it. */
/** Outcome of creating one folder client directly (without the form). */
export type FolderImportResult = { status: "created" | "failed"; message?: string; name?: string; notes?: string[]; documentError?: string };
export type FolderImportSession = { owner: string; mode: FolderImportMode; folderName: string; clients: FolderImportClient[]; created: Record<string, string>; results: Record<string, FolderImportResult> };
let session: FolderImportSession | null = null;

export const folderImportSession = {
  get: (owner: string | undefined) => (owner && session?.owner === owner ? session : null),
  start(owner: string, mode: FolderImportMode, folderName: string, clients: FolderImportClient[]) { session = { owner, mode, folderName, clients, created: {}, results: {} }; },
  setResult(id: string, result: FolderImportResult) { if (session) session.results = { ...session.results, [id]: result }; },
  client(owner: string | undefined, id: string | null | undefined, mode: FolderImportMode) {
    const current = folderImportSession.get(owner);
    return id && current?.mode === mode ? current.clients.find(client => client.id === id) ?? null : null;
  },
  markCreated(id: string, clientId: string) { if (session) session.created = { ...session.created, [id]: clientId }; },
  clear() { session = null; },
};

export const FOLDER_IMPORT_PARAM = "folderImport";

/**
 * Starting wizard data for a folder-imported DDD or HHA client: the type is set and
 * each file whose name matches a document slot is attached there (several files in
 * one slot are kept together). The autofill file always gets a slot so it is saved
 * even when reading it fails. Returns the files left for the user to place by hand.
 */
export function buildFolderImportFormData(client: FolderImportClient, mode: "ddd" | "hha"): { formData: AddClientFormData; unattached: string[] } {
  const base = createInitialAddClientFormData();
  const docs = createInitialDocs(mode);
  const slots = new Map<DocKey, File[]>();
  const unattached: string[] = [];
  const fallbackKey: Record<string, DocKey> = { file: "isp", poc: "poc", clinicalAssessment: "clinicalAssessment" };
  const autofillKeys = new Map<File, DocKey>(Object.entries(client.autofillFiles).map(([slot, file]) => [file, fallbackKey[slot]]));
  for (const { file, path, docKey } of client.files) {
    const key = docKey ?? autofillKeys.get(file);
    if (key && docs.some(doc => doc.key === key)) slots.set(key, [...(slots.get(key) ?? []), file]);
    else unattached.push(path);
  }
  return {
    unattached,
    formData: {
      ...base,
      type: mode,
      stage3: {
        ...base.stage3,
        docs: docs.map(doc => {
          const files = slots.get(doc.key);
          if (!files) return doc;
          return files.length === 1 ? { ...doc, file: files[0], fileName: files[0].name } : { ...doc, file: files[0], files, fileName: files.map(f => f.name).join(", ") };
        }),
      },
    },
  };
}
