import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AlertTriangle, CheckCircle2, FileText, FolderOpen, FolderUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { createInitialDocs } from "../types/formData";
import {
  FOLDER_IMPORT_MAX_CLIENTS,
  FOLDER_IMPORT_PARAM,
  folderImportSession,
  folderMatchesClientName,
  groupFolderFiles,
  type FolderImportClient,
  type FolderImportMode,
} from "../utils/folderImport";

const MAX_DROPPED_FILES = 2000;

function withPath(file: File, path: string): File {
  Object.defineProperty(file, "relativePath", { value: path.replace(/^\/+/, ""), configurable: true });
  return file;
}

/** Walk dropped folders (browsers only expose them through the entries API). */
async function filesFromDrop(dataTransfer: DataTransfer): Promise<File[]> {
  const entries = Array.from(dataTransfer.items || [])
    .map(item => item.webkitGetAsEntry?.() ?? null)
    .filter((entry): entry is FileSystemEntry => Boolean(entry));
  if (!entries.length) return Array.from(dataTransfer.files || []);
  const files: File[] = [];
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (files.length >= MAX_DROPPED_FILES) return;
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      files.push(withPath(file, entry.fullPath || file.name));
      return;
    }
    if (!entry.isDirectory) return;
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries returns results in batches until it returns an empty list.
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) break;
      for (const child of batch) await walk(child);
    }
  };
  for (const entry of entries) await walk(entry);
  return files;
}

const modeLabels: Record<FolderImportMode, string> = { ddd: "DDD", hha: "HHA", sc: "Support Coordination" };

