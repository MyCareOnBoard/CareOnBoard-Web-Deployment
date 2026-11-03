import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

const listAssignableClients = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/staff-client-assignment", () => ({ listAssignableClients }));
import ClientAssignmentDrawer from "./ClientAssignmentDrawer";

it("searches clients and saves the selected IDs with the original selection", async () => {
  listAssignableClients.mockResolvedValue([
    { id: "c-a", name: "Ada Client", mode: "ddd", status: "active" },
    { id: "c-b", name: "Ben Client", mode: "hha", status: "pending" },
  ]);
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<ClientAssignmentDrawer staffName="Morgan" agencyId="agency-a" modes={["ddd", "hha"]} assignedIds={["c-a"]} canAssign onClose={onClose} onSave={onSave} />);
  expect(await screen.findByRole("checkbox", { name: /Ada Client/ })).toBeChecked();
  expect(listAssignableClients).toHaveBeenCalledWith(expect.objectContaining({ modes: ["ddd", "hha"], agencyId: "agency-a", asPlatformAdmin: false }));
  await user.type(screen.getByLabelText("Search clients"), "ben");
  expect(screen.queryByRole("checkbox", { name: /Ada Client/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole("checkbox", { name: /Ben Client/ }));
  await user.click(screen.getByRole("button", { name: "Save assignments" }));
  expect(onSave).toHaveBeenCalledWith(["c-a", "c-b"], ["c-a"]);
  expect(onClose).toHaveBeenCalledOnce();
});

it("keeps saving off when the client list fails to load", async () => {
  listAssignableClients.mockRejectedValue(new Error("down"));
  render(<ClientAssignmentDrawer staffName="Morgan" agencyId="agency-a" modes={["ddd"]} assignedIds={["c-a"]} canAssign onClose={vi.fn()} onSave={vi.fn()} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load clients");
  expect(screen.getByRole("button", { name: "Save assignments" })).toBeDisabled();
});
