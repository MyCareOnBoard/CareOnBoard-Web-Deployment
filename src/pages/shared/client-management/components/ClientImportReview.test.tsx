import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import { ClientImportReviewBanner, ClientImportReviewNotice } from "./ClientImportReview";

const api = vi.hoisted(() => ({ listClientImportReviews: vi.fn(), completeClientImportReview: vi.fn() }));
vi.mock("@/lib/api/client-import-review", () => api);
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const row = (id: string, extra = {}) => ({ id, name: `Client ${id}`, type: "ddd", servicePrograms: ["ddd"], status: "pending", folderName: "Intake", notes: ["Medicaid ID was not found in the documents."], importedAt: null, ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  api.listClientImportReviews.mockResolvedValue({ clients: [row("a"), row("b", { servicePrograms: ["sc"] })], truncated: false });
  api.completeClientImportReview.mockResolvedValue(undefined);
});

test("opens from the notification link, lists this program's clients with links, and marks one reviewed", async () => {
  render(<MemoryRouter initialEntries={["/agency/clients?importReview=1"]}><ClientImportReviewBanner program="ddd" /></MemoryRouter>);
  expect(await screen.findByText("1 client from a folder upload needs review")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Client a" })).toHaveAttribute("href", "/agency/clients/a");
  expect(screen.queryByText("Client b")).not.toBeInTheDocument();
  expect(screen.queryByText("Medicaid ID was not found in the documents.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show what to check for Client a" }));
  expect(screen.getByText("Medicaid ID was not found in the documents.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Mark Client a as reviewed" }));
  await waitFor(() => expect(screen.queryByText(/needs review/)).not.toBeInTheDocument());
  expect(api.completeClientImportReview).toHaveBeenCalledWith("a");
});

test("a big batch is paged and searchable instead of one long list", async () => {
  api.listClientImportReviews.mockResolvedValue({ clients: Array.from({ length: 20 }, (_, i) => row(`c${i}`)), truncated: true });
  render(<MemoryRouter initialEntries={["/agency/clients?importReview=1"]}><ClientImportReviewBanner program="ddd" /></MemoryRouter>);
  expect(await screen.findByText("20+ clients from a folder upload need review")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /^Mark .* as reviewed$/ })).toHaveLength(8);
  expect(screen.getByText("1–8 of 20")).toBeInTheDocument();
  expect(screen.getByText(/Showing the first 100/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByText("9–16 of 20")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Client c8" })).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("Search by name or folder"), { target: { value: "c19" } });
  expect(screen.getAllByRole("button", { name: /^Mark .* as reviewed$/ })).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("Search by name or folder"), { target: { value: "zzz" } });
  expect(screen.getByText(/No imported clients match/)).toBeInTheDocument();
});

test("stays hidden when nothing needs review", async () => {
  api.listClientImportReviews.mockResolvedValue({ clients: [], truncated: false });
  const { container } = render(<MemoryRouter><ClientImportReviewBanner program="ddd" /></MemoryRouter>);
  await waitFor(() => expect(api.listClientImportReviews).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});

test("client notice shows the notes until the client is marked reviewed", async () => {
  render(<ClientImportReviewNotice client={{ id: "a", importReview: { source: "folder_upload", status: "needs_review", folderName: "Intake", notes: ["Check the DOB."] } }} />);
  expect(screen.getByText("Created from a folder upload (Intake)")).toBeInTheDocument();
  expect(screen.getByText("Check the DOB.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Mark reviewed" }));
  await waitFor(() => expect(screen.queryByText("Check the DOB.")).not.toBeInTheDocument());
});
