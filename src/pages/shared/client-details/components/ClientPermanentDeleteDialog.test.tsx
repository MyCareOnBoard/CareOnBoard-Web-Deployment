import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { ClientPermanentDeleteDialog } from "./ClientPermanentDeleteDialog";

const api = vi.hoisted(() => ({ getClientDeletionImpact: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/api/clients", () => ({
  getClientDeletionImpact: api.getClientDeletionImpact,
  useDeleteClientMutation: () => [(args: unknown) => ({ unwrap: () => api.remove(args) })],
}));

beforeEach(() => {
  vi.clearAllMocks();
  api.remove.mockResolvedValue({ success: true, message: "Client permanently deleted" });
});

function renderDialog(onDeleted = vi.fn()) {
  render(<ClientPermanentDeleteDialog open onOpenChange={vi.fn()} clientId="c1" agencyId="a" clientName="Jane Doe" onDeleted={onDeleted} />);
  return onDeleted;
}

test("warns about shifts and claims and deletes only after the name is typed", async () => {
  api.getClientDeletionImpact.mockResolvedValue({ hasShifts: true, hasClaims: true });
  const user = userEvent.setup();
  const onDeleted = renderDialog();
  expect(await screen.findByText(/has shifts and billing claims/)).toBeInTheDocument();
  const button = screen.getByRole("button", { name: "Delete permanently" });
  expect(button).toBeDisabled();
  await user.type(screen.getByLabelText(/to confirm/), "jane  doe");
  expect(button).toBeEnabled();
  await user.click(button);
  await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  expect(api.remove).toHaveBeenCalledWith({ clientId: "c1", agencyId: "a", permanent: true });
});

test("still allows deleting when the history check fails, with a warning", async () => {
  api.getClientDeletionImpact.mockRejectedValue(new Error("down"));
  const user = userEvent.setup();
  renderDialog();
  expect(await screen.findByText(/Shifts and billing claims could not be checked/)).toBeInTheDocument();
  await user.type(screen.getByLabelText(/to confirm/), "Jane Doe");
  expect(screen.getByRole("button", { name: "Delete permanently" })).toBeEnabled();
});

test("shows an error and stays open when the delete fails", async () => {
  api.getClientDeletionImpact.mockResolvedValue({ hasShifts: false, hasClaims: false });
  api.remove.mockRejectedValue(new Error("boom"));
  const user = userEvent.setup();
  const onDeleted = renderDialog();
  await waitFor(() => expect(api.getClientDeletionImpact).toHaveBeenCalled());
  expect(screen.queryByText(/will no longer link/)).not.toBeInTheDocument();
  await user.type(screen.getByLabelText(/to confirm/), "Jane Doe");
  await user.click(screen.getByRole("button", { name: "Delete permanently" }));
  expect(await screen.findByText(/could not be deleted/)).toBeInTheDocument();
  expect(onDeleted).not.toHaveBeenCalled();
});
