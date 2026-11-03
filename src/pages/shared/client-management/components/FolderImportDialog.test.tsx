import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes as RouterRoutes, useNavigate, useSearchParams } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import FolderImportDialog from "./FolderImportDialog";
import { folderImportSession } from "../utils/folderImport";

function fileAt(path: string, type = "application/pdf") {
  const file = new File(["%PDF"], path.split("/").pop()!, { type });
  Object.defineProperty(file, "webkitRelativePath", { value: path });
  return file;
}

vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: { uid: "owner" } }) }));
vi.mock("@/providers/GoogleMapsProvider", () => ({ useGoogleMapsDemand: () => undefined }));
const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
const createClientFromFolder = vi.fn();
vi.mock("../utils/folderAutoCreate", async (original) => ({ ...(await original<typeof import("../utils/folderAutoCreate")>()), createClientFromFolder: (...args: unknown[]) => createClientFromFolder(...args) }));
const notifyClientImportReview = vi.fn().mockResolvedValue({ notified: true, count: 1 });
vi.mock("@/lib/api/client-import-review", () => ({ notifyClientImportReview: (...args: unknown[]) => notifyClientImportReview(...args) }));
vi.mock("@/lib/api/services", () => ({ listServices: vi.fn().mockResolvedValue([]) }));

// setupTests mocks useNavigate; search params come from the real router.
const navigate = vi.fn();
beforeEach(() => vi.mocked(useNavigate).mockReturnValue(navigate));

function Location() {
  const [params] = useSearchParams();
  return <p data-testid="location">{params.toString()}</p>;
}

function renderDialog(initial = "/agency/clients", props: Partial<React.ComponentProps<typeof FolderImportDialog>> = {}) {
  return render(<MemoryRouter initialEntries={[initial]}>
    <RouterRoutes><Route path="*" element={<><FolderImportDialog mode="ddd" existingClientNames={["Jane Doe"]} {...props} /><Location /></>} /></RouterRoutes>
  </MemoryRouter>);
}

afterEach(() => folderImportSession.clear());

test("lists one client per subfolder and leaves a likely duplicate out of Create", () => {
  renderDialog();
  fireEvent.click(screen.getByRole("button", { name: "Import from folder" }));
  const input = screen.getByLabelText("Choose folder") as HTMLInputElement;
  expect(input).toHaveAttribute("webkitdirectory");
  fireEvent.change(input, { target: { files: [fileAt("Intake/Jane Doe/ISP.pdf"), fileAt("Intake/Sam Lee/ISP.pdf"), fileAt("Intake/Sam Lee/readme.txt", "text/plain")] } });
  const list = screen.getByRole("list", { name: "Clients found in the folder" });
  expect(within(list).getByText("Jane Doe")).toBeInTheDocument();
  expect(within(list).getByText(/already exists/)).toBeInTheDocument();
  expect(within(list).getByText(/1 skipped/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create 1 client" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Create Jane Doe" })).toBeInTheDocument();
});

test("creates clients without the form, notifies once, and links to the review list", async () => {
  const onClientsCreated = vi.fn();
  createClientFromFolder.mockImplementation(async (client: { name: string }) => client.name === "Ann Bell"
    ? { clientId: "ann-1", name: "Ann Bell", notes: ["Medicaid ID was not found in the documents."] }
    : Promise.reject(new (await import("../utils/folderAutoCreate")).FolderCreateError("ISP.pdf: could not be read")));
  renderDialog("/agency/clients", { onClientsCreated });
  fireEvent.click(screen.getByRole("button", { name: "Import from folder" }));
  fireEvent.change(screen.getByLabelText("Choose folder"), { target: { files: [fileAt("Intake/Ann Bell/ISP.pdf"), fileAt("Intake/Sam Lee/ISP.pdf")] } });
  fireEvent.click(screen.getByRole("button", { name: "Create 2 clients" }));
  await waitFor(() => expect(screen.getByText("1 client was created, 1 could not be.")).toBeInTheDocument());
  expect(createClientFromFolder).toHaveBeenCalledWith(expect.objectContaining({ name: "Ann Bell" }), "ddd", expect.objectContaining({ folderName: "Intake" }));
  expect(screen.getByRole("link", { name: "Open client" })).toHaveAttribute("href", "/agency/clients/ann-1");
  expect(screen.getByRole("link", { name: "Review new clients" })).toHaveAttribute("href", "/agency/clients?importReview=1");
  expect(screen.getByText("1 thing to check")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("ISP.pdf: could not be read");
  expect(screen.getByRole("button", { name: "Set up Sam Lee in the form" })).toBeInTheDocument();
  expect(notifyClientImportReview).toHaveBeenCalledWith(["ann-1"], "Intake");
  expect(onClientsCreated).toHaveBeenCalledTimes(1);
  expect(folderImportSession.get("owner")?.created).toEqual({ "client-0": "ann-1" });
  fireEvent.click(screen.getByRole("button", { name: "Set up Sam Lee in the form" }));
  expect(navigate).toHaveBeenCalledWith("/agency/clients/add?folderImport=client-1");
});

test("resuming shows created clients with a link and clears the resume flag", () => {
  renderDialog();
  fireEvent.click(screen.getByRole("button", { name: "Import from folder" }));
  fireEvent.change(screen.getByLabelText("Choose folder"), { target: { files: [fileAt("Intake/Jane Doe/ISP.pdf")] } });
  folderImportSession.markCreated("client-0", "abc123");
  screen.getByRole("dialog");
  renderDialog("/agency/clients?folderImport=resume");
  expect(screen.getAllByText("Created").length).toBeGreaterThan(0);
  expect(screen.getAllByRole("link", { name: "Open client" })[0]).toHaveAttribute("href", "/agency/clients/abc123");
  expect(screen.getAllByTestId("location").at(-1)).toBeEmptyDOMElement();
});

test("lets the user pick DDD or HHA when no program view is selected", () => {
  renderDialog("/agency/clients", { mode: null, allowedModes: ["ddd", "hha"] });
  fireEvent.click(screen.getByRole("button", { name: "Import from folder" }));
  fireEvent.click(screen.getByRole("radio", { name: "HHA" }));
  fireEvent.change(screen.getByLabelText("Choose folder"), { target: { files: [fileAt("Intake/Ann/plan of care.pdf")] } });
  expect(folderImportSession.get("owner")?.mode).toBe("hha");
  expect(screen.getByText("Read for details · Plan of Care (POC)")).toBeInTheDocument();
});

test("explains when the folder has no supported files", () => {
  renderDialog();
  fireEvent.click(screen.getByRole("button", { name: "Import from folder" }));
  fireEvent.change(screen.getByLabelText("Choose folder"), { target: { files: [fileAt("Intake/Ann/notes.txt", "text/plain")] } });
  expect(screen.getByRole("alert")).toHaveTextContent("No PDF, JPEG, PNG, or WebP files");
});