export default function FolderImportDialog({ mode, allowedModes = ["ddd", "hha"], existingClientNames = [], triggerClassName }: {
  /** The agency's current program view; null lets the user choose DDD or HHA. */
  mode: FolderImportMode | null;
  allowedModes?: FolderImportMode[];
  existingClientNames?: string[];
  triggerClassName?: string;
}) {
  const navigate = useNavigate();
  const owner = useAuth().user?.uid;
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [chosenMode, setChosenMode] = useState<FolderImportMode>(() => mode ?? folderImportSession.get(owner)?.mode ?? allowedModes[0] ?? "ddd");
  // Keep an unfinished batch when the user comes back to the clients list.
  const [clients, setClients] = useState<FolderImportClient[] | null>(() => {
    const session = folderImportSession.get(owner);
    return session && (!mode || session.mode === mode) ? session.clients : null;
  });
  const [created, setCreated] = useState<Record<string, string>>(() => folderImportSession.get(owner)?.created ?? {});
  const [folderName, setFolderName] = useState(() => folderImportSession.get(owner)?.folderName ?? "");
  const [dragActive, setDragActive] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const activeMode = mode ?? chosenMode;

  // A saved client sends the user back here with ?folderImport=resume to pick the next one.
  useEffect(() => {
    if (searchParams.get(FOLDER_IMPORT_PARAM) !== "resume") return;
    const session = folderImportSession.get(owner);
    if (session && (!mode || session.mode === mode)) {
      setChosenMode(session.mode);
      setClients(session.clients);
      setCreated(session.created);
      setFolderName(session.folderName);
      setOpen(true);
    }
    const next = new URLSearchParams(searchParams);
    next.delete(FOLDER_IMPORT_PARAM);
    setSearchParams(next, { replace: true });
  }, [mode, owner, searchParams, setSearchParams]);

  // webkitdirectory isn't in React's input typings, so set it when the input mounts.
  const setFolderInput = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    node?.setAttribute("webkitdirectory", "");
    node?.setAttribute("directory", "");
  }, []);

  const loadFiles = useCallback((files: File[]) => {
    setError("");
    const groups = groupFolderFiles(files, activeMode).filter(group => group.files.length || group.skipped.length);
    if (!groups.some(group => group.files.length)) {
      setError("No PDF, JPEG, PNG, or WebP files were found in that folder.");
      return;
    }
    const limited = groups.slice(0, FOLDER_IMPORT_MAX_CLIENTS);
    if (groups.length > limited.length) setError(`Only the first ${FOLDER_IMPORT_MAX_CLIENTS} client folders are listed. Import the rest in another batch.`);
    const firstPath = (files[0] as File & { relativePath?: string }).relativePath || files[0]?.webkitRelativePath || "";
    if (!owner) return;
    const name = firstPath.includes("/") ? firstPath.replace(/^\/+/, "").split("/")[0] : "Selected files";
    setFolderName(name);
    folderImportSession.start(owner, activeMode, name, limited);
    setClients(limited);
    setCreated({});
  }, [activeMode, owner]);

  const docTitles = useMemo(() => {
    if (activeMode === "sc") return {} as Record<string, string>;
    return Object.fromEntries(createInitialDocs(activeMode).map(doc => [doc.key, doc.title])) as Record<string, string>;
  }, [activeMode, owner]);

  const startClient = (client: FolderImportClient) => {
    setOpen(false);
    navigate(`${Routes.agency.addClient}?${FOLDER_IMPORT_PARAM}=${encodeURIComponent(client.id)}`);
  };

  const reset = () => {
    folderImportSession.clear();
    setClients(null);
    setCreated({});
    setError("");
  };

  const createdCount = clients?.filter(client => created[client.id]).length ?? 0;

  return <>
    <Button type="button" variant="outline" size="lg" className={triggerClassName ?? "h-[52px] gap-2 border-[#00b4b8] px-4 text-[#00a3a7] hover:bg-[#e6fafa]"} onClick={() => setOpen(true)}>
      <FolderUp className="h-5 w-5" aria-hidden="true" />Import from folder
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex max-h-[90vh] w-[min(96vw,720px)] flex-col gap-4 p-5">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-lg font-semibold text-[#10141a]">Import clients from a folder</DialogTitle>
          <DialogDescription className="text-[12px] leading-5 text-[#5c6368]">
            Put each client's documents in their own subfolder (for example Clients/Jane Doe/ISP.pdf), then pick the parent folder. Picking one client's folder works too. Each client opens in the {modeLabels[activeMode]} {activeMode === "sc" ? "enrollment" : "add client"} form with their documents attached and read, so you can review before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {!clients ? <>
            {!mode && allowedModes.length > 1 && <fieldset className="space-y-2">
              <legend className="text-[13px] font-semibold text-[#10141a]">Client type</legend>
              <div className="flex flex-wrap gap-2">
                {allowedModes.map(option => <label key={option} className={cn("flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border px-4 text-[13px] font-medium", chosenMode === option ? "border-[#00b4b8] bg-[#e6fafa] text-[#087b80]" : "border-[#dce6e7] text-[#4b6266]")}>
                  <input type="radio" name="folder-import-mode" value={option} checked={chosenMode === option} onChange={() => setChosenMode(option)} />
                  {modeLabels[option]}
                </label>)}
              </div>
            </fieldset>}
            <div
              role="presentation"
              className={cn("rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors", dragActive ? "border-[#00b4b8] bg-[#e6fafa]" : "border-[#dce6e7] bg-[#f8fafb]")}
              onDragEnter={event => { event.preventDefault(); setDragActive(true); }}
              onDragOver={event => { event.preventDefault(); setDragActive(true); }}
              onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragActive(false); }}
              onDrop={event => {
                event.preventDefault();
                setDragActive(false);
                setReading(true);
                void filesFromDrop(event.dataTransfer)
                  .then(files => (files.length ? loadFiles(files) : setError("That folder is empty.")))
                  .catch(() => setError("The folder could not be read. Try Choose folder instead."))
                  .finally(() => setReading(false));
              }}
            >
              <FolderOpen className="mx-auto mb-3 h-10 w-10 text-[#00b4b8]" aria-hidden="true" />
              <p className="text-[14px] font-semibold text-[#10141a]">{reading ? "Reading folder…" : "Drop a folder here"}</p>
              <p className="mb-4 text-[12px] text-[#5c6368]">PDF, JPEG, PNG, or WebP files up to 10 MB each</p>
              <input ref={setFolderInput} type="file" multiple tabIndex={-1} className="sr-only" id="folder-import-input" aria-label="Choose folder"
                onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ""; if (files.length) loadFiles(files); }} />
              <Button type="button" disabled={reading} onClick={() => inputRef.current?.click()}>Choose folder</Button>
            </div>
          </> : <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-[#4b6266]">
                <span className="font-semibold text-[#10141a]">{clients.length} {clients.length === 1 ? "client" : "clients"}</span>{folderName ? ` in ${folderName}` : ""} · {createdCount} saved · {modeLabels[activeMode]}
              </p>
              <Button type="button" variant="outline" className="h-10" onClick={reset}>Choose another folder</Button>
            </div>
            <ul aria-label="Clients found in the folder" className="space-y-3">
              {clients.map(client => {
                const savedId = created[client.id];
                const duplicate = folderMatchesClientName(client.name, existingClientNames);
                const autofill = new Set(Object.values(client.autofillFiles));
                return <li key={client.id} className="rounded-2xl border border-[#dce6e7] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-semibold text-[#10141a] [overflow-wrap:anywhere]">{client.name}</h3>
                      <p className="text-[12px] text-[#617579]">{client.files.length} {client.files.length === 1 ? "document" : "documents"}{client.skipped.length ? ` · ${client.skipped.length} skipped` : ""}</p>
                      {duplicate && !savedId && <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-amber-800"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />A client with this name already exists. Check before creating another.</p>}
                    </div>
                    {savedId
                      ? <div className="flex items-center gap-3"><span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#087b80]"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Saved</span><Link className="text-[13px] font-semibold text-[#00a3a7] underline-offset-2 hover:underline" to={Routes.agency.clientDetails.replace(":clientId", savedId)}>Open client</Link></div>
                      : <Button type="button" className="h-10" disabled={!client.files.length} onClick={() => startClient(client)} aria-label={`Set up ${client.name}`}>Set up client</Button>}
                  </div>
                  {client.files.length > 0 && <ul className="mt-3 space-y-1.5">
                    {client.files.map(({ file, path, docKey }) => <li key={path} className="flex items-start gap-2 text-[12px] leading-5">
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#087b80]" aria-hidden="true" />
                      <span className="min-w-0 flex-1 text-[#10141a] [overflow-wrap:anywhere]">{path}</span>
                      <span className="shrink-0 text-[#617579]">{[autofill.has(file) ? "Read for autofill" : "", docKey ? docTitles[docKey] ?? "" : activeMode === "sc" ? "Attached" : ""].filter(Boolean).join(" · ") || "Attach in step 3"}</span>
                    </li>)}
                  </ul>}
                  {client.skipped.length > 0 && <details className="mt-2 text-[12px] text-[#617579]"><summary className="cursor-pointer">Skipped files</summary>
                    <ul className="mt-1 space-y-1">{client.skipped.map(item => <li key={item.path} className="[overflow-wrap:anywhere]">{item.path}: {item.reason}</li>)}</ul>
                  </details>}
                </li>;
              })}
            </ul>
          </>}
          {error && <p role="alert" className="text-[12px] font-medium text-red-600">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
