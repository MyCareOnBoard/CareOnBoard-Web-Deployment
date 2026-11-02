import { fireEvent, render, screen, within } from "@testing-library/react";
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

test("lists one client per subfolder, flags a likely duplicate, and opens the wizard for a client", () => {
  renderDialog();
  fireEvent.click(screen.getByRole("button", { name: "Import from folder" }));
  const input = screen.getByLabelText("Choose folder") as HTMLInputElement;
  expect(input).toHaveAttribute("webkitdirectory");
  fireEvent.change(input, { target: { files: [fileAt("Intake/Jane Doe/ISP.pdf"), fileAt("Intake/Sam Lee/ISP.pdf"), fileAt("Intake/Sam Lee/readme.txt", "text/plain")] } });
  const list = screen.getByRole("list", { name: "Clients found in the folder" });
  expect(within(list).getByText("Jane Doe")).toBeInTheDocument();
  expect(within(list).getByText(/already exists/)).toBeInTheDocument();
  expect(within(list).getByText(/1 skipped/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Set up Sam Lee" }));
  expect(navigate).toHaveBeenCalledWith("/agency/clients/add?folderImport=client-1");
});

test("resuming shows saved clients with a link and clears the resume flag", () => {
  renderDialog();
  fireEvent.click(screen.getByRole("button", { name: "Import from folder" }));
  fireEvent.change(screen.getByLabelText("Choose folder"), { target: { files: [fileAt("Intake/Jane Doe/ISP.pdf")] } });
  folderImportSession.markCreated("client-0", "abc123");
  screen.getByRole("dialog");
  renderDialog("/agency/clients?folderImport=resume");
  expect(screen.getAllByText("Saved").length).toBeGreaterThan(0);
  expect(screen.getAllByRole("link", { name: "Open client" })[0]).toHaveAttribute("href", "/agency/clients/abc123");
  expect(screen.getAllByTestId("location").at(-1)).toBeEmptyDOMElement();
});

test("lets the user pick DDD or HHA when no program view is selected", () => {
  renderDialog("/agency/clients", { mode: null, allowedModes: ["ddd", "hha"] });
  fireEvent.click(screen.getByRole("button", { name: "Import from folder" }));
  fireEvent.click(screen.getByRole("radio", { name: "HHA" }));
  fireEvent.change(screen.getByLabelText("Choose folder"), { target: { files: [fileAt("Intake/Ann/plan of care.pdf")] } });
  expect(folderImportSession.get("owner")?.mode).toBe("hha");
  expect(screen.getByText("Read for autofill · Plan of Care (POC)")).toBeInTheDocument();
});

test("explains when the folder has no supported files", () => {
  renderDialog();
  fireEvent.click(screen.getByRole("button", { name: "Import from folder" }));
  fireEvent.change(screen.getByLabelText("Choose folder"), { target: { files: [fileAt("Intake/Ann/notes.txt", "text/plain")] } });
  expect(screen.getByRole("alert")).toHaveTextContent("No PDF, JPEG, PNG, or WebP files");
});
